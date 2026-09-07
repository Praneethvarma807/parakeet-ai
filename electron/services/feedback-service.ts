import type { ElectronStore } from '../store'
import type { AIService } from './ai-service'
import type { InterviewSession, InterviewFeedback } from '../../src/types'

export class FeedbackService {
  private store: ElectronStore
  private aiService: AIService

  constructor(store: ElectronStore, aiService: AIService) {
    this.store = store
    this.aiService = aiService
  }

  async evaluate(session: InterviewSession): Promise<InterviewFeedback> {
    const questions = session.questions || []

    if (questions.length === 0) {
      return {
        overallScore: 0,
        communication: 0,
        technical: 0,
        relevance: 0,
        questionsAsked: 0,
        averageAnswerLength: 0,
        recommendations: ['No questions were recorded during this session.'],
        strengths: [],
        improvements: [],
        followUpQuestions: []
      }
    }

    let techTotal = 0
    let commTotal = 0
    let relevanceTotal = 0
    const recommendations: string[] = []
    const strengths: string[] = []
    const improvements: string[] = []

    for (const question of questions) {
      const bestAnswer = question.answers?.[0]
      if (!bestAnswer) continue

      const score = this.scoreAnswer(question, bestAnswer)
      techTotal += score.technical
      commTotal += score.communication
      relevanceTotal += score.relevance

      if (score.technical < 60) {
        improvements.push(`Technical depth limited in: "${question.question.slice(0, 60)}..."`)
      }
      if (score.relevance < 60) {
        recommendations.push(`Ground your answer for "${question.question.slice(0, 60)}..." in a concrete project with numbers.`)
      }
      if (score.communication > 80) {
        strengths.push(`Clear communication on "${question.question.slice(0, 60)}..."`)
      }
    }

    const questionCount = questions.filter((q) => q.answers?.[0]).length || 1
    const avgLen = questions
      .filter((q) => q.answers?.[0])
      .reduce((sum, q) => sum + (q.answers?.[0].answer?.length || 0), 0) / questionCount

    const overallScore = Math.round((techTotal + commTotal + relevanceTotal) / (questionCount * 3))

    if (recommendations.length === 0) {
      recommendations.push('Add measurable outcomes (quantified results) to more answers.')
      recommendations.push('Practice delivering answers in 45-60 seconds.')
    }

    return {
      overallScore,
      communication: Math.round(commTotal / questionCount),
      technical: Math.round(techTotal / questionCount),
      relevance: Math.round(relevanceTotal / questionCount),
      questionsAsked: questions.length,
      averageAnswerLength: Math.round(avgLen),
      recommendations: [...new Set(recommendations)].slice(0, 5),
      strengths: strengths.slice(0, 3),
      improvements: improvements.slice(0, 3),
      followUpQuestions: this.generateFollowUps(session)
    }
  }

  private scoreAnswer(
    question: { questionType: string; question: string },
    answer: { answer: string; keyPoints: string[]; confidence: number }
  ): { technical: number; communication: number; relevance: number } {
    const text = answer.answer || ''
    const words = text.split(/\s+/).length
    const hasNumbers = /(\d+|%|\d+x)/.test(text)
    const hasFraming = /(context|situation|task|action|result|approach|solution|outcome)/.test(text.toLowerCase())

    let technical = answer.confidence * 85
    if (question.questionType === 'technical' || question.questionType === 'coding' || question.questionType === 'system-design') {
      technical = answer.confidence * 80 + (hasFraming ? 10 : 0)
    }

    let communication = answer.confidence * 80
    if (words >= 80 && words <= 200) communication += 10
    else if (words < 40) communication -= 15
    else if (words > 300) communication -= 10

    let relevance = answer.confidence * 75
    if (hasNumbers) relevance += 15
    if (hasFraming) relevance += 5

    return {
      technical: Math.max(30, Math.min(98, Math.round(technical))),
      communication: Math.max(30, Math.min(98, Math.round(communication))),
      relevance: Math.max(30, Math.min(98, Math.round(relevance)))
    }
  }

  private generateFollowUps(session: InterviewSession): string[] {
    const rounds = session.round
    const followUps: string[] = []

    if (rounds === 'technical' || rounds === 'coding') {
      followUps.push('How would you optimize this solution for performance?')
      followUps.push('What edge cases would you test for in production?')
      followUps.push('How would this scale under 10x load?')
    }
    if (rounds === 'behavioral' || rounds === 'hr') {
      followUps.push('Describe a time you received critical feedback and what you did.')
      followUps.push('Why are you interested in this specific company?')
      followUps.push('Where do you see yourself in 3 years?')
    }
    if (rounds === 'system-design') {
      followUps.push('What happens if the database becomes the bottleneck?')
      followUps.push('How would you handle data consistency across services?')
    }

    return followUps.slice(0, 3)
  }

  async generateAIFeedback(session: InterviewSession): Promise<InterviewFeedback> {
    const resume = session.resumeId
      ? this.store.getResumes().find((r) => r.id === session.resumeId)
      : undefined

    const transcript = session.questions
      .map((q) => {
        const answer = q.answers?.[0]?.answer || '(no answer)'
        return `Q: ${q.question}\nA: ${answer}`
      })
      .join('\n\n')

    try {
      const aiScore = await this.aiService.generateAnswer({
        question: `Evaluate this mock interview. Provide overall score, communication, technical and relevance ratings. Questions and answers:\n\n${transcript}`,
        questionType: 'behavioral',
        context: {
          resumeText: resume?.rawText,
          jobDescription: session.jobDescription,
          previousAnswers: []
        }
      })

      const base = await this.evaluate(session)
      if (aiScore.confidence > 0) {
        base.recommendations = [
          ...base.recommendations,
          ...aiScore.followUp
        ].slice(0, 5)
      }
      return base
    } catch {
      return this.evaluate(session)
    }
  }
}