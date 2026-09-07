import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse'
import { v4 as uuidv4 } from 'uuid'
import type { ElectronStore } from '../store'
import type { Resume, ExperienceItem, ProjectItem, EducationItem } from '../../src/types'

const SKILL_PATTERNS: Record<string, RegExp> = {
  JavaScript: /\bjavascript\b/i,
  TypeScript: /\btypescript\b/i,
  React: /\breact\b/i,
  'React Native': /\breact native\b/i,
  Node: /\bnode\.?js\b/i,
  Python: /\bpython\b/i,
  Java: /\bjava\b/i,
  'C#': /\bc#\b/i,
  'C++': /\bc\+\+\b/i,
  Go: /\bgo(lang)?\b/i,
  Rust: /\brust\b/i,
  SQL: /\bsql\b/i,
  PostgreSQL: /\bpostgres(ql)?\b/i,
  MySQL: /\bmysql\b/i,
  MongoDB: /\bmongodb\b/i,
  Redis: /\bredis\b/i,
  Docker: /\bdocker\b/i,
  Kubernetes: /\bkubernetes\b|\bk8s\b/i,
  AWS: /\baws\b/i,
  'Azure': /\bazure\b/i,
  'Google Cloud': /\bgoogle cloud\b|\bgcp\b/i,
  'CI/CD': /\bci\/cd\b/i,
  Git: /\bgit\b/i,
  GraphQL: /\bgraphql\b/i,
  'REST API': /\brest api\b|\bapis?\b/i,
  Next: /\bnext\.?js\b/i,
  Vue: /\bvue\b/i,
  Angular: /\bangular\b/i,
  Tailwind: /\btailwind\b/i,
  Express: /\bexpress\.?js\b/i,
  Nest: /\bnest(\.js)?\b/i,
  Firebase: /\bfirebase\b/i,
  Redux: /\bredux\b/i,
  Zustand: /\bzustand\b/i,
  'Machine Learning': /\bmachine learning\b|\bml\b/i,
  'Deep Learning': /\bdeep learning\b|\bdl\b/i,
  'AI': /\b(artificial intelligence|\bai\b)\b/i,
  NLP: /\bnlp\b/i,
  TensorFlow: /\btensorflow\b/i,
  PyTorch: /\bpytorch\b/i,
  Pandas: /\bpandas\b/i,
  NumPy: /\bnumpy\b/i,
  Kafka: /\bkafka\b/i,
  RabbitMQ: /\brabbitmq\b/i,
  Elasticsearch: /\belasticsearch\b/i,
  'WebSockets': /\bwebsockets?\b/i,
  Socket: /\bsocket\.?io\b/i,
  'Unit Testing': /\bunit tests?\b/i,
  Jest: /\bjest\b/i,
  Cypress: /\bcypress\b/i,
  Playwright: /\bplaywright\b/i,
  Selenium: /\bselenium\b/i,
  Linux: /\blinux\b/i,
  Bash: /\bbash|shell scripting\b/i,
  Rails: /\brails\b/i,
  Laravel: /\blaravel\b/i,
  Django: /\bdjango\b/i,
  Flutter: /\bflutter\b/i,
  Swift: /\bswift\b/i,
  Kotlin: /\bkotlin\b/i,
  'Agile': /\bagile\b/i,
  Scrum: /\bscrum\b/i,
  Microservices: /\bmicroservices?\b/i,
  'Serverless': /\bserverless\b/i,
  Terraform: /\bterraform\b/i,
  Ansible: /\bansible\b/i,
  'Tailwind CSS': /\btailwindcss\b/i,
  'Webpack': /\bwebpack\b/i,
  Vite: /\bvite\b/i,
  'Electron': /\belectron\b/i
}

const TECH_COMPANIES = new Set([
  'google', 'amazon', 'microsoft', 'facebook', 'meta', 'apple', 'netflix',
  'uber', 'airbnb', 'stripe', 'square', 'linkedin', 'twitter', 'tesla',
  'oracle', 'salesforce', 'ibm', 'intel', 'cisco', 'adobe', 'nvidia',
  'samsung', 'dell', 'hp', 'vmware', 'sap', 'atlassian', 'shopify',
  'spotify', 'slack', 'dropbox', 'datadog', 'snowflake', 'cloudflare'
])

