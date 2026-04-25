import { useState, useEffect, useRef } from 'react'
import { 
  LayoutDashboard, 
  MessageSquare, 
  BookOpen, 
  BarChart3, 
  Settings, 
  LogOut, 
  User,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  CheckCircle2,
  Send,
  Loader2
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'

// --- DATA STATE ---
const EMPTY_SKILLS = []
const EMPTY_HISTORY = []


// --- COMPONENTS ---

function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'interview', icon: MessageSquare, label: 'Interview' },
    { id: 'practice', icon: BookOpen, label: 'Practice' },
    { id: 'reports', icon: BarChart3, label: 'Reports' },
  ]

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <BrainCircuit className="logo-icon" />
        <span>skillgap-ai</span>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
          >
            <item.icon className="nav-icon" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item">
          <Settings className="nav-icon" />
          <span>Settings</span>
        </button>
        <button 
          className="nav-item text-red"
          onClick={() => {
            localStorage.clear()
            window.location.reload()
          }}
        >
          <LogOut className="nav-icon" />
          <span>Reset Session</span>
        </button>

      </div>
    </div>
  )
}

function Dashboard({ userData, onStartInterview, onStartPractice }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="view-container"
    >
      <header className="view-header">
        <div>
          <h1>Welcome back{userData.name ? `, ${userData.name}` : ''} 👋</h1>
          <p className="subtitle">Here's your current proficiency breakdown.</p>
        </div>
        <div className="user-profile">
          <div className="profile-info">
            <span className="profile-name">{userData.title || 'Technical Candidate'}</span>
            <span className="profile-status">{userData.id ? `Candidate ID: ${userData.id}` : 'Session Active'}</span>
          </div>
          <div className="profile-avatar">
            <User />
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Progress Chart */}
        <div className="dashboard-card span-8">
          <div className="card-header">
            <h3>Skill Progression</h3>
            <span className="trend-positive"><TrendingUp size={16} /> +12% this week</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userData.history || EMPTY_HISTORY}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" axisLine={false} tickLine={false} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="url(#lineGradient)" 
                  strokeWidth={4} 
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }} 
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Breakdown */}
        <div className="dashboard-card span-4">
          <h3>Top Skills</h3>
          <div className="skill-list">
            {(userData.skills || EMPTY_SKILLS).map((skill, i) => (
              <div key={i} className="skill-item-detailed">
                <div className="skill-info">
                  <span>{skill.name || skill.skill}</span>
                  <span className="skill-perc">{skill.level || 0}%</span>
                </div>
                <div className="skill-bar-bg">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.level || 50}%` }}
                    className="skill-bar-fill"
                    style={{ background: `linear-gradient(to right, ${skill.color || '#3b82f6'}, #a855f7)` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button className="secondary-button mt-auto">View Detailed Analytics</button>
        </div>

        {/* Action Cards */}
        <div className="dashboard-card span-6 glow-blue clickable" onClick={onStartInterview}>
          <div className="action-icon blue">
            <BrainCircuit size={24} />
          </div>
          <div className="action-content">
            <h4>Live AI Interview</h4>
            <p>Simulate a real technical round with adaptive AI questioning.</p>
          </div>
          <ChevronRight className="action-arrow" />
        </div>

        <div className="dashboard-card span-6 glow-purple clickable" onClick={onStartPractice}>
          <div className="action-icon purple">
            <BookOpen size={24} />
          </div>
          <div className="action-content">
            <h4>Practice Mode (MCQ)</h4>
            <p>Sharpen your knowledge with targeted multiple choice questions.</p>
          </div>
          <ChevronRight className="action-arrow" />
        </div>
      </div>
    </motion.div>
  )
}

function InterviewInterface({ sessionData, onComplete, userData, onUpdatePerformance }) {

  const [messages, setMessages] = useState([
    { 
      role: 'system', 
      content: `Hello ${userData.name || 'Candidate'}! I am your AI Technical Interviewer. I've analyzed your resume and the job description. Let's begin the technical screening.` 
    },
    { 
      role: 'assistant', 
      content: sessionData.first_question,
      score: null,
      feedback: null
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userEntry = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userEntry }])
    setLoading(true)
    setTimeout(() => setIsTyping(true), 500)

    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionData.session_id, answer: userEntry })
      })
      
      if (!res.ok) throw new Error('Evaluation failed')
      
      const data = await res.json()
      
      setTimeout(() => {
        setIsTyping(false)
        if (data.next_question) {
          setMessages(prev => {
            const newMessages = [...prev]
            for (let i = newMessages.length - 1; i >= 0; i--) {
              if (newMessages[i].role === 'user') {
                newMessages[i].score = data.score
                newMessages[i].feedback = data.feedback
                newMessages[i].suggestion = data.suggestion
                newMessages[i].missing = data.missing_keywords
                break
              }
            }

            onUpdatePerformance(data.skill, data.score)
            newMessages.push({ 
              role: 'assistant', 
              content: data.next_question
            })
            return newMessages
          })
        } else {

          setMessages(prev => [...prev, { role: 'assistant', content: "Evaluation Complete! Analyzing results..." }])
          setTimeout(() => onComplete(), 2000)
        }
      }, 1000)
    } catch (err) {
      setIsTyping(false)
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: Could not reach the evaluation engine. Please try again." }])
    } finally {
      setLoading(false)
    }

  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="view-container full-height"
    >
      <div className="interview-layout">
        {/* Left Analytics Panel */}
        <aside className="interview-analytics">
          <div className="dashboard-card full-card">
            <h3>Live Performance</h3>
            <div className="mini-chart">
               <ResponsiveContainer width="100%" height={150}>
                <LineChart data={messages.filter(m => m.score).map((m, i) => ({ i, score: m.score }))}>
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={true} />
                  <YAxis domain={[0, 5]} hide />
                </LineChart>
               </ResponsiveContainer>
            </div>
            
            <div className="skill-progress-list">
              {userData.skills.map((skill, i) => (
                <div key={i} className="skill-mini">
                  <div className="skill-mini-info">
                    <span>{skill.name}</span>
                    <span>{skill.level}%</span>
                  </div>
                  <div className="skill-bar-bg small">
                    <div className="skill-bar-fill" style={{ width: `${skill.level}%`, background: skill.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="live-status mt-auto">
              <div className="status-item">
                <span className="dot pulse-green"></span>
                <span>AI Interviewer Online</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Chat Panel */}
        <main className="interview-chat">
          <div className="chat-window">
            <div className="chat-content">
              {messages.map((m, i) => (
                <div key={i} className={`chat-bubble-wrapper ${m.role}`}>
                  <div className={`chat-bubble ${m.role}`}>
                    {m.role === 'assistant' && <div className="bubble-label">AI Interviewer</div>}
                    {m.role === 'user' && <div className="bubble-label">You</div>}
                    <div className="bubble-text">{m.content}</div>
                    {m.feedback && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="answer-feedback-extended"
                      >
                        <div className="feedback-main">
                          <CheckCircle2 size={14} className="text-green" /> 
                          <span>{m.feedback} (Score: {m.score}/10)</span>
                        </div>
                        {m.missing && m.missing.length > 0 && (
                          <div className="feedback-missing">
                            <strong>Missing:</strong> {m.missing.join(', ')}
                          </div>
                        )}
                        {m.suggestion && (
                          <div className="feedback-suggestion">
                            <strong>Tip:</strong> {m.suggestion}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="chat-bubble-wrapper assistant">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="chat-bubble assistant thinking-glow"
                  >
                    <div className="thinking-dots">
                      <span></span><span></span><span></span>
                    </div>
                    <span className="ml-2">Interviewer is analyzing...</span>
                  </motion.div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            <form onSubmit={handleSend} className="chat-input-area">
              <textarea 
                placeholder="Type your technical response..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
              />
              <button type="submit" className="send-btn" disabled={loading || !input.trim()}>
                <Send size={20} />
              </button>
            </form>
          </div>
        </main>
      </div>
    </motion.div>
  )
}

function PracticeView({ onBack }) {
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/practice/start')
      .then(res => res.json())
      .then(data => {
         setQuestions(data.questions)
         setLoading(false)
      })
  }, [])

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1)
      setSelected(null)
      setResult(null)
    } else {
      onBack()
    }
  }

  if (loading) return <div className="view-container flex-center"><h3>Loading Practice Session...</h3></div>

  const q = questions[currentIdx]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="view-container">
      <div className="practice-header">
        <h1>Practice Mode (MCQ)</h1>
        <button onClick={onBack} className="secondary-button small">Exit</button>
      </div>

      <div className="practice-card dashboard-card">
         <div className="practice-q-meta">
            <span className="badge-purple">{q?.category}</span>
            <span>Question {currentIdx + 1} of {questions.length}</span>
         </div>
         <h2 className="practice-q-text">{q?.question}</h2>

         <div className="practice-options">
            {q?.options.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => !result && setSelected(opt)}
                className={`option-btn ${selected === opt ? 'selected' : ''} ${result && opt === q.answer ? 'correct' : ''} ${result && selected === opt && opt !== q.answer ? 'incorrect' : ''}`}
              >
                {opt}
              </button>
            ))}
         </div>

         {selected && !result && (
           <button onClick={() => setResult(true)} className="primary-button mt-auto">Check Answer</button>
         )}

         {result && (
           <div className="practice-feedback animate-fade-in">
              <p>{selected === q.answer ? "✅ Correct!" : `❌ Incorrect. The answer is ${q.answer}`}</p>
              <button onClick={handleNext} className="secondary-button mt-4">
                {currentIdx < questions.length - 1 ? "Next Question" : "Finish Practice"}
              </button>
           </div>
         )}
      </div>
    </motion.div>
  )
}

