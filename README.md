<div align="center">

# 🐞 bugX

### An AI-Powered Coding Platform for Practice, Battles & Algorithm Visualization

Practice coding, compete in real-time battles, prepare for interviews, and learn algorithms visually — all in one platform.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-success)

</div>

---

## 🚀 Overview

**bugX** is a modern full-stack coding platform that makes competitive programming and interview preparation more interactive, engaging, and intelligent.

It combines **coding practice**, **real-time multiplayer battles**, **AI-powered learning**, **company-wise interview preparation**, **daily challenges**, an **interactive algorithm visualization playground**, an **AI chat assistant (X)**, and a structured **AI Coach** — all in one seamless experience.

---

## ✨ Features

### 💻 Smart Coding Workspace
- **Multi-Language Monaco Editor**: High-performance editor supporting **4 core programming languages** (Python, C++, Java, JavaScript).
- **Dual Execution Engine**: Real-time code execution via **Judge0 API** with isolated **Local Sandbox Executor** fallback.
- **Dynamic Harness Generator**: Auto-wraps solution functions across all signature styles (single, multiple, matrix, string, linked list, binary tree).
- **On-Demand Problem Importer**: Search and auto-import problems instantly from **LeetCode**, **GeeksforGeeks**, or **Google** by keyword or URL.
- **Test Case Runner**: Custom input testing with line-by-line assertion comparisons and memory/time limit enforcement.
- **Submission History**: Complete submission timeline with score calculation, rescoring, and runtime performance bonuses.

---

### 🤖 X — AI Chat Assistant
- Built-in AI chat assistant powered via **OpenRouter** (multi-model selection: Claude, GPT-4, DeepSeek, Llama, Gemini).
- **KaTeX** math support for inline and display LaTeX equations.
- Markdown rendering with syntax-highlighted code snippets.
- **Inline *Apply Code* Button**: Push AI solution suggestions directly into the Monaco editor with one click.
- Real-time online user count tracking via **WebSocket** sessions.
- Customizable system prompt, temperature controls, and model persistence.

---

### 🎓 AI Coach — Structured Problem-Solving Guide
A dedicated coaching panel that teaches you *how to think*, not just *what to code*. Triggered via the **"Ask AI"** button on the problem description pane.

| Mode | What it does |
|---|---|
| 💡 **Hint** | A single concise nudge — no spoilers |
| 🧠 **Intuition** | Builds the mental model and pattern recognition |
| 📐 **Approach** | High-level algorithm walkthrough with data-structure rationale |
| ⚠️ **Edge Cases** | Lists tricky corner cases and why they break naive solutions |
| ⏱️ **Complexity** | Big-O time & space analysis with optimization suggestions |
| 🐛 **Debug My Reasoning** | Finds logical flaws and off-by-one errors in your code |

**Key design details:**
- **Conversation isolation** — Coach conversations are stored under a `_coach_:` namespace, fully separate from X chat history. Switching panels never bleeds messages.
- **Race-condition-safe dispatch** — Prompts are queued via a `pendingPromptRef` + `useEffect` pattern and fired only after the conversation is cleanly reset.
- **Context snapshot bar** — Shows the coach what language you're coding in and whether any errors are detected, automatically.
- **Free-form conversation** — Each coaching session ends with an open chat input so you can follow up on anything.
- **Mobile-ready** — Accessible via a dedicated "Coach" tab on mobile alongside Description / Editor / Submissions / X AI.

---

### 🧠 AI-Powered Learning & Interview Simulator
- **AI Problem Explanations**: Step-by-step intuition, hints, and complexity analysis without spoiling full code solutions immediately.
- **AI Code Review**: Automated refactoring, code optimization advice, and edge-case detection.
- **AI Mock Interview Simulator**: Interactive mock technical loops, response evaluation radar charts, and verified downloadable certification badges.

---

### 📊 Algorithm Visualization Playground
An interactive visualizer for understanding data structures and algorithms through step-by-step animated execution.

**Supported Algorithms & Data Structures:**

| Sorting | Searching | Data Structures | Dynamic Programming |
|---|---|---|---|
| Bubble Sort | Binary Search | Linked List Reversal | Fibonacci DP (Memoization) |
| Selection Sort | | Stack Operations (Push/Pop/Peek) | |
| Insertion Sort | | Queue Operations (Enqueue/Dequeue/Peek) | |
| Merge Sort | | | |
| Quick Sort | | | |

**Controls:** ▶ Play · ⏸ Pause · ⏭ Step Forward · ⏮ Step Backward · 🎚 Speed Control · 🔄 Reset · Custom Array Input · Stack Frame Tracer

---

