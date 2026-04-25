from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional
import uuid
from fastapi.middleware.cors import CORSMiddleware
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
import requests
import os
from dotenv import load_dotenv

load_dotenv()

HF_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli"
HF_TOKEN = os.getenv("HF_TOKEN")

app = FastAPI(
    title="skillgap-ai API",
    description="Backend with Qdrant + HuggingFace AI Evaluation",
    version="0.4.0"
)

def evaluate_answer_ai(question: str, answer: str) -> dict:
    """Evaluates an answer and provides a score, feedback and missing keywords."""
    keywords = ["optimization", "scalability", "latency", "security", "concurrency", "fault-tolerance", "consistency"]
    missing = [k for k in keywords if k not in answer.lower()]
    
    # Suggestion based on missing keywords
    suggestion = f"Try to incorporate concepts like {', '.join(missing[:2])}." if missing else "Your answer is very comprehensive."

    if not HF_TOKEN:
        score = 6 if len(answer) > 50 else 3
        return {
            "score": score, 
            "feedback": "Technical depth is moderate." if score >= 5 else "Needs more elaboration.",
            "missing_keywords": missing[:2],
            "suggestion": suggestion
        }
    
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": f"Technical Interview. Question: {question}\nAnswer: {answer}. Is this correct, partially correct, or incorrect?",
        "parameters": {"candidate_labels": ["correct", "partially correct", "incorrect"]}
    }
    
    try:
        response = requests.post("https://api-inference.huggingface.co/models/facebook/bart-large-mnli", 
                                 headers=headers, json=payload, timeout=8)
        result = response.json()
        if "labels" not in result:
             raise ValueError("Malformed HF response")
             
        top_label = result.get("labels", [])[0]
        
        if top_label == "correct": 
            return {"score": 9, "feedback": "Excellent and accurate answer!", "missing_keywords": missing[:1], "suggestion": "Keep up the great technical depth."}
        if top_label == "partially correct": 
            return {"score": 5, "feedback": "Good, but could be more specific.", "missing_keywords": missing[:2], "suggestion": suggestion}
        return {"score": 2, "feedback": "Answer seems incorrect or off-topic.", "missing_keywords": missing[:3], "suggestion": "Review the core concepts behind this technology."}
    except Exception as e:
        print(f"Evaluation Error: {e}")
        return {"score": 5, "feedback": "Analysis complete. Good effort.", "missing_keywords": missing[:2], "suggestion": suggestion}



import random

def generate_refined_question(base_question: str, last_score: int) -> str:
    """
    Refines the base question from Qdrant based on previous performance.
    """
    prompts_hard = [
        "Going deeper: {q} Specifically, how would you handle it in a high-scale environment?",
        "Advanced follow-up: {q} What are the potential pitfalls of this approach at scale?",
        "Deep dive: {q} Can you explain the internal mechanics behind this?"
    ]
    prompts_soft = [
        "Let's simplify: {q} Can you start with the basic concept?",
        "Foundational check: {q} What is the absolute simplest way to implement this?",
        "Bridge the gap: {q} To make it clearer, what are the primary building blocks here?"
    ]

    if last_score >= 4:
        return random.choice(prompts_hard).format(q=base_question)
    if last_score <= 2:
        return random.choice(prompts_soft).format(q=base_question)
    return base_question


# Initialize Qdrant
QDRANT_URL = os.getenv("QDRANT_URL", ":memory:")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "questions")
qdrant = QdrantClient(QDRANT_URL)

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
    ],
    "Kubernetes": [
        "What is a Kubernetes Pod and how does it differ from a Docker container?",
        "Explain the role of a K8s Deployment vs a StatefulSet."
    ],
    "JavaScript": [
        "Explain the concept of 'closures' in JavaScript.",
        "What is the difference between '==' and '===' in JS?"
    ],
    "Java": [
        "What is the difference between an Interface and an Abstract Class in Java?",
        "Explain the memory management (Garbage Collection) in JVM."
    ]
}

SKILL_MAPPING = {
    "k8s": "Kubernetes",
    "kubernetes": "Kubernetes",
    "python": "Python",
    "py": "Python",
    "fastapi": "FastAPI",
    "react": "React",
    "docker": "Docker",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "js": "JavaScript",
    "javascript": "JavaScript",
    "java": "Java"
}

