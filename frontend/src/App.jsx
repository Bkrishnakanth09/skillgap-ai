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
        <button className="nav-item text-red">
          <LogOut className="nav-icon" />
          <span>Logout</span>
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

function InterviewInterface({ sessionData, onComplete, userData }) {
  const [messages, setMessages] = useState([{ 
    role: 'assistant', 
    content: sessionData.first_question,
    score: null,
    feedback: null
  }])
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
          setMessages(prev => [
            ...prev, 
            { 
              role: 'assistant', 
              content: data.next_question,
              score: data.score,
              feedback: data.feedback
            }
          ])
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
                    {m.content}
                    {m.feedback && (
                      <div className="answer-feedback">
                        <CheckCircle2 size={12} /> {m.feedback} (Score: {m.score}/5)
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="chat-bubble-wrapper assistant">
                  <div className="chat-bubble assistant typing">
                    <Loader2 className="spinner-icon" /> AI is evaluating...
                  </div>
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
                  onComplete={() => setView('REPORT')} 
                />
              )}
              {view === 'REPORT' && (
                <div className="view-container">
                    <h1>Report View</h1>
                    <button onClick={() => setView('DASHBOARD')}>Back to Dashboard</button>
                </div>
              )}
            </AnimatePresence>
          </main>
        </div>
      )}
    </div>
  )
}
