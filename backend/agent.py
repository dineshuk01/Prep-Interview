"""
Agentic interview logic using LangChain.

Two main exports:
1. get_interview_agent()         – returns an agent executor for the live chat loop
2. run_evaluation_workflow()     – async multi-step pipeline that generates a hiring scorecard
"""

import asyncio
import json
from typing import List, Dict, Any

from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from tools import AGENT_TOOLS


# ─────────────────────────────────────────────
# Shared LLM
# ─────────────────────────────────────────────

def _get_llm(temperature: float = 0.7) -> ChatOpenAI:
    return ChatOpenAI(model="gpt-4o-mini", temperature=temperature)


# ─────────────────────────────────────────────
# Interview Prompts (same as before, centralised here)
# ─────────────────────────────────────────────

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
    - If a candidate makes a specific technical claim you are unsure about, use the fact_checker_tool to verify it before responding.
    - If a candidate provides code, use the code_evaluator_tool to run it and give real output-based feedback.
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
    - If a candidate makes a specific technical claim you are unsure about, use the fact_checker_tool to verify it before responding.
    - If a candidate provides code, use the code_evaluator_tool to run it and give real output-based feedback.
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
- If candidate's answer is vague, politely ask for more details.
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


# ─────────────────────────────────────────────
# 1. Live Interview Agent (with tools)
# ─────────────────────────────────────────────

def _build_agent_executor(system_prompt: str) -> AgentExecutor:
    llm = _get_llm(temperature=0.7)
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    agent = create_openai_tools_agent(llm, AGENT_TOOLS, prompt)
    return AgentExecutor(agent=agent, tools=AGENT_TOOLS, verbose=True, max_iterations=5)


def get_interview_agent(round_type: str) -> AgentExecutor:
    """Return a configured AgentExecutor for the given interview round."""
    return _build_agent_executor(get_system_prompt(round_type))


def history_to_langchain_messages(history: List[Dict]) -> list:
    """Convert MongoDB message history to LangChain message objects."""
    messages = []
    for msg in history[-10:]:
        if msg["type"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["type"] == "bot":
            messages.append(AIMessage(content=msg["content"]))
    return messages


async def run_agent(message: str, round_type: str, history: List[Dict]) -> tuple[str, list[str]]:
    """
    Run the interview agent and return (response_text, tools_used).
    """
    executor = get_interview_agent(round_type)
    chat_history = history_to_langchain_messages(history)

    tools_used: list[str] = []

    # We run in a thread executor since LangChain's sync code blocks the event loop
    def _invoke():
        return executor.invoke({
            "input": message,
            "chat_history": chat_history,
        })

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _invoke)

    response = result.get("output", "I'm having trouble responding right now.")

    # Check intermediate steps for tool usage
    for step in result.get("intermediate_steps", []):
        action, _ = step
        if hasattr(action, "tool"):
            tools_used.append(action.tool)

    return response, tools_used


# ─────────────────────────────────────────────
# 2. Multi-Step Evaluation Workflow
# ─────────────────────────────────────────────

async def run_evaluation_workflow(session_id: str, round_type: str, history: List[Dict]) -> Dict[str, Any]:
    """
    Multi-step agentic evaluation pipeline.

    Steps:
    1. Transcript Summariser  – condenses the raw conversation
    2. Technical Evaluator    – scores technical accuracy (0–10)
    3. Soft-Skills Evaluator  – scores communication & clarity (0–10)
    4. Report Generator       – assembles final JSON scorecard
    """
    llm = _get_llm(temperature=0.2)

    # --- Build raw transcript text ---
    transcript_lines = []
    for msg in history:
        role = "Candidate" if msg["type"] == "user" else "AI Interviewer"
        transcript_lines.append(f"{role}: {msg['content']}")
    transcript = "\n".join(transcript_lines)

    if not transcript.strip():
        return {"error": "No conversation to evaluate."}

    # ── Step 1: Summarise ──────────────────────────────────────────────────
    summary_prompt = f"""
You are an interview transcript summariser.
Below is a raw interview transcript. Produce a concise bullet-point summary
(max 200 words) capturing: topics discussed, candidate answers, any errors made,
and key strengths observed.

TRANSCRIPT:
{transcript}

SUMMARY (bullet points):"""

    summary_msg = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: llm.invoke([HumanMessage(content=summary_prompt)])
    )
    summary = summary_msg.content.strip()

    # ── Step 2: Technical Evaluation ─────────────────────────────────────
    tech_prompt = f"""
You are an expert technical interviewer evaluator.
Based on the following transcript summary, provide a JSON object with:
- "technical_score": integer 0–10
- "technical_strengths": list of up to 3 bullet points
- "technical_weaknesses": list of up to 3 bullet points
- "factual_errors": list of specific incorrect statements made by the candidate

Respond ONLY with valid JSON.

SUMMARY:
{summary}"""

    tech_msg = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: llm.invoke([HumanMessage(content=tech_prompt)])
    )
    try:
        raw_tech = tech_msg.content.strip().strip("```json").strip("```").strip()
        tech_eval = json.loads(raw_tech)
    except Exception:
        tech_eval = {"technical_score": 0, "error": "Failed to parse technical evaluation."}

    # ── Step 3: Soft-Skills Evaluation ───────────────────────────────────
    soft_prompt = f"""
You are an expert HR and communication evaluator.
Based on the following transcript summary, provide a JSON object with:
- "communication_score": integer 0–10
- "clarity_score": integer 0–10
- "confidence_score": integer 0–10
- "soft_skill_strengths": list of up to 3 bullet points
- "areas_for_improvement": list of up to 3 bullet points

Respond ONLY with valid JSON.

SUMMARY:
{summary}"""

    soft_msg = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: llm.invoke([HumanMessage(content=soft_prompt)])
    )
    try:
        raw_soft = soft_msg.content.strip().strip("```json").strip("```").strip()
        soft_eval = json.loads(raw_soft)
    except Exception:
        soft_eval = {"communication_score": 0, "error": "Failed to parse soft-skills evaluation."}

    # ── Step 4: Final Scorecard ───────────────────────────────────────────
    overall_score = round(
        (tech_eval.get("technical_score", 0) * 0.6)
        + (soft_eval.get("communication_score", 0) * 0.2)
        + (soft_eval.get("clarity_score", 0) * 0.1)
        + (soft_eval.get("confidence_score", 0) * 0.1),
        1
    )

    verdict = "Strong Hire" if overall_score >= 8 \
        else "Hire" if overall_score >= 6 \
        else "Consider" if overall_score >= 4 \
        else "No Hire"

    scorecard = {
        "session_id": session_id,
        "round_type": round_type,
        "overall_score": overall_score,
        "verdict": verdict,
        "summary": summary,
        "technical_evaluation": tech_eval,
        "soft_skills_evaluation": soft_eval,
        "pipeline_steps": ["Transcript Summariser", "Technical Evaluator", "Soft-Skills Evaluator", "Report Generator"],
    }

    return scorecard