function LandingPage({ onStart }) {

  const [resume, setResume] = useState('')
  const [jd, setJd] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: resume, job_description: jd })
      })
      const data = await response.json()
      onStart(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="landing-full animate-fade-in">
      <div className="landing-content">
        <header className="landing-header">
          <div className="logo-large">
            <BrainCircuit size={40} className="logo-icon-anim" />
            <span>skillgap.ai</span>
          </div>
          <p className="hero-text">Bridge your technical gap with AI-powered simulations.</p>
        </header>

        <div className="glass-card landing-card">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Analyze Resume</label>
              <textarea 
                placeholder="Paste your resume text here..."
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                required
              />
            </div>
            
            <div className="input-group">
              <label className="input-label">Job Description</label>
              <textarea 
                placeholder="Paste the target JD..."
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" className="primary-button hero-btn" disabled={loading}>
              {loading ? (
                <span className="loading-spinner">Initializing Engine...</span>
              ) : (
                <>Get Started <ArrowRight size={20} /></>
              )}
            </button>
          </form>
        </div>
      </div>
      
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
    </div>
  )
}

function ReportView({ sessionData, onBack }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/report/${sessionData.session_id}`)
        const data = await res.json()
        setReport(data)
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [sessionData.session_id])

  if (loading) {
    return (
      <div className="view-container flex-center">
        <Loader2 className="spinner-icon large" />
        <h2>Generating your skill performance report...</h2>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="view-container"
    >
      <header className="view-header">
        <h1>Technical Assessment Report</h1>
        <button onClick={onBack} className="secondary-button">Back to Dashboard</button>
      </header>

      {report && (
        <div className="dashboard-grid">
           <div className="dashboard-card span-4 flex-center">
              <div className="overall-score-hero">
                  <div className="score-ring">
                    <span className="score-val">{report.overall_score}</span>
                    <span className="score-max">/10</span>
                  </div>
                  <span className="score-label">Overall Proficiency</span>
                  {report.improvement_pct > 0 && (
                    <div className="momentum-badge">
                      <TrendingUp size={14} /> +{report.improvement_pct}% Momentum
                    </div>
                  )}
              </div>
           </div>


           <div className="dashboard-card span-8">
            <h3>Domain Performance</h3>
            <div className="report-skills-list mt-8">
               {report.skills_report.map((s, i) => (
                 <div key={i} className="report-skill-item">
                    <div className="report-skill-info">
                       <span className="skill-name-large">{s.skill}</span>
                       <span className={`status-badge ${s.status.toLowerCase().replace(' ', '-')}`}>{s.status}</span>
                    </div>
                    <div className="skill-score-bar">
                        <div className="skill-score-fill" style={{ width: `${s.average_score * 10}%` }}></div>
                    </div>
                    <p className="skill-summary-text">{s.feedback_summary}</p>
                 </div>
               ))}
            </div>
          </div>

          <div className="dashboard-card span-12 glow-purple mt-8">
            <div className="card-header">
              <BookOpen className="text-purple" />
              <h3>Personalized Learning Roadmap</h3>
            </div>
            <div className="roadmap-grid">
               {report.roadmap.map((item, i) => (
                 <div key={i} className="roadmap-item">
                    <ChevronRight className="roadmap-icon" />
                    <span>{item}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

    </motion.div>
  )
}

// --- MAIN APP ---

export default function App() {
  const [view, setView] = useState('LANDING') // LANDING, DASHBOARD, INTERVIEW, PRACTICE, REPORT
  const [activeTab, setActiveTab] = useState('dashboard')
  const [session, setSession] = useState(null)
  const [userData, setUserData] = useState({
    name: '',
    title: '',
    id: '',
    skills: EMPTY_SKILLS,
    history: EMPTY_HISTORY
  })

  // Handle successful resume analysis
  const handleStart = (data) => {
    localStorage.setItem("session_id", data.session_id)
    setSession(data)
    setUserData(prev => ({
      ...prev,
      skills: data.extracted_skills.map(s => ({
        name: s.skill,
        level: 30, // Initial detected level
        color: '#3b82f6'
      }))
    }))
    setView('DASHBOARD')
  }

  return (
    <div className="app-shell">
      {view === 'LANDING' ? (
        <LandingPage onStart={handleStart} />
      ) : (
        <div className="app-main">
          <Sidebar 
            activeTab={activeTab === 'interview' ? 'interview' : activeTab} 
            setActiveTab={(tab) => {
              setActiveTab(tab)
              if (tab === 'dashboard' && view !== 'DASHBOARD') setView('DASHBOARD')
            }} 
          />
          <main className="content-area">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && view === 'DASHBOARD' && (
                <Dashboard 
                  userData={userData} 
                  onStartInterview={() => setActiveTab('interview')}
                  onStartPractice={() => setView('PRACTICE')}
                />
              )}
              {activeTab === 'interview' && (
                <InterviewInterface 
                  sessionData={session} 
                  userData={userData}
                  onUpdatePerformance={(skill, score) => {
                    setUserData(prev => ({
                      ...prev,
                      skills: prev.skills.map(s => 
                        s.name === skill 
                          ? { ...s, level: Math.min(100, Math.max(0, s.level + (score - 5) * 4)) }
                          : s
                      )
                    }))
                  }}
                  onComplete={() => setView('REPORT')} 
                />
              )}
              {view === 'PRACTICE' && (
                <PracticeView onBack={() => setView('DASHBOARD')} />
              )}
              {view === 'REPORT' && (
                <ReportView sessionData={session} onBack={() => setView('DASHBOARD')} />
              )}





            </AnimatePresence>
          </main>
        </div>
      )}
    </div>
  )
}
