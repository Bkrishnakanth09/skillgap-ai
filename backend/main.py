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
from sqlalchemy import create_engine, Column, String, Integer, Float, Text, ForeignKey, DateTime, Boolean
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
from dotenv import load_dotenv
import requests

load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")
HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.2"

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    age = Column(Integer)
    projects = relationship("Project", back_populates="owner")

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String)
    jd_text = Column(Text)
    extracted_skills = Column(Text) # JSON string
    owner = relationship("User", back_populates="projects")
    sessions = relationship("InterviewSession", back_populates="project")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"))
    total_questions = Column(Integer)
    score = Column(Float, default=0.0)
    status = Column(String, default="active") # active, completed
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="sessions")
    questions = relationship("Question", back_populates="session")
    mentor_summary = Column(Text)
    skill_gap_score = Column(Float, default=0.0)

class Question(Base):
    __tablename__ = "questions"
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("interview_sessions.id"))
    question_text = Column(Text)
    type = Column(String) # mcq/text
    skill = Column(String)
    order = Column(Integer)
    session = relationship("InterviewSession", back_populates="questions")
    answer = relationship("Answer", back_populates="question", uselist=False)

class Answer(Base):
    __tablename__ = "answers"
    id = Column(String, primary_key=True, index=True)
    question_id = Column(String, ForeignKey("questions.id"))
    user_answer = Column(Text)
    ai_score = Column(Integer)
    missing_keywords = Column(Text) # JSON string
    ideal_answer = Column(Text)
    feedback = Column(Text)
    verdict = Column(String)
    depth = Column(String) # Basic, Proficient, Expert
    confidence = Column(Float)
    improvement_tip = Column(Text)
    question = relationship("Question", back_populates="answer")

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
if QDRANT_URL == ":memory:":
    qdrant = QdrantClient(":memory:")
else:
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

def extract_skills_ai(jd: str) -> List[str]:
    candidate_labels = ["Python", "React", "Docker", "FastAPI", "PostgreSQL", "System Design", "AWS", "Kubernetes", "Redis", "Kafka"]
    if not HF_TOKEN:
         return [label for label in candidate_labels if label.lower() in jd.lower()]
    
    prompt = f"Extract the top 5 technical skills required for this job description. Return ONLY a comma-separated list from this set: {candidate_labels}. JD: {jd[:1000]}"
    raw = call_hf_api(prompt)
    if raw:
        extracted = [s.strip() for s in raw.split(",") if s.strip() in candidate_labels]
        if extracted: return extracted
        
    return [label for label in candidate_labels if label.lower() in jd.lower()]

def generate_questions_ai(jd: str, skills: List[str], count: int) -> List[dict]:
    if HF_TOKEN:
        prompt = f"Generate {count} technical interview questions for a candidate based on this JD: {jd[:1000]} and skills: {skills}. Return ONLY valid JSON: [{{ \"question_text\": \"...\", \"skill\": \"...\", \"type\": \"text\" }}]. Ensure the 'skill' field is one of: {skills}."
        raw = call_hf_api(prompt)
        if raw:
            parsed = safe_parse_json(raw)
            if parsed and isinstance(parsed, list):
                for i, q in enumerate(parsed): q["order"] = i
                return parsed[:count]
    
    questions = []
    # In a real production app, we would use an LLM (GPT-4/Claude) to generate these.
    # For this implementation, we'll use our enhanced bank and select based on skills.
    bank = {
        "Python": [
            "What is the difference between a list and a tuple in Python?",
            "Explain Python's Global Interpreter Lock (GIL).",
            "How do context managers work and what is the 'with' statement?",
            "Explain decorators in Python and provide a use case."
        ],
        "React": [
            "What are the differences between functional and class components?",
            "Explain the virtual DOM and its reconciliation process.",
            "How does the useEffect hook work and when does it run?",
            "What is React Context and when should you use it over Redux?"
        ],
        "System Design": [
            "How do you design a rate limiter for a distributed system?",
            "Explain the CAP theorem and its implications.",
            "Describe the differences between SQL and NoSQL databases.",
            "How would you handle horizontal scaling for a high-traffic web application?"
        ],
        "FastAPI": [
            "What is Pydantic and how does FastAPI use it for validation?",
            "Explain the difference between 'def' and 'async def' in FastAPI endpoints.",
            "How does dependency injection work in FastAPI?",
            "What are background tasks in FastAPI and how are they implemented?"
        ]
    }
    
    selected_skills = skills if skills else ["Python", "System Design"]
    for i in range(count):
        skill = selected_skills[i % len(selected_skills)]
        q_list = bank.get(skill, bank["Python"])
        q_text = random.choice(q_list)
        questions.append({
            "question_text": q_text,
            "type": "text",
            "skill": skill,
            "order": i
        })
    return questions


