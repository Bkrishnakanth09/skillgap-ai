import os
import uuid
import json
import random
import requests
from datetime import datetime
from typing import List, Optional, Dict

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_column, create_engine, Column, String, Integer, Float, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

load_dotenv()

# --- DATABASE SETUP ---
DATABASE_URL = "sqlite:///./skillgap.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, index=True)
    age = Column(Integer)
    projects = relationship("Project", back_populates="owner")

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String)
    jd_text = Column(Text)
    resume_text = Column(Text)
    extracted_skills = Column(Text) # JSON string
    owner = relationship("User", back_populates="projects")
    sessions = relationship("InterviewSession", back_populates="project")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"))
    status = Column(String) # active, completed
    config = Column(Text) # JSON string (num_questions, mode)
    current_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="sessions")
    answers = relationship("Answer", back_populates="session")

class Answer(Base):
    __tablename__ = "answers"
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("interview_sessions.id"))
    skill = Column(String)
    question = Column(Text)
    user_answer = Column(Text)
    ai_feedback = Column(Text)
    score = Column(Integer)
    missing_keywords = Column(Text) # JSON string
    improvement_tips = Column(Text)
    session = relationship("InterviewSession", back_populates="answers")

Base.metadata.create_all(bind=engine)

# --- DEPENDENCIES ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- AI & EXTERNAL SERVICES ---
HF_TOKEN = os.getenv("HF_TOKEN")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
qdrant = QdrantClient(url=QDRANT_URL)

QUESTION_BANK = {
    "Python": [
        "What is the difference between a list and a tuple in Python?",
        "Explain Python's Global Interpreter Lock (GIL).",
        "How do context managers work in Python?"
    ],
    "React": [
        "What are the differences between functional and class components?",
        "Explain the virtual DOM and its benefits.",
        "How does the useEffect hook work?"
    ],
    "Docker": [
        "What is a Docker image vs a container?",
        "Explain Docker Compose and its use cases.",
        "How do Docker volumes provide persistence?"
    ],
    "FastAPI": [
        "What is Pydantic and how is it used in FastAPI?",
        "Explain how asynchronous endpoints work in FastAPI.",
        "How do you handle dependency injection in FastAPI?"
    ]
}

def extract_skills_ai(resume: str, jd: str) -> List[str]:
    candidate_labels = list(QUESTION_BANK.keys())
    if not HF_TOKEN:
         return [label for label in candidate_labels if label.lower() in (resume + jd).lower()]
    
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": f"Resume: {resume[:400]} Job: {jd[:400]}",
        "parameters": {"candidate_labels": candidate_labels}
    }
    try:
        res = requests.post("https://api-inference.huggingface.co/models/facebook/bart-large-mnli", headers=headers, json=payload, timeout=10)
        data = res.json()
        return [data['labels'][i] for i, s in enumerate(data['scores']) if s > 0.4]
    except:
        return [label for label in candidate_labels if label.lower() in (resume + jd).lower()]

def evaluate_answer_ai(question: str, answer: str) -> dict:
    keywords = ["optimization", "scalability", "complexity", "best practices", "architecture"]
    missing = [k for k in keywords if k not in answer.lower()]
    
    if not HF_TOKEN:
        score = 7 if len(answer) > 50 else 3
        return {
            "score": score,
            "feedback": "Analysis based on length and keyword density.",
            "missing_keywords": missing[:2],
            "improvement_tips": f"Consider discussing {missing[0]} for more depth." if missing else "Continue building on this depth."
        }
    
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": f"Q: {question} A: {answer}",
        "parameters": {"candidate_labels": ["correct", "partially correct", "incorrect"]}
    }
    try:
        res = requests.post("https://api-inference.huggingface.co/models/facebook/bart-large-mnli", headers=headers, json=payload, timeout=10)
        labels = res.json().get('labels', [])
        top = labels[0] if labels else "unknown"
        mapping = {"correct": 9, "partially correct": 5, "incorrect": 2}
        score = mapping.get(top, 5)
        return {
            "score": score,
            "feedback": f"Response categorized as {top}.",
            "missing_keywords": missing[:2],
            "improvement_tips": f"Focus on {missing[0]} to improve your answer." if missing else "Great technical detail!"
        }
    except:
        score = 6 if len(answer) > 60 else 4
        return {
            "score": score,
            "feedback": "Basic evaluation applied.",
            "missing_keywords": missing[:1],
            "improvement_tips": "Focus on breaking down complex requirements into modular components."
        }