export class ResumeParser {
  private store: ElectronStore

  constructor(store: ElectronStore) {
    this.store = store
  }

  async parseFile(filePath: string): Promise<Resume> {
    const ext = path.extname(filePath).toLowerCase()
    let text = ''

    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath)
      const data = await pdf(buffer)
      text = data.text
    } else if (ext === '.txt' || ext === '.md') {
      text = fs.readFileSync(filePath, 'utf-8')
    } else {
      throw new Error(`Unsupported file format: ${ext}`)
    }

    return this.parseText(text, path.basename(filePath))
  }

  async parseText(text: string, filename: string): Promise<Resume> {
    const skills = this.extractSkills(text)
    const experience = this.extractExperience(text)
    const projects = this.extractProjects(text)
    const education = this.extractEducation(text)
    const technologies = [...new Set(skills.filter((s) => this.isTechnology(s)))]

    const resume: Resume = {
      id: uuidv4(),
      userId: 'local-user',
      filename,
      rawText: text,
      skills,
      experience,
      projects,
      education,
      technologies,
      createdAt: new Date().toISOString()
    }

    this.store.saveResume(resume)
    return resume
  }

  private extractSkills(text: string): string[] {
    const found: string[] = []
    for (const [skill, pattern] of Object.entries(SKILL_PATTERNS)) {
      if (pattern.test(text)) {
        found.push(skill)
      }
    }
    return found
  }

  private isTechnology(skill: string): boolean {
    return !['Agile', 'Scrum', 'Microservices'].includes(skill)
  }

  private extractExperience(text: string): ExperienceItem[] {
    const experience: ExperienceItem[] = []
    const expSection = this.getSection(text, ['experience', 'employment', 'work history'])

    if (expSection) {
      const lines = expSection.split('\n').filter((l) => l.trim().length > 0)
      const jobPattern = /\b(Software|Engineer|Developer|SDE|Manager|Lead|Analyst|Intern|Analyst|Scientist|Architect|Consultant)\b/i

      let current: Partial<ExperienceItem> | null = null

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        if (jobPattern.test(trimmed) && trimmed.length < 100) {
          if (current?.company) {
            experience.push({
              company: current.company,
              title: current.title || '',
              duration: current.duration || '',
              description: current.description || ''
            })
          }
          let title = trimmed.replace(/^at\s+/i, '').replace(/^[@-]\s*/, '')
          current = { title }
          const companyMatchInLine = trimmed.match(/\bat\s+([A-Z][\w .&']+)/i)
          if (companyMatchInLine) {
            current.company = companyMatchInLine[1]
            title = title.replace(companyMatchInLine[0], '').trim()
            current.title = title
          }
        } else if (current && !current.company && /^[A-Z][\w .&'-]+$/.test(trimmed) && trimmed.length < 50) {
          current.company = trimmed
        } else if (current && !current.duration && /(\d{4}|\d{2}\/\d{4}|\bpresent\b)/i.test(trimmed) && trimmed.length < 40) {
          current.duration = trimmed
        } else if (current) {
          current.description = ((current.description || '') + ' ' + trimmed).trim()
        }
      }
      if (current?.company) {
        experience.push({
          company: current.company,
          title: current.title || '',
          duration: current.duration || '',
          description: current.description || ''
        })
      }
    }

    return experience.length > 0 ? experience : this.guessExperience(text)
  }

  private guessExperience(text: string): ExperienceItem[] {
    const items: ExperienceItem[] = []
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const lower = line.toLowerCase()
      if (/\b(software engineer|developer|engineer|intern)\b/.test(lower) && line.length < 80) {
        const item: ExperienceItem = {
          company: '',
          title: line,
          duration: '',
          description: ''
        }
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const next = lines[j].trim()
          const nextLower = next.toLowerCase()
          if (/^[A-Z][\w .&']+$/.test(next) && next.length < 50 && !/(experience|skills|projects|education|summary)/.test(nextLower)) {
            item.company = next
            break
          }
        }
        if (/(19|20)\d{2}/.test(line)) {
          item.duration = line
        }
        items.push(item)
      }
    }
    return items
  }

  private extractProjects(text: string): ProjectItem[] {
    const projects: ProjectItem[] = []
    const projSection = this.getSection(text, ['projects', 'project experience', 'personal projects'])

    if (projSection) {
      const lines = projSection.split('\n')
      let current: Partial<ProjectItem> | null = null

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (trimmed.length < 70 && !/[-•]/.test(trimmed) && !current) {
          current = { name: trimmed.replace(/[:]$/, '') }
        } else if (current && !current.description) {
          current.description = trimmed
          const techs = this.extractSkills(trimmed)
          if (techs.length > 0) current.technologies = techs
        } else if (current) {
          current.description = (current.description || '') + ' ' + trimmed
          const techs = this.extractSkills(trimmed)
          if (techs.length > 0) current.technologies = [...new Set([...(current.technologies || []), ...techs])]
        }
        if ((current?.description || '').length > 30 && /(\.|$)/.test(trimmed)) {
          projects.push(current as ProjectItem)
          current = null
        }
      }
      if (current?.description) projects.push(current as ProjectItem)
    }

    return projects.length > 0 ? projects : this.guessProjects(text)
  }

  private guessProjects(text: string): ProjectItem[] {
    const projects: ProjectItem[] = []
    const words = text.split(/\s+/)
    let i = 0
    while (i < words.length) {
      if (/^(built|developed|created|designed|implemented|engineered)$/i.test(words[i])) {
        const name = words.slice(i + 1, i + 4).join(' ').replace(/[.,]$/, '')
        projects.push({
          name: name || 'Project',
          description: this.extractContext(text, words[i], 60),
          technologies: this.extractSkills(this.extractContext(text, words[i], 60))
        })
        i += 5
      } else {
        i++
      }
    }
    return projects
  }

  private extractContext(text: string, word: string, length: number): string {
    const idx = text.toLowerCase().indexOf(word.toLowerCase())
    if (idx === -1) return ''
    return text.slice(idx, Math.min(idx + length, text.length)).replace(/\s+/g, ' ').trim()
  }

  private extractEducation(text: string): EducationItem[] {
    const education: EducationItem[] = []
    const eduSection = this.getSection(text, ['education', 'academic'])

    if (eduSection) {
      const universities = text.match(/[A-Z][\w .&']+(University|College|Institute|School|Academy|Tech|IIT|NIT)[\w .&']*/g) || []
      const degrees = text.match(/(B\.?Tech|M\.?Tech|Bachelor|Master|B\.Sc|M\.Sc|B\.A|M\.A|PhD|MBA|B\.E|M\.E)[\w .&'\-,]*/g) || []
      const years = text.match(/((19|20)\d{2}\s*[-–]\s*(19|20)\d{2}|(19|20)\d{2})/g) || []

      const edu = universities[0] || 'University'
      education.push({
        institution: edu,
        degree: degrees[0] || 'Degree',
        year: years[0] || ''
      })
    }

    return education
  }

  private getSection(text: string, keywords: string[]): string | null {
    const lines = text.split('\n')
    const sectionIndex = lines.findIndex((line) => {
      const lower = line.toLowerCase()
      return keywords.some((k) => lower.includes(k))
    })

    if (sectionIndex === -1) return null

    const nextSectionLines = lines.slice(sectionIndex + 1)
    const nextHeaderIdx = nextSectionLines.findIndex((line) => {
      const lower = line.trim().toLowerCase()
      return /(^| )(education|skills|skills summary|projects|experience|contact|summary|objective|certifications|certificates)($|:| )/.test(lower) &&
        line.trim().length < 30
    })

    if (nextHeaderIdx === -1) return nextSectionLines.join('\n')
    return nextSectionLines.slice(0, nextHeaderIdx).join('\n')
  }
}