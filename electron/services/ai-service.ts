import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { ElectronStore } from '../store'
import type { AIResponse, QuestionClassification } from '../../src/types'

interface GenerateAnswerPayload {
  question: string
  questionType: string
  context: {
    resumeText?: string
    jobDescription?: string
    previousAnswers?: string[]
  }
}

const SYSTEM_PROMPT = `You are an interview preparation assistant.

OBJECTIVE:
Help the candidate formulate an accurate, natural answer that they can speak aloud during a real interview.

RULES:
1. Use the candidate's resume as the primary source for personal experience.
2. NEVER invent employers, projects, technologies, or achievements not in the resume.
3. Match the requested job and seniority.
4. Keep the answer conversational and easy to speak naturally.
5. For behavioral questions, use STAR when appropriate.
6. For technical questions, explain the reasoning clearly.
7. If the resume lacks relevant experience, say so honestly and provide a framework the candidate can adapt.
8. Output JSON only with the following structure:
{
  "answer": "...",
  "key_points": ["..."],
  "follow_up": ["..."],
  "confidence": 0.0
}`

const CLASSIFICATION_PROMPT = `You are a question classifier for interview preparation. Given an interview question, classify it.

INPUT:
"<question>"

OUTPUT (JSON only):
{
  "type": "technical | behavioral | hr | system-design | coding | project-based",
  "topic": "short topic label",
  "difficulty": "easy | medium | hard",
  "requiresResumeContext": true/false,
  "recommendedFramework": "STAR | nothing | first-principles"
}`

export class AIService {
  private store: ElectronStore
  private anthropic: Anthropic | null = null
  private openai: OpenAI | null = null

  constructor(store: ElectronStore) {
    this.store = store
    this.initClients()
  }

  private initClients(): void {
    const settings = this.store.getSettings()
    if (settings.anthropicApiKey) {
      this.anthropic = new Anthropic({ apiKey: settings.anthropicApiKey })
    }
    if (settings.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: settings.openaiApiKey })
    }
  }

  private refreshClients(): void {
    this.anthropic = null
    this.openai = null
    this.initClients()
  }

  async generateAnswer(payload: GenerateAnswerPayload): Promise<AIResponse> {
    this.refreshClients()
    const settings = this.store.getSettings()
    const useAnthropic = this.anthropic !== null && settings.aiProvider !== 'openai'
    const useOpenAI = this.openai !== null && settings.aiProvider !== 'anthropic'

    const resumeText = payload.context.resumeText
      ? `RESUME:\n${payload.context.resumeText}`
      : 'RESUME: No resume available - answer with generic best practices only, never invent experience.'
    const jd = payload.context.jobDescription
      ? `JOB DESCRIPTION:\n${payload.context.jobDescription}`
      : 'JOB DESCRIPTION: Not provided'
    const prev = payload.context.previousAnswers?.length
      ? `PREVIOUS ANSWERS:\n${payload.context.previousAnswers.join('\n')}`
      : 'PREVIOUS ANSWERS: None yet'

    const userMessage = `${resumeText}\n\n${jd}\n\n${prev}\n\nQUESTION:\n${payload.question}\n\nQUESTION TYPE:\n${payload.questionType}`

    if (useAnthropic) {
      try {
        return await this.generateWithAnthropic(userMessage)
      } catch (err) {
        console.error('Anthropic failed:', err)
        if (!useOpenAI) throw err
      }
    }
    if (useOpenAI) {
      return await this.generateWithOpenAI(userMessage)
    }
    throw new Error('No AI provider configured. Add an API key in Settings.')
  }

  private async generateWithAnthropic(userMessage: string): Promise<AIResponse> {
    if (!this.anthropic) throw new Error('Anthropic not initialized')
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    })

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
    return this.parseAIResponse(text)
  }

  private async generateWithOpenAI(userMessage: string): Promise<AIResponse> {
    if (!this.openai) throw new Error('OpenAI not initialized')
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ]
    })

    const text = response.choices[0]?.message?.content || ''
    return this.parseAIResponse(text)
  }

  private parseAIResponse(text: string): AIResponse {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      const parsed = JSON.parse(jsonMatch[0])
      return {
        answer: parsed.answer || '',
        keyPoints: parsed.key_points || [],
        followUp: parsed.follow_up || [],
        confidence: parsed.confidence ?? 0.7
      }
    } catch {
      return {
        answer: text,
        keyPoints: [],
        followUp: [],
        confidence: 0.5
      }
    }
  }

  async classifyQuestion(question: string): Promise<QuestionClassification> {
    this.refreshClients()
    const settings = this.store.getSettings()
    const useAnthropic = this.anthropic !== null && settings.aiProvider !== 'openai'
    const useOpenAI = this.openai !== null && settings.aiProvider !== 'anthropic'

    const prompt = CLASSIFICATION_PROMPT.replace('<question>', question)

    let text = ''

    if (useAnthropic && this.anthropic) {
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }]
        })
        text = response.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('')
      } catch (err) {
        console.error('Anthropic classify failed:', err)
        if (!useOpenAI) return this.defaultClassification(question)
      }
    }

    if (!text && useOpenAI && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
      text = response.choices[0]?.message?.content || ''
    }

    if (!text) return this.defaultClassification(question)

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      return JSON.parse(jsonMatch[0])
    } catch {
      return this.defaultClassification(question)
    }
  }

  private defaultClassification(question: string): QuestionClassification {
    const q = question.toLowerCase()
    let type: QuestionClassification['type'] = 'behavioral'
    let topic = 'general'
    let difficulty: QuestionClassification['difficulty'] = 'medium'

    if (/(code|coding|algorithm|leetcode|complexity|pseudocode|function|implement)/.test(q)) {
      type = 'coding'
      topic = 'coding'
    } else if (/system design|architecture|scale|distributed|database design/.test(q)) {
      type = 'system-design'
      topic = 'system design'
    } else if (/(why do you want to work|strengths|weaknesses|tell me about yourself|salary|availability)/.test(q)) {
      type = 'hr'
      topic = 'hr'
    } else if (/(project|portfolio|built|created|developed)/.test(q)) {
      type = 'project-based'
      topic = 'projects'
    } else if (/(react|typescript|javascript|api|python|java|c\+\+|sql|cloud|aws|testing)/.test(q)) {
      type = 'technical'
      topic = 'technical'
    }

    if (/(explain|how|why|what is|describe|walk me through)/.test(q)) {
      difficulty = 'medium'
    }
    if (/(design|architecture|optimize|complex|advanced|scal)/.test(q)) {
      difficulty = 'hard'
    }
    if (type === 'technical') {
      const techMatch = q.match(/(react|typescript|javascript|python|java|sql|aws)/)
      if (techMatch) topic = techMatch[1]
    }

    return {
      type,
      topic,
      difficulty,
      requiresResumeContext: type === 'behavioral' || type === 'project-based',
      recommendedFramework: type === 'behavioral' ? 'STAR' : undefined
    }
  }
}