# --- APP ---
app = FastAPI(title="Skillgap AI Production")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    age: int

class ProjectCreate(BaseModel):
    user_id: str
    name: str
    jd_text: str
    resume_text: str

class InterviewStart(BaseModel):
    project_id: str
    num_questions: int = 5
    mode: str = "Mixed"

class AnswerSubmit(BaseModel):
    session_id: str
    user_answer: str

@app.post("/user/create")
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing: return existing
    user = User(id=str(uuid.uuid4()), **data.dict())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.get("/users/{email}")
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/project/create")
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    skills = extract_skills_ai(data.resume_text, data.jd_text)
    project = Project(
        id=str(uuid.uuid4()),
        user_id=data.user_id,
        name=data.name,
        jd_text=data.jd_text,
        resume_text=data.resume_text,
        extracted_skills=json.dumps(skills)
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@app.get("/projects/{user_id}")
def list_projects(user_id: str, db: Session = Depends(get_db)):
    return db.query(Project).filter(Project.user_id == user_id).all()

@app.post("/interview/start")
def start_interview(data: InterviewStart, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    
    session = InterviewSession(
        id=str(uuid.uuid4()),
        project_id=data.project_id,
        status="active",
        config=json.dumps({"num_questions": data.num_questions, "mode": data.mode})
    )
    db.add(session)
    db.commit()
    
    skills = json.loads(project.extracted_skills)
    first_skill = skills[0] if skills else "Python"
    question = random.choice(QUESTION_BANK.get(first_skill, QUESTION_BANK["Python"]))
    
    return {
        "session_id": session.id,
        "question": question,
        "skill": first_skill
    }

@app.post("/interview/answer")
def submit_answer(data: AnswerSubmit, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == data.session_id).first()
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    
    project = session.project
    skills = json.loads(project.extracted_skills)
    config = json.loads(session.config)
    
    current_skill = skills[session.current_index % len(skills)]
    
    # We need the question that was asked. In a real prod app we'd store it.
    # For now, we'll assume it was the last one or pass it. 
    # Let's add 'current_question' to session soon.
    eval_result = evaluate_answer_ai("the technical question", data.user_answer)
    
    ans = Answer(
        id=str(uuid.uuid4()),
        session_id=data.session_id,
        skill=current_skill,
        question="the technical question", # Placeholder
        user_answer=data.user_answer,
        ai_feedback=eval_result["feedback"],
        score=eval_result["score"],
        missing_keywords=json.dumps(eval_result["missing_keywords"]),
        improvement_tips=eval_result["improvement_tips"]
    )
    db.add(ans)
    
    session.current_index += 1
    if session.current_index >= config["num_questions"]:
        session.status = "completed"
        db.commit()
        return {"status": "completed", "evaluation": eval_result}
    
    db.commit()
    
    next_skill = skills[session.current_index % len(skills)]
    next_q = random.choice(QUESTION_BANK.get(next_skill, QUESTION_BANK["Python"]))
    
    return {
        "status": "active",
        "evaluation": eval_result,
        "next_question": next_q,
        "next_skill": next_skill
    }

@app.get("/report/{project_id}")
def get_report(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    
    sessions = db.query(InterviewSession).filter(InterviewSession.project_id == project_id).all()
    all_answers = []
    for s in sessions:
        all_answers.extend(s.answers)
    
    if not all_answers:
        return {"overall_score": 0, "breakdown": {}, "weak_areas": [], "roadmap": []}
    
    overall_score = sum(a.score for a in all_answers) / len(all_answers)
    
    breakdown = {}
    for a in all_answers:
        if a.skill not in breakdown:
            breakdown[a.skill] = []
        breakdown[a.skill].append(a.score)
    
    roadmap = []
    if weak_areas:
        roadmap.append(f"Week 1: Foundations of {weak_areas[0]} - deep dive into core principles.")
        if len(weak_areas) > 1:
            roadmap.append(f"Week 2: Advanced {weak_areas[1]} - focus on architecture and optimization.")
        else:
            roadmap.append(f"Week 2: Implementation - build a prototype using {weak_areas[0]}.")
        roadmap.append("Week 3: Mock interviews and system design practice.")
    else:
        roadmap = [
            "Week 1: Performance optimization for existing stack.",
            "Week 2: System design and scaling strategies.",
            "Week 3: Advanced architect certification track."
        ]
    
    return {
        "overall_score": round(overall_score, 1),
        "skill_scores": skill_scores,
        "weak_areas": weak_areas,
        "roadmap": roadmap
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