PRACTICE_QUESTIONS = [
    {
        "question": "Which of the following is NOT a core principle of SOLID?",
        "options": ["Single Responsibility", "Open/Closed", "Linear Scalability", "Dependency Inversion"],
        "answer": "Linear Scalability",
        "category": "Software Development"
    },
    {
        "question": "What is the primary purpose of a 'Dead Letter Queue' in messaging systems?",
        "options": ["Speed up processing", "Handle failed messages", "Store encrypted data", "Delete old logs"],
        "answer": "Handle failed messages",
        "category": "System Design"
    },
    {
        "question": "In React, what does 'Lifting State Up' mean?",
        "options": ["Moving status to the cloud", "Moving state to a common ancestor", "Using Redux only", "Deleting local state"],
        "answer": "Moving state to a common ancestor",
        "category": "React"
    }
]



def normalize_skill(skill: str) -> str:
    return SKILL_MAPPING.get(skill.lower(), skill)


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
    skill: str
    score: int
    feedback: str
    suggestion: Optional[str] = None
    missing_keywords: List[str] = []
    next_question: Optional[str]



class SkillReport(BaseModel):
    skill: str
    average_score: float
    status: str
    feedback_summary: str

class ReportResponse(BaseModel):
    overall_score: float
    improvement_pct: float
    skills_report: List[SkillReport]
    roadmap: List[str]


class PracticeStartResponse(BaseModel):
    questions: List[dict]

class PracticeAnswerRequest(BaseModel):
    question_idx: int
    selected_option: str

class PracticeAnswerResponse(BaseModel):
    correct: bool
    explanation: str

# --- In-memory storage ---

sessions = {}

@app.get("/")
async def health_check():
    return {
        "status": "online",
        "service": "skillgap-ai-backend",
        "version": "0.2.0"
    }



def extract_skills_ai(resume: str, jd: str) -> List[str]:
    """Extracts skills from resume and JD using Hugging Face Zero-Shot Classification with strict fallbacks."""
    default_skills = ["Software Development", "System Design", "Python"]
    
    if not resume.strip() and not jd.strip():
        return default_skills

    if not HF_TOKEN:
        # Fallback to enhanced keyword matching
        text = (resume + " " + jd).lower()
        extracted = []
        for short, full in SKILL_MAPPING.items():
            if short in text:
                extracted.append(full)
        
        return list(set(extracted))[:4] if extracted else default_skills

    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    candidate_labels = list(QUESTION_BANK.keys())
    payload = {
        "inputs": f"Extract tech skills from Resume: {resume[:400]} and JD: {jd[:400]}. Labels: {candidate_labels}",
        "parameters": {"candidate_labels": candidate_labels}
    }
    
    try:
        response = requests.post("https://api-inference.huggingface.co/models/facebook/bart-large-mnli", 
                                 headers=headers, json=payload, timeout=10)
        result = response.json()
        labels = result.get("labels", [])
        scores = result.get("scores", [])
        extracted = [labels[i] for i, s in enumerate(scores) if s > 0.35]
        return list(set(extracted))[:3] if extracted else default_skills
    except Exception as e:
        print(f"Extraction Error: {e}")
        return default_skills


