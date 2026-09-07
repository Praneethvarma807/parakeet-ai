import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Card } from '../components/ui'

export default function Settings() {
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)

  const [anthropicKey, setAnthropicKey] = useState(settings?.anthropicApiKey || '')
  const [openaiKey, setOpenaiKey] = useState(settings?.openaiApiKey || '')
  const [deepgramKey, setDeepgramKey] = useState(settings?.deepgramApiKey || '')
  const [aiProvider, setAiProvider] = useState(settings?.aiProvider || 'both')
  const [sttProvider, setSttProvider] = useState(settings?.sttProvider || 'browser')
  const [language, setLanguage] = useState(settings?.defaultLanguage || 'en')
  const [answerStyle, setAnswerStyle] = useState(settings?.defaultAnswerStyle || 'natural')
  const [saved, setSaved] = useState(false)
  const [showKeys, setShowKeys] = useState(false)

  const handleSave = async () => {
    const updated = {
      theme: settings?.theme || 'dark',
      aiProvider,
      anthropicApiKey: anthropicKey.trim(),
      openaiApiKey: openaiKey.trim(),
      deepgramApiKey: deepgramKey.trim(),
      sttProvider,
      defaultLanguage: language,
      defaultAnswerStyle: answerStyle
    }
    setSettings(updated)
    await window.parakeet.saveSettings(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
      <p className="text-slate-400 mb-8">Configure your API providers and preferences</p>

      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">🔑 API Keys</h3>
            <button
              onClick={() => setShowKeys(!showKeys)}
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              {showKeys ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Keys are stored locally on your device and never leave this machine.
          </p>

          <div className="space-y-4">
            <div>
              <label className="label">Anthropic API Key (Claude)</label>
              <input
                type={showKeys ? 'text' : 'password'}
                className="input font-mono"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
              />
            </div>
            <div>
              <label className="label">OpenAI API Key</label>
              <input
                type={showKeys ? 'text' : 'password'}
                className="input font-mono"
                placeholder="sk-proj-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Deepgram API Key (Speech-to-Text)</label>
              <input
                type={showKeys ? 'text' : 'password'}
                className="input font-mono"
                placeholder="deepgram-..."
                value={deepgramKey}
                onChange={(e) => setDeepgramKey(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-white mb-4">🤖 AI Provider</h3>
          <div className="flex gap-3">
            {(['anthropic', 'openai', 'both'] as const).map((provider) => (
              <button
                key={provider}
                onClick={() => setAiProvider(provider)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
                  aiProvider === provider
                    ? 'bg-brand-600/20 border-brand-600/50 text-brand-300'
                    : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {provider}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            'both' uses Anthropic first, falling back to OpenAI if it fails.
          </p>
        </Card>

        <Card>
          <h3 className="font-semibold text-white mb-4">🎙 Speech-to-Text</h3>
          <div className="flex gap-3 mb-4">
            {(['deepgram', 'browser'] as const).map((provider) => (
              <button
                key={provider}
                onClick={() => setSttProvider(provider)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
                  sttProvider === provider
                    ? 'bg-brand-600/20 border-brand-600/50 text-brand-300'
                    : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {provider === 'deepgram' ? 'Deepgram (accurate)' : 'Browser (default)'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Deepgram streams audio to the cloud via WebSocket for near-real-time transcription. Browser uses your
            system's default engine.
          </p>
        </Card>

        <Card>
          <h3 className="font-semibold text-white mb-4">🌐 Preferences</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Default Language</label>
              <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {['en', 'hi', 'es', 'fr', 'de', 'ta', 'te', 'ja', 'ko'].map((lang) => (
                  <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Default Answer Style</label>
              <select className="input" value={answerStyle} onChange={(e) => setAnswerStyle(e.target.value as 'concise' | 'natural' | 'detailed')}>
                <option value="concise">Concise</option>
                <option value="natural">Natural</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-4">
          <button onClick={handleSave} className="btn-primary px-8">
            Save Settings
          </button>
          {saved && <span className="text-emerald-400 text-sm">✓ Saved</span>}
        </div>
      </div>
    </div>
  )
}