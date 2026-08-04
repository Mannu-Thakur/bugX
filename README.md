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

It combines **coding practice**, **real-time multiplayer battles**, **AI-powered learning**, **company-wise interview preparation**, **daily challenges**, an **interactive algorithm visualization playground**, and an **AI chat assistant (X)** — all in one seamless experience.

---

## ✨ Features

### 💻 Smart Coding Workspace

- Multi-language code editor powered by Monaco
- Real-time code execution via Judge0
- Custom test cases & submission history
- Difficulty-based filtering
- Topic-wise & company-wise problem collections
- Daily coding challenges
- Bookmark & progress tracking

---

### 🤖 X — AI Chat Assistant

A built-in AI chat panel (powered via OpenRouter) for coding assistance and beyond.

- Supports multiple LLM models (auto-verified via API)
- Markdown rendering with syntax-highlighted code blocks
- **KaTeX** support for inline and display LaTeX math
- Inline *Apply Code* button to push AI suggestions directly into the editor
- Real-time online user count via **WebSocket**
- Session-based tracking (no IP fallback)
- Configurable system prompt, temperature, and model selection

---

### 🧠 AI-Powered Learning

- AI problem explanations & solution approaches
- AI code review & optimization
- AI debugging assistance
- AI interview simulator
- Intelligent hints without revealing complete solutions

---

### 📊 Algorithm Visualization Playground

An interactive playground for understanding algorithms through real-time animations.

**Supported Algorithms:**

| Sorting | Searching | Graph |
|---|---|---|
| Bubble Sort | Binary Search | BFS |
| Selection Sort | | DFS |
| Insertion Sort | | |
| Merge Sort | | |
| Quick Sort | | |

**Controls:** ▶ Play · ⏸ Pause · ⏭ Step Forward · 🎚 Speed Control · 🔄 Reset

---

### ⚔️ Real-Time Coding Battles

Compete against other programmers in live coding matches.

- 1v1 multiplayer battles via WebSocket
- Live countdown timer & shared coding environment
- Automatic winner detection
- Live battle leaderboard

---

### 📄 Resume Analyzer

- Upload and analyze your resume with AI
- Get feedback and improvement suggestions
- ATS-friendly recommendations

---

### 📈 Personalized Dashboard & Analytics

- Solved problems & submission statistics
- Topic-wise & company-wise progress
- Battle history & performance insights
- Live platform online user count

---

### 🏆 Interview Preparation

- Company-specific problem collections
- Topic-wise learning paths
- Daily coding challenges
- AI interview simulator
- Performance tracking

---

### 🎨 Appearance & Settings

- Light / Dark / System theme toggle
- Customizable editor font size and settings
- Persistent user preferences

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
