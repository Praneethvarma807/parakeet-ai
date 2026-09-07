import { useEffect, useRef, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import './popup.css'

type Mode = 'full' | 'compact'

function Popup() {
  const [mode, setMode] = useState<Mode>('full')
  const [listening, setListening] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [lastFinal, setLastFinal] = useState('')
  const [interim, setInterim] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const transcript = transcribing && interim ? interim : lastFinal || interim

  useEffect(() => {
    window.parakeetPopup.getMode().then((m) => setMode((m as Mode) || 'full'))
  }, [])

  useEffect(() => {
    const offT = window.parakeetPopup.onTranscript((data) => {
      if (data.clear) {
        setLastFinal('')
        setInterim('')
        return
      }
      if (!data.text) return
      if (data.isFinal) {
        setLastFinal(data.text)
        setInterim('')
      } else {
        setInterim(data.text)
      }
    })
    const offS = window.parakeetPopup.onState((data) => {
      if (typeof data.listening === 'boolean') setListening(data.listening)
      if (typeof data.transcribing === 'boolean') setTranscribing(data.transcribing)
      if (data.listening === false) {
        setTranscribing(false)
        setInterim('')
      }
    })
    return () => {
      offT()
      offS()
    }
  }, [])

  const emitSize = useCallback(() => {
    const el = rootRef.current
    if (!el) return
    const h = Math.ceil(el.scrollHeight)
    const w = mode === 'compact' ? 180 : 360
    window.parakeetPopup.resize(w, mode === 'compact' ? 56 : Math.min(240, Math.max(74, h)))
  }, [mode])

  useEffect(() => {
    emitSize()
  }, [emitSize, mode, listening, transcript])

  const toggleMode = () => {
    const next = mode === 'full' ? 'compact' : 'full'
    setMode(next)
    window.parakeetPopup.setMode(next)
  }

  const toggleListening = () => {
    window.parakeetPopup.toggleListening()
  }

  const statusColor = listening ? (transcribing ? '#a78bfa' : '#10b981') : '#475569'

  return (
    <div
      ref={rootRef}
      className={`popup-shell ${mode === 'compact' ? 'compact' : ''}`}
      style={{ borderColor: statusColor }}
    >
      {mode === 'full' ? (
        <>
          <div className="popup-header" onDoubleClick={toggleMode}>
            <span className="status-dot" style={{ backgroundColor: statusColor }} />
            <span className="status-text">
              {listening ? (transcribing ? 'Transcribing…' : 'Listening') : 'Idle'}
            </span>
            <div className="header-actions no-drag">
              <button className="icon-btn" title="Minimize" onClick={toggleMode}>
                —
              </button>
              <button className="icon-btn" title="Hide" onClick={() => window.parakeetPopup.hide()}>
                ✕
              </button>
            </div>
          </div>
          <div className="popup-body">
            {listening ? (
              <p className={`transcript ${transcribing ? 'transcribing' : ''}`}>
                {transcript || 'Listening…'}
              </p>
            ) : (
              <p className="transcript muted">{transcript || 'Press Ctrl+Shift+Space to start listening'}</p>
            )}
          </div>
          <div className="no-drag">
            <button className="stop-btn" onClick={toggleListening}>
              {listening ? '■ Stop' : '▶ Listen'}
            </button>
            <span className="shortcut-hint no-drag">Ctrl+Shift+Space</span>
          </div>
        </>
      ) : (
        <button className="compact-btn no-drag" onClick={toggleMode} title="Expand">
          <span className="status-dot" style={{ backgroundColor: statusColor }} />
          <span className="compact-text">{listening ? (transcribing ? '…' : '●') : '○'}</span>
        </button>
      )}
    </div>
  )
}

createRoot(document.getElementById('popup-root')!).render(<Popup />)