from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional
import uuid
from fastapi.middleware.cors import CORSMiddleware
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

app = FastAPI(
    title="skillgap-ai API",
    description="Backend with Qdrant vector retrieval",
    version="0.3.0"
)

# Initialize Qdrant in-memory
qdrant = QdrantClient(":memory:")
COLLECTION_NAME = "questions"

# Simple mock embedding
def get_mock_embedding(text: str) -> List[float]:
    vals = [ord(c) / 100 for c in text[:4].ljust(4, ' ')]
    return vals

@app.on_event("startup")
async def seed_qdrant():
    qdrant.recreate_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=4, distance=Distance.COSINE),
    )
    points = []
    idx = 1
    for skill, questions in QUESTION_BANK.items():
        for q in questions:
            points.append(PointStruct(
                id=idx,
                vector=get_mock_embedding(skill),
                payload={"skill": skill, "question": q}
            ))
            idx += 1
    qdrant.upsert(collection_name=COLLECTION_NAME, points=points)

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

class ReportResponse(BaseModel):
    overall_score: float
    skills_summary: List[dict]
    roadmap: List[str]

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
    
    # Use Qdrant to retrieve first question
    first_skill = extracted[0].skill
    search_result = qdrant.search(
        collection_name=COLLECTION_NAME,
        query_vector=get_mock_embedding(first_skill),
        limit=1
    )
    first_question = search_result[0].payload["question"] if search_result else "What is your experience with " + first_skill + "?"

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
    answer = request.answer

    # Improved scoring logic (rule-based with feedback)
    score = 5 if len(answer) > 40 else 3 if len(answer) > 15 else 1
    feedback = "Detailed and well-articulated." if score == 5 else "Good, but could use more technical depth." if score == 3 else "Response is too brief."

    session["scores"].append({
        "skill": skill,
        "score": score,
        "feedback": feedback
    })

    # move to next question
    session["current_index"] += 1

    if session["current_index"] >= len(session["skills"]):
        return {
            "score": score,
            "feedback": feedback,
            "next_question": None
        }

    # Search Qdrant for next question
    search_result = qdrant.search(
        collection_name=COLLECTION_NAME,
        query_vector=get_mock_embedding(next_skill),
        limit=1
    )
    next_question = search_result[0].payload["question"] if search_result else "Tell me more about your work with " + next_skill

    return {
        "score": score,
        "feedback": feedback,
        "next_question": next_question
    }

@app.get("/report/{session_id}")
async def get_report(session_id: str):
    """
    Returns the final evaluation report.
    """
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "overall_score": 0.0,
        "skills_summary": [],
        "roadmap": ["Complete the interview to see your roadmap"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
