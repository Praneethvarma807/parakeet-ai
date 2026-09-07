# 🦜 Parakeet AI

AI Interview Preparation Assistant — a Windows desktop app (Electron + React + TypeScript + Tailwind) that listens to mock interviews, suggests natural answers grounded in your resume, and scores your performance.

## Features

- **Interview sessions** — pick job title, company, round, experience, JD, resume, answer style
- **Speech-to-Text** — live transcript via Deepgram streaming (WebSocket) or browser engine
- **AI answer generation** — Anthropic Claude / OpenAI GPT, grounded in your resume, never invented
- **Question classification** — technical / behavioral / HR / system design / coding / project-based
- **Resume intelligence** — parses PDF/TXT resumes; extracts skills, experience, projects, education
- **Coding interview mode** — paste a solution, get a speak-aloud explanation (approach / complexity / edge cases)
- **Post-interview report** — overall score, communication, technical, relevance, recommendations, follow-up questions

## Quick start (development)

```bash
npm install
npm run build              # build renderer + electron main
npm start                  # launch Electron app
npm run dev                # Vite dev server
npm run server             # run the REST backend on :3456
```

## Global shortcuts & listening popup

While the app runs these work system-wide, even when another window has focus:

| Shortcut                | Action                            |
| ----------------------- | --------------------------------- |
| `Ctrl + Shift + Space`  | Start / stop listening            |
| `Ctrl + Shift + A`      | Generate AI answer                |
| `Ctrl + Shift + R`      | Regenerate answer                 |
| `Ctrl + Shift + S`      | Show / hide assistant popup       |
| `Ctrl + Shift + P`      | Pause / resume transcription      |
| `Ctrl + Shift + C`      | Clear current question            |
| `Ctrl + Shift + M`      | Toggle microphone                 |
| `Ctrl + Shift + Q`      | End interview session             |
| `Ctrl + Shift + H`      | Show shortcut help                |
| `Esc`                   | Hide popup                        |

The assistant popup stays always-on-top, never steals keyboard focus, is draggable
(remembers its position), has a compact/minimize mode, auto-resizes to the live
transcript, and mirrors the listening/transcribing state.

> Note: these are registered as *global* hotkeys, so while Parakeet runs they
> take precedence over other apps that use the same combos.

## Build Windows installer

```bash
npm run electron:build:win
```

Output: `release/Parakeet AI Setup 1.0.0.exe`

## Configuration

Enter your API keys once in **Settings** inside the app (stored locally in
`%APPDATA%\parakeet-ai\data.json`):

- **Anthropic** — answer generation
- **OpenAI** — answer generation (fallback)
- **Deepgram** — speech-to-text

## Architecture

```
Electron Main ─── IPC ─── React Renderer
   │                        ├── Dashboard, New Interview, Live Session
   ├── AIService            ├── STT (Deepgram WebSocket)
   ├── ResumeParser         ├── Coding Practice
   ├── SessionManager       └── Reports
   └── FeedbackService
```

Answer generation is powered by a grounded prompt that supplies your resume, job
description, and previous answers so responses reflect your real experience.