### ⚔️ Real-Time Coding Battles
- **1v1 & Multiplayer Arenas**: Create or join live coding battles supporting up to **20 players**.
- **WebSocket + Redis PubSub**: Real-time match synchronization across multi-process nodes.
- **Catalog or Custom Problems**: Choose catalog problems or build custom multi-problem battle rooms on the fly.
- **Live Match Arena**: Shared countdown timer, live opponent progress feed, real-time submission verification, automated winner determination, and battle leaderboards.

---

### 📄 AI Resume Analyzer
- Upload PDF or TXT resume files (up to 10MB) powered by `pypdf` text extraction.
- **ATS Compatibility Score**: Overall score, formatting score, impact score, and skills match score.
- **Recruiter Suggestions**: Actionable recommendations, detected role analysis, identified skills, missing keywords, and bullet point rewrite suggestions.
- **Dual AI / Rule Engine**: Uses OpenRouter LLM analysis with dynamic text metric fallback engine.

---

### 📈 Analytics & Global Leaderboards
- **Global & Weekly Leaderboards**: User rankings by overall score, problems solved, battles won, and active streaks.
- **Personal Analytics Dashboard**: Solved problem distribution (Easy/Medium/Hard), topic mastery radar, submission activity heatmap calendar, and battle win rates.

---

### 💼 Interview Preparation & Collections
- **Company Tracks**: Filter problems tagged by top tech companies (**Google**, **Meta**, **Amazon**, **Microsoft**, **Apple**, **Netflix**).
- **Topic Tracks**: DSA learning paths (Arrays, DP, Graphs, Trees, Strings, Two Pointers, Binary Search).
- **Daily Coding Challenges**: Daily rotating problem with streak bonuses and score multipliers.
- **Public Profiles**: Shareable user handle pages (`/u/:username`) showcasing badges and activity timelines.

---

### 🛠️ Admin Dashboard
- Protected admin routes (`AdminRoute`) for creating, editing, and publishing problems.
- Automated problem importer dashboard for batch loading LeetCode, GeeksforGeeks, or Google problems.
- Real-time system metric overview and problem catalog controls.

---

### 🎨 Appearance & Settings
- Theme customization: Dark, Cyberpunk, Midnight, Slate themes.
- Monaco editor themes, font scaling, and persistent local preferences.

---

## 🏗️ Architecture

```
Frontend (React + TypeScript + Vite)
            │
            ▼
      FastAPI Backend
            │
            ├── REST APIs (Auth, Problems, Battles, AI, Resume, Stats)
            ├── WebSocket (Battle sync, Live user count)
            ├── Judge0 (Code Execution)
            ├── OpenRouter (LLM / AI)
            │
            ▼
     PostgreSQL / SQLite
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, React Router, Monaco Editor |
| **Backend** | FastAPI, Python 3.11, SQLAlchemy, Alembic |
| **Auth** | JWT, OAuth (Google) |
| **Database** | PostgreSQL (prod), SQLite (dev) |
| **Code Execution** | Judge0 |
| **AI / LLM** | OpenRouter (multi-model), KaTeX for math |
| **Real-time** | WebSockets |
| **Containerization** | Docker, Docker Compose |

---

## 📂 Project Structure

```
bugX/
├── frontend/          # React + TypeScript app (Vite)
│   └── src/
│       ├── features/  # Feature modules (auth, battle, problems, x, ...)
│       ├── pages/     # Page components
│       └── shared/    # Shared UI, hooks, lib
├── backend/           # FastAPI backend
│   └── app/
│       ├── routers/   # API route handlers
│       ├── models/    # SQLAlchemy models
│       ├── services/  # Business logic
│       └── workers/   # Background tasks
├── docs/              # Additional documentation
├── brand_assets/      # Logos & brand files
├── docker-compose.yml # Full-stack Docker setup
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ & npm
- Python 3.11+
- Docker & Docker Compose (optional, for containerized setup)

---

### Option 1 — Docker (Recommended)

```bash
git clone https://github.com/Mannu-Thakur/bugX.git
cd bugX
docker-compose up --build
```

---

### Option 2 — Manual Setup

#### Clone the Repository

```bash
git clone https://github.com/Mannu-Thakur/bugX.git
cd bugX
```

#### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cp .env.example .env           # Configure your environment variables
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env           # Set VITE_API_URL etc.
npm run dev
```

---

## 🚀 Roadmap

- [ ] Collaborative coding rooms
- [ ] Friends & social profiles
- [ ] Discussion forums
- [ ] Achievement badges & XP system
- [ ] AI personalized learning roadmap
- [ ] Dynamic Programming visualizations
- [ ] Additional graph algorithm visualizations
- [ ] Mobile app support

---

## 📌 Project Highlights

- 🤖 AI chat assistant (X) with multi-model support & KaTeX math
- 🎓 Structured AI Coach (Hint, Intuition, Approach, Edge Cases, Complexity, Debug My Reasoning)
- 🧠 AI interview simulator & AI code review
- 📊 Interactive algorithm visualization playground
- ⚔️ Real-time WebSocket multiplayer coding battles
- 📄 AI-powered resume analyzer
- 💼 Company-wise interview preparation
- 📅 Daily coding challenges
- 📈 Personalized performance analytics & leaderboard
- 🎨 Themeable UI (light / dark / system)
- 🐳 Docker-ready full-stack deployment

---

## 📸 Screenshots

<img width="959" height="536" alt="Home" src="https://github.com/user-attachments/assets/7cca852e-bcae-41e4-87b1-23678db74a24" />
<img width="959" height="538" alt="Problems" src="https://github.com/user-attachments/assets/86cf16e8-5905-4d28-b751-8d67ced10bb1" />
<img width="959" height="539" alt="Problem Detail" src="https://github.com/user-attachments/assets/ee4ce0bc-4e24-433b-ac74-2c295641b095" />
<img width="956" height="536" alt="Battle" src="https://github.com/user-attachments/assets/a101438c-f316-41ae-aac8-51c096034b1f" />
<img width="952" height="536" alt="AI Chat X" src="https://github.com/user-attachments/assets/0ccaae0f-e47c-4d0d-bb7e-aee0db7a15b1" />
<img width="959" height="535" alt="Algorithm Viz" src="https://github.com/user-attachments/assets/b7951cd5-ae62-495d-8df9-6f7595119f5a" />
<img width="959" height="539" alt="Dashboard" src="https://github.com/user-attachments/assets/10970bc6-78ef-41dc-966d-81cde9985eeb" />
<img width="958" height="536" alt="Interview" src="https://github.com/user-attachments/assets/ed65f7dd-0a84-4531-8789-4455c670f45c" />
<img width="952" height="536" alt="Leaderboard" src="https://github.com/user-attachments/assets/ea33eafd-f974-48e0-a5fc-b9af77b3a3db" />
<img width="955" height="533" alt="Daily Challenge" src="https://github.com/user-attachments/assets/ca5c5b07-c5dc-476e-a357-c408e90d29cf" />
<img width="879" height="506" alt="Profile" src="https://github.com/user-attachments/assets/9c4b46fa-4a9d-4217-b767-8d7a014ba00d" />
<img width="947" height="533" alt="Resume Analyzer" src="https://github.com/user-attachments/assets/37899081-ec02-4e4d-8108-f014fb380417" />
<img width="959" height="527" alt="Settings" src="https://github.com/user-attachments/assets/1306d53a-b06d-417d-87a8-d79127dd0260" />
<img width="959" height="536" alt="Analytics" src="https://github.com/user-attachments/assets/8ea3d519-3330-4acd-9538-8533f73dd67b" />
<img width="955" height="538" alt="Companies" src="https://github.com/user-attachments/assets/4ae0b8b8-aa09-449a-a526-1f360e04c0c3" />
<img width="919" height="514" alt="Topics" src="https://github.com/user-attachments/assets/f7763325-6838-475a-9462-bed42fa353d3" />
<img width="950" height="530" alt="Battle Arena" src="https://github.com/user-attachments/assets/d86fa3d2-1ffe-4e85-98b7-58e2ab127225" />
<img width="959" height="529" alt="Battle Result" src="https://github.com/user-attachments/assets/504fa1f8-404e-448c-ad38-a1529e9a07a7" />
<img width="944" height="531" alt="X Model Switcher" src="https://github.com/user-attachments/assets/eb786bf7-d031-4f9a-a474-54a95969d6c2" />
<img width="959" height="534" alt="X Math Rendering" src="https://github.com/user-attachments/assets/9af684bf-5542-4300-a437-a3645c0d04dc" />
<img width="959" height="535" alt="Admin" src="https://github.com/user-attachments/assets/3a611be3-e1b9-41d5-af72-5ee7caf26315" />
<img width="959" height="536" alt="Appearance Settings" src="https://github.com/user-attachments/assets/64402546-7ea7-43c3-b328-b608fb647862" />
<img width="958" height="539" alt="Code Editor" src="https://github.com/user-attachments/assets/25f8e43e-0cda-4ba2-b208-edeaf82b60f0" />
<img width="955" height="535" alt="Bookmarks" src="https://github.com/user-attachments/assets/3fb3eca0-c93b-44e6-9fe0-0e5d81f1cc4d" />
<img width="944" height="521" alt="Submission History" src="https://github.com/user-attachments/assets/2ef703eb-97c9-40fb-9aef-31affcfa11bc" />
<img width="959" height="535" alt="Algorithm Step" src="https://github.com/user-attachments/assets/aa22e092-e47b-4a33-8059-684082fa34eb" />

---

## 🤝 Contributing

Contributions are welcome! Fork the repository, create a feature branch, and submit a pull request.

---

## 📜 License

This project is licensed under the **MIT License**.

---

<div align="center">

### ⭐ If you found this project helpful, consider giving it a star!

Made with ❤️ by **Mannu Kumar Thakur**

</div>