# --- APP ---
app = FastAPI(title="Skillgap AI Production")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    age: int

class ProjectCreate(BaseModel):
    user_id: str
    title: str
    jd_text: str

class InterviewStart(BaseModel):
    project_id: str
    num_questions: int = 5

class AnswerSubmit(BaseModel):
    session_id: str
    question_id: str
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
    skills = extract_skills_ai(data.jd_text)
    project = Project(
        id=str(uuid.uuid4()),
        user_id=data.user_id,
        title=data.title,
        jd_text=data.jd_text,
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
        total_questions=data.num_questions,
        status="active"
    )
    db.add(session)
    
    # Generate and store ALL questions upfront
    skills = json.loads(project.extracted_skills)
    questions_data = generate_questions_ai(project.jd_text, skills, data.num_questions)
    
    db_questions = []
    for q in questions_data:
        db_q = Question(
            id=str(uuid.uuid4()),
            session_id=session.id,
            question_text=q["question_text"],
            type=q["type"],
            skill=q["skill"],
            order=q["order"]
        )
        db.add(db_q)
        db_questions.append(db_q)
    
    db.commit()
    db.refresh(session)
    
    first_q = db_questions[0]
    return {
        "session_id": session.id,
        "first_question": {
            "id": first_q.id,
            "text": first_q.question_text,
            "skill": first_q.skill
        }
    }

@app.post("/interview/answer")
def submit_answer(data: AnswerSubmit, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == data.question_id).first()
    if not question: raise HTTPException(status_code=404, detail="Question not found")
    
    session = question.session
    eval_result = evaluate_answer_ai(question.question_text, data.user_answer)
    
    # Store answer immediately
    ans = Answer(
        id=str(uuid.uuid4()),
        question_id=data.question_id,
        user_answer=data.user_answer,
        ai_score=eval_result["score"],
        missing_keywords=json.dumps(eval_result["missing_keywords"]),
        ideal_answer=eval_result["ideal_answer"],
        feedback=eval_result["feedback"],
        verdict=eval_result["verdict"],
        depth=eval_result["depth"],
        confidence=eval_result["confidence"],
        improvement_tip=eval_result["improvement_tip"]
    )
    db.add(ans)
    
    # Adaptive Probing Follow-up
    if eval_result["depth"] == "Basic" and eval_result["missing_keywords"]:
        probing_text = f"That's a solid start, but can you elaborate on {eval_result['missing_keywords'][0]}? Specifically, how does it handle technical edge cases in a production environment?"
        next_q = Question(
            id=str(uuid.uuid4()),
            session_id=session.id,
            skill=question.skill,
            question_text=probing_text,
            order=question.order + 1,
            type="descriptive"
        )
        # Shift others
        for lq in session.questions:
            if lq.order > question.order: lq.order += 1
        db.add(next_q)
    else:
        # Standard flow
        next_q = db.query(Question).filter(
            Question.session_id == session.id,
            Question.order > question.order
        ).order_by(Question.order).first()
    
    if not next_q:
        db.commit()
        db.refresh(session)
        
        # Recalculate score with full history
        answers = db.query(Answer).join(Question).filter(Question.session_id == session.id).all()
        if answers:
            session.score = sum(a.ai_score for a in answers) / len(answers)
            session.skill_gap_score = (session.score / 10) * 100
            
            # Mentor Summary
            strongest = max(answers, key=lambda x: x.ai_score).question.skill
            weakest = min(answers, key=lambda x: x.ai_score).question.skill
            session.mentor_summary = f"You demonstrated strong depth in {strongest}, but your grasp of {weakest} appears surface-level. To move from Proficient to Expert, focus on understanding {weakest} internals and distributed edge cases."
            
        db.commit()
        return {"status": "completed", "evaluation": eval_result}
    
    db.commit()
    return {
        "status": "ongoing",
        "evaluation": eval_result,
        "next_question": {
            "id": next_q.id,
            "text": next_q.question_text,
            "skill": next_q.skill
        }
    }

