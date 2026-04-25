from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="skillgap-ai API",
    description="Backend for AI-powered skill evaluation and roadmap generation",
    version="0.1.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# --- In-memory storage (to be replaced with redis/database later) ---
sessions = {}

@app.get("/")
async def health_check():
    return {
        "status": "online",
        "service": "skillgap-ai-backend",
        "version": "0.1.0"
    }

@app.post("/start", response_model=SessionResponse)
async def start_session(request: StartRequest):
    """
    Initializes a session by extracting skills from the provided Resume and JD.
    """
    if not request.resume_text or not request.job_description:
        raise HTTPException(status_code=400, detail="Incomplete data provided")

    # Mock Skill Extraction Logic
    # We simulate AI extraction for now
    available_tech = ["React", "FastAPI", "Python", "Docker", "TypeScript", "SQL", "AWS", "GraphQL"]
    extracted = []
    
    # Case-insensitive matching for simulation
    resume_lower = request.resume_text.lower()
    for tech in available_tech:
        if tech.lower() in resume_lower:
            extracted.append(SkillInfo(skill=tech, level="Detected"))

    # Fallback if no skills detected
    if not extracted:
        extracted = [SkillInfo(skill="Software Development", level="Detected")]

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "resume": request.resume_text,
        "jd": request.job_description,
        "skills": extracted,
        "current_step": 0,
        "scores": {}
    }

    return SessionResponse(session_id=session_id, extracted_skills=extracted)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
