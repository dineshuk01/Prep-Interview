from fastapi import FastAPI, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from openai import OpenAI
import os
import hashlib
import asyncio
import bcrypt
import uuid
from datetime import datetime
import uvicorn
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

from agent import run_agent, run_evaluation_workflow

# Load env variables
load_dotenv()

# Initialize OpenAI client (still used for TTS)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB", "ai_interview_platform")
mongo_client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
db = mongo_client[MONGO_DB_NAME]

# Initialize FastAPI app
app = FastAPI(title="AI Interview Platform – Agentic", version="2.0.0")

# Enable CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for audio
os.makedirs("static/audio", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


# ─────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str
    round_type: str
    session_id: str
    user_id: str


class ChatResponse(BaseModel):
    response: str
    audio_url: Optional[str] = None
    tools_used: List[str] = []


class ClearHistoryRequest(BaseModel):
    session_id: str
    round_type: str


class FinishInterviewRequest(BaseModel):
    session_id: str
    round_type: str
    user_id: str


class UserSignup(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


# ─────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────

@app.post("/signup")
async def signup(user: UserSignup):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(user.password.encode('utf-8'), salt)

    user_id = str(uuid.uuid4())
    user_doc = {
        "user_id": user_id,
        "name": user.name,
        "email": user.email,
        "password": hashed.decode('utf-8'),
        "created_at": datetime.now().isoformat()
    }
    await db.users.insert_one(user_doc)
    return {"user_id": user_id, "name": user.name, "email": user.email}


@app.post("/login")
async def login(user: UserLogin):
    user_doc = await db.users.find_one({"email": user.email})
    if not user_doc:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not bcrypt.checkpw(user.password.encode('utf-8'), user_doc["password"].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    return {"user_id": user_doc["user_id"], "name": user_doc["name"], "email": user_doc["email"]}


# ─────────────────────────────────────────────
# TTS Helper
# ─────────────────────────────────────────────

async def generate_audio(text: str) -> Optional[str]:
    """Generate audio using OpenAI TTS and cache it."""
    try:
        text_hash = hashlib.md5(text.encode()).hexdigest()
        audio_filename = f"audio_{text_hash}.mp3"
        audio_path = f"static/audio/{audio_filename}"

        if os.path.exists(audio_path):
            return f"/static/audio/{audio_filename}"

        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: client.audio.speech.create(
                model="tts-1",
                voice="alloy",
                input=text[:4096]   # TTS limit
            )
        )

        with open(audio_path, "wb") as f:
            f.write(response.read())

        return f"/static/audio/{audio_filename}"
    except Exception as e:
        print(f"Error generating audio: {e}")
        return None


# ─────────────────────────────────────────────
# Chat Endpoint – now goes through the Agent
# ─────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(chat_message: ChatMessage):
    """Main chat endpoint – routes through the LangChain agent with tools."""
    try:
        # Fetch history from MongoDB
        session_doc = await db.sessions.find_one({
            "session_id": chat_message.session_id,
            "round_type": chat_message.round_type
        })
        history = session_doc.get("messages", []) if session_doc else []

        # Run the agentic response (may call tools internally)
        ai_response, tools_used = await run_agent(
            message=chat_message.message,
            round_type=chat_message.round_type,
            history=history
        )

        # Generate TTS
        audio_url = await generate_audio(ai_response)

        # Persist messages to MongoDB
        user_msg = {
            "type": "user",
            "content": chat_message.message,
            "timestamp": datetime.now().isoformat()
        }
        bot_msg = {
            "type": "bot",
            "content": ai_response,
            "audio_url": audio_url,
            "tools_used": tools_used,
            "timestamp": datetime.now().isoformat()
        }

        title = chat_message.message[:30] + "..." if len(chat_message.message) > 30 else chat_message.message

        await db.sessions.update_one(
            {"session_id": chat_message.session_id, "round_type": chat_message.round_type},
            {
                "$push": {"messages": {"$each": [user_msg, bot_msg]}},
                "$set": {
                    "user_id": chat_message.user_id,
                    "updated_at": datetime.now().isoformat()
                },
                "$setOnInsert": {"title": title}
            },
            upsert=True
        )

        return ChatResponse(
            response=ai_response,
            audio_url=audio_url,
            tools_used=tools_used
        )

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ─────────────────────────────────────────────
# History / Sessions Endpoints
# ─────────────────────────────────────────────

@app.get("/history/{session_id}/{round_type}/{user_id}")
async def get_history(session_id: str, round_type: str, user_id: str):
    """Fetch conversation history for a session and round."""
    try:
        session_doc = await db.sessions.find_one({
            "session_id": session_id,
            "round_type": round_type,
            "user_id": user_id
        })
        if session_doc:
            return {"messages": session_doc.get("messages", [])}
        return {"messages": []}
    except Exception as e:
        print(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/clear-history")
async def clear_history(req: ClearHistoryRequest):
    """Clear conversation history for a session and round."""
    try:
        await db.sessions.delete_one({"session_id": req.session_id, "round_type": req.round_type})
        return {"status": "success"}
    except Exception as e:
        print(f"Error clearing history: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/sessions/{user_id}")
async def get_sessions(user_id: str):
    """Fetch all sessions for a user."""
    try:
        cursor = db.sessions.find({"user_id": user_id}).sort("updated_at", -1)
        sessions = await cursor.to_list(length=100)

        formatted_sessions = []
        for s in sessions:
            formatted_sessions.append({
                "session_id": s.get("session_id"),
                "round_type": s.get("round_type"),
                "title": s.get("title", s.get("round_type", "Interview Session")),
                "updated_at": s.get("updated_at"),
                "has_report": bool(s.get("evaluation_report"))
            })

        return {"sessions": formatted_sessions}
    except Exception as e:
        print(f"Error fetching sessions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ─────────────────────────────────────────────
# NEW: Finish Interview + Evaluation Report
# ─────────────────────────────────────────────

async def _generate_and_store_report(session_id: str, round_type: str, user_id: str):
    """Background task: run the 4-step evaluation pipeline and save to MongoDB."""
    try:
        session_doc = await db.sessions.find_one({
            "session_id": session_id,
            "round_type": round_type,
            "user_id": user_id
        })
        if not session_doc:
            print(f"[Evaluation] Session {session_id} not found.")
            return

        history = session_doc.get("messages", [])
        report = await run_evaluation_workflow(session_id, round_type, history)

        await db.sessions.update_one(
            {"session_id": session_id, "round_type": round_type},
            {"$set": {
                "evaluation_report": report,
                "report_generated_at": datetime.now().isoformat()
            }}
        )
        print(f"[Evaluation] Report generated for session {session_id}.")
    except Exception as e:
        print(f"[Evaluation] Error generating report: {e}")


@app.post("/finish-interview")
async def finish_interview(req: FinishInterviewRequest, background_tasks: BackgroundTasks):
    """
    Trigger the multi-step evaluation workflow for a completed interview.
    The pipeline runs in the background. Poll /report/{session_id} to get results.
    """
    background_tasks.add_task(
        _generate_and_store_report,
        req.session_id,
        req.round_type,
        req.user_id
    )
    return {
        "status": "processing",
        "message": "Evaluation pipeline started. Check /report/{session_id}/{round_type} in a few seconds.",
        "pipeline_steps": ["Transcript Summariser", "Technical Evaluator", "Soft-Skills Evaluator", "Report Generator"]
    }


@app.get("/report/{session_id}/{round_type}")
async def get_report(session_id: str, round_type: str):
    """Retrieve the evaluation report for a completed interview session."""
    try:
        session_doc = await db.sessions.find_one({
            "session_id": session_id,
            "round_type": round_type
        })
        if not session_doc:
            raise HTTPException(status_code=404, detail="Session not found.")

        report = session_doc.get("evaluation_report")
        if not report:
            return {"status": "processing", "message": "Evaluation report is not ready yet. Please wait a moment."}

        return {"status": "ready", "report": report}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching report: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ─────────────────────────────────────────────
# Health & Root
# ─────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0", "agentic": True, "timestamp": datetime.now()}


@app.get("/")
async def root():
    return {"message": "AI Interview Platform – Agentic API", "version": "2.0.0"}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