import statistics

@app.get("/session/{session_id}/progress")
def get_session_progress(session_id: str, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    
    answered = db.query(Answer).join(Question).filter(Question.session_id == session_id).count()
    total = session.total_questions
    
    return {
        "answered": answered,
        "total": total,
        "next_question_index": answered,
        "status": session.status
    }

# --- LLM CORE ---

def call_hf_api(prompt: str):
    if not HF_TOKEN:
        return None
    url = f"https://api-inference.huggingface.co/models/{HF_MODEL}"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 500, "temperature": 0.4}
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code == 200:
            res = response.json()
            # HF sometimes returns a list of results
            return res[0]["generated_text"] if isinstance(res, list) else res.get("generated_text")
        return None
    except Exception as e:
        print(f"LLM Error: {e}")
        return None

def safe_parse_json(text: str):
    try:
        # Mistral often explains things before/after JSON
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end != -1:
            return json.loads(text[start:end])
        return None
    except:
        return None

def evaluate_answer_ai(question: str, answer: str) -> dict:
    prompt = f"""
You are a senior technical interviewer. Evaluate the following answer.

Question: {question}
Candidate Answer: {answer}

Return STRICT JSON ONLY:
{{
  "score": integer (0-10),
  "verdict": "one concise sentence evaluation",
  "depth": "Basic" | "Proficient" | "Expert",
  "confidence": float (0-1),
  "strengths": ["list"],
  "missing_keywords": ["list technical concepts missed"],
  "ideal_answer": "concise ideal response",
  "feedback": "structured 1. 2. 3. format feedback",
  "improvement_tip": "mentor advice"
}}
"""
    raw_output = call_hf_api(prompt)
    if raw_output:
        parsed = safe_parse_json(raw_output)
        if parsed and "score" in parsed:
            # Ensure missing_keywords is actually a list
            if "missing_concepts" in parsed and "missing_keywords" not in parsed:
                parsed["missing_keywords"] = parsed["missing_concepts"]
            return parsed
            
    # --- FALLBACK DETERMINISTIC LOGIC ---
    keywords_map = {
        "list": ["immutable", "memory", "overhead", "indexing", "dynamic"],
        "tuple": ["immutable", "fixed", "hashable", "memory", "structure"],
        "GIL": ["thread-safe", "concurrency", "multiprocessing", "execution", "mutex"],
        "DOM": ["diffing", "render", "efficiency", "reconciliation", "virtual"],
        "rate limiter": ["token bucket", "leaky bucket", "fixed window", "distributed", "redis"],
        "CAP": ["consistency", "availability", "partition tolerance", "trade-off"],
        "async": ["event loop", "non-blocking", "concurrency", "io-bound", "await"],
        "FastAPI": ["pydantic", "di", "dependency injection", "schema", "validation"],
        "React": ["hooks", "state", "props", "component", "render"]
    }
    
    missing = []
    found = []
    for key, related in keywords_map.items():
        if key.lower() in question.lower():
            for r in related:
                if r.lower() in answer.lower(): found.append(r)
                else: missing.append(r)
            break

    # Intelligent Scoring
    total_expected = len(found) + len(missing)
    if total_expected == 0:
        score = 5
        depth = "Basic"
        confidence = 0.5
    else:
        ratio = len(found) / total_expected
        score = int(ratio * 10)
        if len(answer) > 200: score += 1
        
        if score >= 8: depth = "Expert"
        elif score >= 5: depth = "Proficient"
        else: depth = "Basic"
        
        confidence = 0.8 if len(answer) > 50 else 0.4
    
    score = min(10, max(1, score))
    
    verdicts = {
        (9, 11): "Exceptional clarity, deep conceptual understanding.",
        (7, 9): "Strong practical knowledge with minor gaps.",
        (4, 7): "Surface-level understanding, needs more depth.",
        (0, 4): "Significant conceptual gaps detected."
    }
    verdict = next((v for range_, v in verdicts.items() if range_[0] <= score < range_[1]), "Needs Review")

    # Mentor-mode tips based on missing keywords
    topic = next((k for k in keywords_map if k.lower() in question.lower()), "this topic")
    tips = {
        "list": "Focus on the internal implementation of dynamic arrays and amortized O(1) complexity.",
        "GIL": "Deep dive into the difference between CPU-bound and I/O-bound tasks in Python.",
        "React": "Study the reconciliation algorithm and how Fiber enables concurrent rendering.",
        "FastAPI": "Explore how Pydantic's internal validation tree works compared to manual validation."
    }

    formatted_feedback = f"""
1. **What you did right**: {verdict} You successfully identified the importance of {found[0] if found else 'technical communication'}.
2. **What you missed**: You lacked detail in {' and '.join(missing[:2]) if missing else 'nothing major'}.
3. **What to improve**: Your response was {depth}. {tips.get(topic, "Focus on explaining the 'why' behind the implementation, not just the 'what'.")}
"""
    
    result = {
        "score": score,
        "verdict": verdict,
        "depth": depth,
        "confidence": confidence,
        "strengths": found if found else ["Technical Comm"],
        "missing_keywords": missing[:3],
        "ideal_answer": "An ideal response provides a formal definition, explains the internal mechanism, and discusses real-world trade-offs.",
        "feedback": formatted_feedback.strip(),
        "improvement_tip": tips.get(topic, "Focus on explaining the 'why' behind the implementation, not just the 'what'.")
    }
    return result

