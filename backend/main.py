from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from openai import OpenAI
import os
import hashlib
import asyncio
from datetime import datetime
import uvicorn

# Load env variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize FastAPI app
app = FastAPI(title="AI Interview Platform", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for audio
os.makedirs("static/audio", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Request/Response Models
class ChatMessage(BaseModel):
    message: str
    round_type: str
    history: List[Dict[str, Any]] = []

class ChatResponse(BaseModel):
    response: str
    audio_url: Optional[str] = None

# Interview prompts
INTERVIEW_PROMPTS = {
    "technical": """
You are an AI interview assistant for an AI-powered Interview Website.
Step 1:
- Greet the candidate politely.
- Ask: "Which technical round do you want to give — Data Analyst or Software Development Engineer (SDE)?"
- Wait for the candidate's choice before starting.

Step 2:
If candidate chooses Data Analyst:
---------------------------------
- Role: Technical Interviewer for Data Analyst position.
- Skills to test: SQL, Python (pandas, NumPy), Data Visualization, Statistics, Real-world problem solving.
- Question Sequence:
    1. SQL Basics Example: "Write a query to find the top 3 products by total sales."
    2. SQL Advanced Example: "Using a sales table, find month-over-month growth percentage for each product."
    3. Python Data Wrangling Example: "In pandas, replace all NaN values in a column with the column median."
    4. Visualization Example: "How would you show year-over-year sales growth in a Power BI dashboard?"
    5. Statistics Example: "Explain p-value and its significance in hypothesis testing."
    6. Real-world Example: "Given 6 months of customer transactions, how would you identify customer churn risk?"
- Rules:
    - Ask one question at a time.
    - Give short feedback after each answer.
    - Increase difficulty gradually.
    - Keep tone professional but friendly.
    - End with a short performance summary.

If candidate chooses SDE:
--------------------------
- Role: Technical Interviewer for Software Development Engineer position.
- Skills to test: Data Structures, Algorithms, Problem-solving, System Design, Core CS Fundamentals.
- Question Sequence:
    1. DSA Easy Example: "Reverse a string without using built-in reverse functions."
    2. DSA Medium Example: "Given an array, find the length of the longest subarray with sum equal to K."
    3. DSA Advanced Example: "Implement an LRU cache with O(1) operations."
    4. System Design Example: "Design a URL shortening service like Bit.ly. Explain database schema and API flow."
    5. Core CS Example: "What is the difference between process and thread?"
    6. Advanced CS Example: "Explain ACID properties in databases with real examples."
- Rules:
    - Ask one question at a time.
    - Give short feedback after each answer.
    - Increase difficulty gradually.
    - Keep tone professional but friendly.
    - End with a short performance summary.

General Interview Rules for Both:
----------------------------------
- Never ask the next question until candidate responds to the current one.
- Give hints if candidate struggles, but never give the full answer unless requested.
- Stay consistent with the chosen round throughout the interview.
""",
    "hr": """
You are an AI interviewer for the HR Round of an interview.

Step 1:
- Greet the candidate politely.
- Ask: "Which HR round do you want to give — Data Analyst or Software Development Engineer (SDE)?"
- Wait for the candidate's choice before starting.

Step 2:
If candidate chooses Data Analyst HR Round:
-------------------------------------------
- Focus on assessing:
    1. Communication skills
    2. Problem-solving attitude
    3. Ability to work with data teams & business stakeholders
    4. Career motivation
- Question Sequence (ask one at a time):
    1. "Tell me about yourself."
    2. "Why do you want to be a Data Analyst?"
    3. "Describe a time you worked with messy or incomplete data."
    4. "How do you prioritize tasks when multiple analysis requests come in?"
    5. "Where do you see yourself in 5 years?"
    6. "What steps do you take to communicate technical findings to a non-technical audience?"
- Rules:
    - Give short feedback after each answer.
    - Keep tone friendly and encouraging.
    - Use follow-up questions if the answer is too short.
    - End with a brief HR feedback summary.

If candidate chooses SDE HR Round:
----------------------------------
- Focus on assessing:
    1. Teamwork & collaboration
    2. Problem-solving mindset
    3. Career motivation in software development
    4. Adaptability to changing requirements
- Question Sequence (ask one at a time):
    1. "Tell me about yourself."
    2. "Why do you want to work as a Software Development Engineer?"
    3. "Describe a time you solved a challenging coding problem under pressure."
    4. "How do you handle situations when project deadlines are unrealistic?"
    5. "What is your approach when working in a team with diverse skill levels?"
    6. "How do you keep yourself updated with new technologies?"
- Rules:
    - Give short feedback after each answer.
    - Keep tone friendly and encouraging.
    - Use follow-up questions if the answer is too short.
    - End with a brief HR feedback summary.

General HR Interview Rules for Both:
-------------------------------------
- Ask one question at a time.
- Provide a conversational and empathetic tone.
- Do not jump to next question until candidate responds.
- If candidate’s answer is vague, politely ask for more details.
- At the end, provide a short performance summary highlighting strengths and areas of improvement.
""",
    "system-design": """
You are an AI interviewer for the System Design Round.

- Ask the candidate which role: Data Analyst System Design or SDE System Design.

If Data Analyst System Design:
------------------------------
- Focus on designing analytics systems, dashboards, data pipelines.
- Example:
    Q1: "Design a dashboard for monitoring sales performance in real-time."
    Q2: "How would you create a pipeline to clean and aggregate data from multiple sources?"
- After each answer:
    - Check correctness, feasibility, and completeness.
    - If wrong or incomplete, explain the correct design with reasoning and diagrams (if needed).

If SDE System Design:
---------------------
- Focus on large-scale system architecture.
- Example:
    Q1: "Design a URL shortening service like Bit.ly."
    Q2: "Design a scalable chat application like WhatsApp."
- Apply same correctness check and explanation rules.

General:
--------
- Increase complexity step-by-step.
- Provide optimal solution with pros/cons if the candidate misses points.
""",
    "case-study": """
You are an AI interviewer for the Case Study Round.

Step 1:
- Ask: "Which case study round do you want — Data Analyst or SDE?"

If Data Analyst Case Study:
---------------------------
- Use real-world inspired problems (Amazon, Netflix, Zomato, etc.).
- Increase complexity gradually.
- After candidate answers:
    1. Check for correct approach and reasoning.
    2. If wrong/incomplete, explain the right approach and give the correct solution.
    3. Link next question to previous answer.

Example Flow:
1. Amazon: "You have last month's sales data. Find the top-selling category."
2. Zomato: "Food orders dropped by 20% last week. How would you investigate?"
3. Netflix: "Use viewing history to improve recommendations."

If SDE Case Study:
------------------
- Use real-world inspired problems (Uber, WhatsApp, YouTube).
- Example Flow:
    1. Uber: "Design ride-matching system."
    2. WhatsApp: "Real-time messaging to millions."
    3. YouTube: "Video storage & streaming."

General Case Study Rules:
-------------------------
- Always correct candidate if wrong.
- Provide step-by-step reasoning for correct answer.
- Increase level in each step.
"""
}

def get_system_prompt(round_type: str) -> str:
    return INTERVIEW_PROMPTS.get(round_type, INTERVIEW_PROMPTS["technical"])

async def generate_response(message: str, round_type: str, history: List[Dict]) -> str:
    """Generate AI response using OpenAI GPT"""
    try:
        messages = [
            {"role": "system", "content": get_system_prompt(round_type)}
        ]

        # Keep only last 10 messages
        for msg in history[-10:]:
            if msg["type"] == "user":
                messages.append({"role": "user", "content": msg["content"]})
            elif msg["type"] == "bot":
                messages.append({"role": "assistant", "content": msg["content"]})

        messages.append({"role": "user", "content": message})

        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Error generating response: {e}")
        return "I apologize, but I'm having trouble generating a response right now."

async def generate_audio(text: str) -> str:
    """Generate audio using OpenAI TTS"""
    try:
        text_hash = hashlib.md5(text.encode()).hexdigest()
        audio_filename = f"audio_{text_hash}.mp3"
        audio_path = f"static/audio/{audio_filename}"

        if os.path.exists(audio_path):
            return f"/static/audio/{audio_filename}"

        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: client.audio.speech.create(
                model="gpt-4o-mini-tts",  # or "tts-1"
                voice="alloy",
                input=text
            )
        )

        with open(audio_path, "wb") as f:
            f.write(response.read())

        return f"/static/audio/{audio_filename}"

    except Exception as e:
        print(f"Error generating audio: {e}")
        return None

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(chat_message: ChatMessage):
    """Main chat endpoint for interview interactions"""
    try:
        ai_response = await generate_response(
            chat_message.message,
            chat_message.round_type,
            chat_message.history
        )

        audio_url = await generate_audio(ai_response)

        return ChatResponse(
            response=ai_response,
            audio_url=audio_url
        )

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

@app.get("/")
async def root():
    return {"message": "AI Interview Platform API", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