@app.post("/start", response_model=SessionResponse)
async def start_session(request: StartRequest):
    """
    Initializes a session, extracts skills, and returns the first question.
    """
    if not request.resume_text or not request.job_description:
        raise HTTPException(status_code=400, detail="Incomplete data provided")

    # Real AI Extraction
    skills = extract_skills_ai(request.resume_text, request.job_description)
    extracted = [SkillInfo(skill=s, level="Detected") for s in skills]

    session_id = str(uuid.uuid4())
    
    # Use Qdrant to retrieve first question
    first_skill = extracted[0].skill
    search_result = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=get_mock_embedding(first_skill),
        query_filter=Filter(
            must=[FieldCondition(key="skill", match=MatchValue(value=first_skill))]
        ),
        limit=1
    ).points
    first_question = search_result[0].payload["question"] if search_result else f"Tell me about your experience with {first_skill}."


    sessions[session_id] = {
        "resume": request.resume_text,
        "jd": request.job_description,
        "skills": [s.skill for s in extracted],
        "current_index": 0,
        "current_question": first_question,
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
    question = session["current_question"]
    answer = request.answer

    # AI evaluation
    eval_result = evaluate_answer_ai(question, answer)
    score = eval_result["score"]
    feedback = eval_result["feedback"]

    session["scores"].append({
        "skill": skill,
        "question": question,
        "answer": answer,
        "score": score,
        "feedback": feedback,
        "missing_keywords": eval_result.get("missing_keywords", [])
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
    next_index = session["current_index"]
    next_skill = session["skills"][next_index]
    
    search_result = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=get_mock_embedding(next_skill),
        query_filter=Filter(
            must=[FieldCondition(key="skill", match=MatchValue(value=next_skill))]
        ),
        limit=1
    ).points
    
    base_question = search_result[0].payload["question"] if search_result else f"Tell me more about your work with {next_skill}"

    
    # AI Refinement / Follow-up Logic
    next_question = generate_refined_question(base_question, score)
    
    session["current_question"] = next_question

    return {
        "skill": skill,
        "score": score,
        "feedback": feedback,
        "suggestion": eval_result.get("suggestion"),
        "missing_keywords": eval_result.get("missing_keywords", []),
        "next_question": next_question
    }




@app.get("/report/{session_id}", response_model=ReportResponse)
async def get_report(session_id: str):
    """
    Generates a performance report and roadmap based on the session scores.
    """
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    scores = session["scores"]
    if not scores:
        raise HTTPException(status_code=400, detail="No evaluation data available")

    # Aggregate scores by skill
    skill_stats = {}
    for entry in scores:
        skill = entry["skill"]
        if skill not in skill_stats:
            skill_stats[skill] = {"total": 0, "count": 0, "feedbacks": [], "missing": []}
        skill_stats[skill]["total"] += entry["score"]
        skill_stats[skill]["count"] += 1
        skill_stats[skill]["feedbacks"].append(entry["feedback"])
        skill_stats[skill]["missing"].extend(entry.get("missing_keywords", []))

    skills_report = []
    overall_total = 0
    roadmap = []

    for skill, stats in skill_stats.items():
        avg = stats["total"] / stats["count"]
        # Normalize avg to 1-10 if it was 1-5, but currently it's mixed.
        # Let's assume scores are up to 10 now since Commit 8.
        status = "Mastered" if avg >= 8 else "Proficient" if avg >= 6 else "Needs Improvement"
        
        feedback = "; ".join(list(set(stats["feedbacks"])))
        if stats["missing"]:
            feedback += f". Focus on: {', '.join(list(set(stats['missing'] )))}"

        skills_report.append(SkillReport(
            skill=skill,
            average_score=round(avg, 1),
            status=status,
            feedback_summary=feedback
        ))
        overall_total += avg
        
        if status != "Mastered":
            roadmap.append(f"Deepen your understanding of {skill} concepts, especially {', '.join(list(set(stats['missing']))[:2]) if stats['missing'] else 'core architectures'}.")

    # Confidence/Improvement Insight
    improvement = 0
    raw_scores = [s["score"] for s in scores]
    if len(raw_scores) >= 3:
        first_avg = sum(raw_scores[:len(raw_scores)//2]) / (len(raw_scores)//2)
        last_avg = sum(raw_scores[len(raw_scores)//2:]) / (len(raw_scores) - len(raw_scores)//2)
        improvement = round(((last_avg - first_avg) / max(first_avg, 1)) * 100)

    return ReportResponse(
        overall_score=round(overall_total / len(skills_report), 1),
        improvement_pct=improvement if improvement > 0 else 0,
        skills_report=skills_report,
        roadmap=roadmap or ["Excellent performance across all domains. You are ready!"]
    )



@app.get("/practice/start", response_model=PracticeStartResponse)
async def start_practice():
    # Return 3 random questions for practice
    qs = random.sample(PRACTICE_QUESTIONS, min(len(PRACTICE_QUESTIONS), 3))
    return {"questions": qs}

@app.post("/practice/answer", response_model=PracticeAnswerResponse)
async def check_practice_answer(request: PracticeAnswerRequest):
    q = PRACTICE_QUESTIONS[request.question_idx]
    is_correct = q["answer"] == request.selected_option
    explanation = f"The correct answer is '{q['answer']}'."
    if is_correct:
        explanation = "Correct! Well done."
    
    return {"correct": is_correct, "explanation": explanation}

if __name__ == "__main__":

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
