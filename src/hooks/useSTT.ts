import { useRef, useCallback, useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

interface UseSTTHook {
  isListening: boolean
  isSupported: boolean
  error: string | null
  startListening: () => Promise<void>
  stopListening: () => void
  onTranscript: (callback: (text: string) => void) => void
  interimTranscript: string
}

const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen'

function popupState(state: { listening?: boolean; transcribing?: boolean }): void {
  window.parakeet?.setPopupState(state)
}

function popupTranscript(text: string, isFinal: boolean): void {
  window.parakeet?.sendTranscriptToPopup({ text, isFinal })
}

export function useSTT(): UseSTTHook {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [interimTranscript, setInterimTranscript] = useState('')
  const settings = useAppStore((s) => s.settings)

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const onTranscriptRef = useRef<(text: string) => void>(() => {})
  const recorderRef = useRef<MediaRecorder | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const hasRecorder = typeof MediaRecorder !== 'undefined'
    const hasMic = !!navigator.mediaDevices?.getUserMedia
    setIsSupported(hasRecorder && hasMic)

    return () => {
      cleanupRef.current?.()
    }
  }, [])

  const stopListening = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
      recorderRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
    setIsListening(false)
    popupState({ listening: false, transcribing: false })
  }, [])

  const startListening = useCallback(async () => {
    setError(null)
    setInterimTranscript('')
    const apiKey = settings?.deepgramApiKey || ''

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000
        }
      })
      mediaStreamRef.current = stream

      if (apiKey && settings?.sttProvider === 'deepgram') {
        const lang = settings.defaultLanguage || 'en'
        const ws = new WebSocket(
          `${DEEPGRAM_WS_URL}?model=nova-2&smart_format=true&interim_results=true&language=${lang}&encoding=linear16&sample_rate=16000&channels=1`,
          ['token', apiKey]
        )
        wsRef.current = ws
        ws.binaryType = 'arraybuffer'

        ws.onopen = () => {
          setIsListening(true)
          popupState({ listening: true })
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'Results') {
              const transcript = data.channel?.alternatives?.[0]?.transcript || ''
              if (data.is_final && transcript) {
                popupTranscript(transcript, true)
                onTranscriptRef.current(transcript)
                setInterimTranscript('')
                popupState({ transcribing: false })
              } else if (!data.is_final) {
                setInterimTranscript(transcript)
                if (transcript) popupState({ transcribing: true })
              }
            }
          } catch (err) {
            console.error('Deepgram parse error:', err)
          }
        }

        ws.onerror = () => {
          setError('Deepgram connection failed. Check your API key in Settings.')
          setIsListening(false)
          popupState({ listening: false, transcribing: false })
        }

        ws.onclose = () => {
          setIsListening(false)
          popupState({ listening: false, transcribing: false })
        }

        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
          sampleRate: 16000
        })
        const source = audioCtx.createMediaStreamSource(stream)
        const processor = audioCtx.createScriptProcessor(4096, 1, 1)

        processor.onaudioprocess = (event) => {
          if (ws.readyState === WebSocket.OPEN) {
            const input = event.inputBuffer.getChannelData(0)
            const int16 = new Int16Array(input.length)
            for (let i = 0; i < input.length; i++) {
              const s = Math.max(-1, Math.min(1, input[i]))
              int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
            }
            ws.send(int16.buffer)
          }
        }

        source.connect(processor)
        processor.connect(audioCtx.destination)

        cleanupRef.current = () => {
          try {
            processor.disconnect()
            source.disconnect()
          } catch {}
          audioCtx.close().catch(() => {})
        }
      } else {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
        const recorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 32000
        })
        recorderRef.current = recorder
        const chunks: Blob[] = []

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data)
        }

        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: mimeType })
          if (apiKey) {
            try {
              const res = await fetch(
                'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=' + (settings?.defaultLanguage || 'en'),
                {
                  method: 'POST',
                  headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/octet-stream' },
                  body: blob
                }
              )
              const json = await res.json()
              const transcript = json.results?.channels?.[0]?.alternatives?.[0]?.transcript as string | undefined
              if (transcript) {
                popupTranscript(transcript, true)
                onTranscriptRef.current(transcript)
                setInterimTranscript('')
                popupState({ transcribing: false })
              }
            } catch (err) {
              console.error('Deepgram REST transcription error:', err)
              setError('Transcription request failed')
            }
          } else {
            setError('Speech-to-text requires a Deepgram API key. Add it in Settings.')
          }
        }

        recorder.start(3000)
        setIsListening(true)
        popupState({ listening: true })
      }
    } catch (err) {
      console.error('Microphone access error:', err)
      setError('Microphone access denied. Please allow microphone permissions.')
      setIsListening(false)
      popupState({ listening: false, transcribing: false })
    }
  }, [settings])

  const onTranscript = useCallback((callback: (text: string) => void) => {
    onTranscriptRef.current = callback
  }, [])

  return { isListening, isSupported, error, startListening, stopListening, onTranscript, interimTranscript }
}