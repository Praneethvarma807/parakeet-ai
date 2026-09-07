export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt: string
}

export interface Resume {
  id: string
  userId: string
  filename: string
  rawText: string
  skills: string[]
  experience: ExperienceItem[]
  projects: ProjectItem[]
  education: EducationItem[]
  technologies: string[]
  createdAt: string
}

export interface ExperienceItem {
  company: string
  title: string
  duration: string
  description: string
}

export interface ProjectItem {
  name: string
  description: string
  technologies: string[]
}

export interface EducationItem {
  institution: string
  degree: string
  year: string
}

export interface JobDescription {
  id: string
  title: string
  company: string
  description: string
  requirements: string[]
  createdAt: string
}

export interface InterviewSession {
  id: string
  userId: string
  jobTitle: string
  company: string
  round: InterviewRound
  experienceLevel: string
  jobDescription?: string
  resumeId?: string
  status: 'waiting' | 'active' | 'paused' | 'ended'
  language: string
  answerStyle: 'concise' | 'natural' | 'detailed'
  startedAt?: string
  endedAt?: string
  questions: Question[]
  createdAt: string
}

export type InterviewRound =
  | 'technical'
  | 'behavioral'
  | 'hr'
  | 'system-design'
  | 'coding'
  | 'project-based'

export type QuestionType =
  | 'technical'
  | 'behavioral'
  | 'hr'
  | 'system-design'
  | 'coding'
  | 'project-based'

export interface Question {
  id: string
  interviewId: string
  question: string
  questionType: QuestionType
  difficulty: 'easy' | 'medium' | 'hard'
  topic: string
  requiresResumeContext: boolean
  recommendedFramework?: string
  answers: Answer[]
  createdAt: string
}

export interface Answer {
  id: string
  questionId: string
  answer: string
  keyPoints: string[]
  confidence: number
  score?: number
  feedback?: string
  createdAt: string
}

export interface TranscriptEntry {
  id: string
  speaker: 'interviewer' | 'candidate'
  text: string
  timestamp: number
  isQuestion: boolean
}

export interface InterviewFeedback {
  overallScore: number
  communication: number
  technical: number
  relevance: number
  questionsAsked: number
  averageAnswerLength: number
  recommendations: string[]
  strengths: string[]
  improvements: string[]
  followUpQuestions: string[]
}

export interface QuestionClassification {
  type: QuestionType
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  requiresResumeContext: boolean
  recommendedFramework?: string
}

export interface AIResponse {
  answer: string
  keyPoints: string[]
  followUp: string[]
  confidence: number
}

export interface Settings {
  theme: 'light' | 'dark'
  aiProvider: 'anthropic' | 'openai' | 'both'
  anthropicApiKey: string
  openaiApiKey: string
  deepgramApiKey: string
  sttProvider: 'deepgram' | 'browser'
  defaultLanguage: string
  defaultAnswerStyle: 'concise' | 'natural' | 'detailed'
}
