# AI Interview Platform 🚀

This project is a **Full‑Stack AI‑Powered Interview Platform** built using **FastAPI (Backend)** and **React (Frontend)**, integrated with **OpenAI APIs** for intelligent interview conversations and **Text‑to‑Speech (TTS)** audio responses.

The platform supports **Technical, HR, System Design, and Case Study rounds** for:

* Data Analyst
* Software Development Engineer (SDE)

---

## 🏗️ Project Structure

```
AI/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env
│   ├── static/
│   │   └── audio/
│   └── venv/
│
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── public/
│   └── src/
│       ├── App.js
│       ├── App.css
│       ├── index.js
│       └── ...
│
└── README.md
```

---

## 🧠 Features

* AI‑driven interview questions
* Multiple interview rounds (Technical, HR, System Design, Case Study)
* Role‑based flow (Data Analyst / SDE)
* Step‑by‑step adaptive questioning
* Short feedback after each answer
* AI‑generated voice responses (TTS)
* Conversation history support

---

## ⚙️ Prerequisites

Make sure the following are installed:

* **Python 3.9+**
* **Node.js 18+**
* **npm**
* **OpenAI API Key**

---

## 🔐 OpenAI API Setup

1. Create an OpenAI account
2. Generate an API key
3. In `backend/.env`, add:

```
OPENAI_API_KEY=your_openai_api_key_here
```

---

## 🖥️ Backend Setup (FastAPI)

### Step 1: Navigate to Backend

```
cd backend
```

### Step 2: Create Virtual Environment

```
python -m venv venv
```

Activate it:

**Windows**

```
venv\Scripts\activate
```

**Mac/Linux**

```
source venv/bin/activate
```

---

### Step 3: Install Dependencies

```
pip install -r requirements.txt
```

If `requirements.txt` is missing, install manually:

```
pip install fastapi uvicorn python-dotenv openai pydantic
```

---

### Step 4: Run Backend Server

```
uvicorn main:app --reload
```

Backend will start at:

```
http://localhost:8000
```

### Health Check

```
http://localhost:8000/health
```

---

## 🌐 Frontend Setup (React)

### Step 1: Navigate to Frontend

```
cd frontend
```

---

### Step 2: Install Node Modules

```
npm install
```

---

### Step 3: Start Frontend

```
npm start
```

Frontend will run at:

```
http://localhost:3000
```

---

## 🔄 Frontend ↔ Backend Communication

* Frontend sends POST requests to:

```
POST http://localhost:8000/chat
```

### Sample Request Payload

```json
{
  "message": "I want Data Analyst technical round",
  "round_type": "technical",
  "history": []
}
```

### Sample Response

```json
{
  "response": "Great! Let's begin...",
  "audio_url": "/static/audio/audio_xxxxx.mp3"
}
```

---

## 🔊 Audio Feature (TTS)

* AI responses are converted to audio
* Audio files are stored in:

```
backend/static/audio/
```

* Audio served via:

```
http://localhost:8000/static/audio/<filename>.mp3
```

---

## 🧪 Supported Interview Rounds

| Round Type    | Values          |
| ------------- | --------------- |
| Technical     | `technical`     |
| HR            | `hr`            |
| System Design | `system-design` |
| Case Study    | `case-study`    |

---

## 🛠️ Common Errors & Fixes

### ❌ Backend Not Starting

* Check Python version
* Ensure virtual environment is activated
* Verify `.env` file exists

### ❌ OpenAI Error

* Check API key
* Ensure internet connection

### ❌ CORS Error

* Ensure frontend runs on port `3000`
* Backend CORS already configured

---

## 🚀 Production Deployment (Optional)

* Backend: Render / Railway / AWS EC2
* Frontend: Vercel / Netlify
* Use `.env` variables on deployment platform

---

## 📌 Future Improvements

* Authentication (Login / Signup)
* Interview scoring system
* Resume‑based questioning
* Video interview support
* Admin dashboard

---

## 👨‍💻 Author

Built as an **AI Interview Preparation Platform** for real‑world interview practice.

---
