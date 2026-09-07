import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Card, Badge, Spinner } from '../components/ui'
import type { AIResponse } from '../types'

export default function CodingInterview() {
  const resumes = useAppStore((s) => s.resumes)
  const [code, setCode] = useState('')
  const [problem, setProblem] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiResponse, setAiResponse] = useState<Partial<AIResponse> & {
    approach?: string
    complexity?: string
    edgeCases?: string[]
  } | null>(null)
  const [error, setError] = useState('')

  const resume = resumes[0]

  const analyze = async () => {
    if (!code.trim()) return
    setIsAnalyzing(true)
    setError('')
    setAiResponse(null)
    try {
      const question = `Explain the following code solution. ${problem ? `Problem: ${problem}` : ''}\n\nCODE:\n${code}`
      const cls = await window.parakeet.classifyQuestion('Explain this coding solution and its approach')
      const result = await window.parakeet.generateAnswer({
        question: `${question}\n\nProvide: 1) The approach 2) Time and space complexity 3) Edge cases 4) Possible improvements`,
        questionType: cls.type,
        context: {
          resumeText: resume?.rawText,
          jobDescription: undefined,
          previousAnswers: []
        }
      })
      setAiResponse(result)
    } catch (err) {
      console.error('Code analysis failed:', err)
      setError('Analysis failed. Check your API keys in Settings.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const sampleCode = `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}`

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">💻 Coding Interview Practice</h1>
      <p className="text-slate-400 mb-8">
        Paste a solution and get a practice explanation you can deliver verbally - approach, complexity, edge cases.
      </p>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Code</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setCode(sampleCode)}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              Load sample
            </button>
            <button onClick={() => setCode('')} className="text-xs text-slate-500 hover:text-slate-300">
              Clear
            </button>
          </div>
        </div>
        <div>
          <label className="label">Problem statement (optional)</label>
          <input
            className="input mb-3"
            placeholder="e.g. Given an array of integers, return indices of the two numbers that add up to a target."
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
          />
        </div>
        <textarea
          className="input font-mono min-h-[260px] resize-y text-sm leading-relaxed"
          placeholder="// Paste your code here..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button onClick={analyze} disabled={!code.trim() || isAnalyzing} className="btn-primary mt-4">
          {isAnalyzing ? 'Analyzing...' : 'Generate Practice Explanation'}
        </button>
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      </Card>

      {isAnalyzing ? (
        <Card>
          <Spinner label="Analyzing your solution..." />
        </Card>
      ) : aiResponse ? (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-white">Practice Explanation</h3>
            <Badge color="blue">For speaking aloud</Badge>
          </div>

          <div className="space-y-5">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-2">🎯 Approach</div>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{aiResponse.answer}</p>
            </div>

            {aiResponse.keyPoints?.length ? (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase mb-2">⚡ Complexity</div>
                <div className="flex flex-wrap gap-2">
                  {aiResponse.keyPoints.map((pt: string, i: number) => (
                    <span key={i} className="badge bg-slate-800 text-slate-300 border border-slate-700">
                      {pt}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {aiResponse.followUp?.length ? (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase mb-2">🧪 Edge Cases to Mention</div>
                <ul className="space-y-1.5">
                  {aiResponse.followUp.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-2">
                      <span className="text-brand-400 shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {typeof aiResponse.confidence === 'number' && aiResponse.confidence > 0 ? (
              <div className="text-xs text-slate-500">
                Confidence: {Math.round(aiResponse.confidence * 100)}%
              </div>
            ) : null}

            <div className="flex gap-2 pt-3 border-t border-slate-800">
              <button onClick={analyze} className="btn-secondary text-sm">
                🔄 Regenerate
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(aiResponse.answer || '')}
                className="btn-secondary text-sm ml-auto"
              >
                📋 Copy
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Tips</h3>
        <Card className="space-y-3 p-5 text-sm text-slate-300">
          <p>1. Speak out loud as you explain - it builds the muscle memory for real interviews.</p>
          <p>2. Always state the brute-force approach first, then optimize.</p>
          <p>3. Mention edge cases even when they don't apply - interviewers notice.</p>
          <p>4. Practice the explain-out-loud flow: Approach → Code → Complexity → Edge cases → Trade-offs.</p>
        </Card>
      </div>
    </div>
  )
}