@app.get("/session/{session_id}/full")
def get_full_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    
    history = []
    for q in sorted(session.questions, key=lambda x: x.order):
        history.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "skill": q.skill,
            "user_answer": q.answer.user_answer if q.answer else None,
            "ai_score": q.answer.ai_score if q.answer else None,
            "verdict": q.answer.verdict if q.answer else None,
            "depth": q.answer.depth if q.answer else None,
            "confidence": q.answer.confidence if q.answer else None,
            "improvement_tip": q.answer.improvement_tip if q.answer else None,
            "feedback": q.answer.feedback if q.answer else None,
            "missing_keywords": json.loads(q.answer.missing_keywords) if q.answer else [],
            "ideal_answer": q.answer.ideal_answer if q.answer else None
        })
    
    return {
        "id": session.id,
        "score": session.score,
        "skill_gap_score": session.skill_gap_score,
        "mentor_summary": session.mentor_summary,
        "history": history
    }
    
@app.get("/session/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    answered = db.query(Answer).join(Question).filter(Question.session_id == session_id).count()
    return {
        "id": session.id,
        "status": session.status,
        "score": session.score,
        "total_questions": session.total_questions,
        "answered_count": answered
    }

@app.get("/history/{project_id}")
def get_project_history(project_id: str, db: Session = Depends(get_db)):
    sessions = db.query(InterviewSession).filter(InterviewSession.project_id == project_id).order_by(InterviewSession.created_at.desc()).all()
    return [{
        "id": s.id,
        "score": s.score,
        "status": s.status,
        "created_at": s.created_at,
        "total_questions": s.total_questions
    } for s in sessions]

@app.get("/dashboard/stats/{project_id}")
def get_dashboard_stats(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    
    all_sessions = db.query(InterviewSession).filter(InterviewSession.project_id == project_id).all()
    
    if not all_sessions:
        return {
            "velocity": "0%", 
            "learning_insight": "No data yet. Start your first session to begin the gap analysis.",
            "skill_scores": {}, 
            "weak_areas": [], 
            "progress_graph": [],
            "consistency": "N/A",
            "most_improved": "N/A",
            "weakest_domain": "N/A"
        }
    
    completed_sessions = [s for s in all_sessions if s.status == 'completed']
    scores = [s.score for s in completed_sessions]
    avg_score = sum(scores)/len(scores) if scores else 0
    consistency = round(100 - (statistics.stdev(scores) * 10) if len(scores) > 1 else 100, 0)
    
    skill_map = {}
    missing_freq = {}
    
    for s in all_sessions:
        for q in s.questions:
            if q.answer:
                skill_map.setdefault(q.skill, []).append(q.answer.ai_score)
                keywords = json.loads(q.answer.missing_keywords)
                for k in keywords: missing_freq[k] = missing_freq.get(k, 0) + 1

    skill_scores = {s: round(sum(v)/len(v), 1) for s, v in skill_map.items()}
    weakest = min(skill_scores.items(), key=lambda x: x[1])[0] if skill_scores else "N/A"
    most_improved = max(skill_scores.items(), key=lambda x: x[1])[0] if skill_scores else "N/A"
    
    # story-driven insights
    trend = "improving" if sum(scores[-2:])/2 > sum(scores[:-2])/max(1, len(scores)-2) else "stagnant" if scores else "starting"
    
    learning_insight = f"Your performance in {most_improved} is {trend}. "
    if weakest != "N/A":
        learning_insight += f"However, you should prioritize {weakest} fundamentals as frequent concept gaps are dragging down your consistency."
    else:
        learning_insight += "Keep maintaining this breadth of knowledge across all domains."

    return {
        "velocity": f"{consistency}%",
        "skill_scores": skill_scores,
        "weak_areas": [w[0] for w in sorted(missing_freq.items(), key=lambda x: x[1], reverse=True)[:3]],
        "consistency": f"{consistency}%",
        "weakest_domain": weakest,
        "most_improved": most_improved,
        "learning_insight": learning_insight,
        "progress_graph": [{"date": s.created_at.strftime("%m/%d"), "score": s.score} for s in all_sessions[-10:]]
    }

@app.get("/report/roadmap/{project_id}")
def get_roadmap(project_id: str, db: Session = Depends(get_db)):
    # Simple logic for roadmap based on project history
    sessions = db.query(InterviewSession).filter(InterviewSession.project_id == project_id).all()
    missing_keywords = []
    for s in sessions:
        for q in s.questions:
            if q.answer:
                missing_keywords.extend(json.loads(q.answer.missing_keywords))
    
    weak_topics = list(set(missing_keywords[:10]))
    if not weak_topics:
        return ["Focus on advanced system design patterns.", "Implement a high-scale microservices project.", "Deep dive into performance profiling tools."]
    
    roadmap = [f"Week 1: Foundations of {weak_topics[0]} and {weak_topics[1] if len(weak_topics)>1 else 'related concepts'}."]
    roadmap.append(f"Week 2: Advanced practice with {weak_topics[2] if len(weak_topics)>2 else 'core architecture'}.")
    roadmap.append("Week 3: Integration and full-scale mock interviews.")
    return roadmap

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
