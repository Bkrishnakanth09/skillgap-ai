from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional
import uuid
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="skillgap-ai API",
    description="Backend for AI-powered skill evaluation and roadmap generation",
    version="0.2.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static Data ---
QUESTION_BANK = {
    "Python": [
        "What are Python decorators and when would you use them?",
        "Explain the difference between a list and a tuple in Python."
    ],
    "FastAPI": [
        "What are the benefits of using Pydantic in FastAPI?",
        "Explain how Dependency Injection works in FastAPI."
    ],
    "React": [
        "What is the Virtual DOM and how does React use it to optimize rendering?",
        "Explain the difference between Functional and Class components."
    ],
    "Docker": [
        "What is a Docker image and how does it differ from a container?",
        "Explain the concept of multi-stage builds in Docker."
    ],
    "TypeScript": [
        "What are the advantages of using Interfaces vs Types in TypeScript?",
        "Explain 'Generics' in TypeScript with a simple example."
    ],
    "Software Development": [
        "Describe the Solid principles in Object-Oriented Design.",
        "What is the difference between REST and GraphQL?"
    ]
}

# --- Models ---
class StartRequest(BaseModel):
    resume_text: str
    job_description: str

class SkillInfo(BaseModel):
    skill: str
    level: str

class SessionResponse(BaseModel):
    session_id: str
    extracted_skills: List[SkillInfo]
    first_question: str

class AnswerRequest(BaseModel):
    session_id: str
    answer: str

class AnswerResponse(BaseModel):
    score: int
    feedback: str
    next_question: Optional[str]

# --- In-memory storage ---
sessions = {}

@app.get("/")
async def health_check():
    return {
        "status": "online",
        "service": "skillgap-ai-backend",
        "version": "0.2.0"
    }

@app.post("/start", response_model=SessionResponse)
async def start_session(request: StartRequest):
    """
    Initializes a session, extracts skills, and returns the first question.
    """
    if not request.resume_text or not request.job_description:
        raise HTTPException(status_code=400, detail="Incomplete data provided")

    # Simulation: Extract skills from resume
    available_tech = list(QUESTION_BANK.keys())
    extracted = []
    
    resume_lower = request.resume_text.lower()
    for tech in available_tech:
        if tech.lower() in resume_lower:
            extracted.append(SkillInfo(skill=tech, level="Detected"))

    if not extracted:
        extracted = [SkillInfo(skill="Software Development", level="Detected")]

    session_id = str(uuid.uuid4())
    
    # Get first question
    first_skill = extracted[0].skill
    first_question = QUESTION_BANK.get(first_skill, QUESTION_BANK["Software Development"])[0]

    sessions[session_id] = {
        "resume": request.resume_text,
        "jd": request.job_description,
        "skills": [s.skill for s in extracted],
        "current_index": 0,
        "scores": []
    }

    return SessionResponse(
        session_id=session_id, 
        extracted_skills=extracted,
        first_question=first_question
    )

@app.post("/answer", response_model=AnswerResponse)
async def submit_answer(request: AnswerRequest):
    """
    Evaluates an answer and provides the next question.
    """
    session_id = request.session_id
    session = sessions.get(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    current_index = session["current_index"]
    skill = session["skills"][current_index]

    # Simple placeholder scoring logic
    score = 5 if len(request.answer) > 20 else 2
    feedback = "Great depth!" if score == 5 else "Try to provide more details."

    session["scores"].append({
        "skill": skill,
        "score": score
    })

    # Progress to next question/skill
    session["current_index"] += 1
    
    next_question = None
    if session["current_index"] < len(session["skills"]):
        next_skill = session["skills"][session["current_index"]]
        next_question = QUESTION_BANK.get(next_skill, QUESTION_BANK["Software Development"])[0]

    return AnswerResponse(
        score=score,
        feedback=feedback,
        next_question=next_question
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
