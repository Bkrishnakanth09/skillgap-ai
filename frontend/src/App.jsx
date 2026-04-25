import { useState, useEffect, useRef } from 'react'
import { 
  LayoutDashboard, 
  MessageSquare, 
  BookOpen, 
  BarChart3, 
  Settings, 
  LogOut, 
  User as UserIcon,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  CheckCircle2,
  Send,
  Loader2,
  Plus,
  Briefcase
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'

// --- LOGIN SCREEN ---
function LoginScreen({ onLogin }) {
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', age: 25 })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/user/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const user = await res.json()
      onLogin(user)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="landing-full">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card landing-card">
        <div className="logo-large">
          <BrainCircuit size={40} className="text-blue" />
          <span>skillgap.ai</span>
        </div>
        <h2 className="mb-6">Create your technical profile</h2>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-row">
            <div className="input-group">
              <label>First Name</label>
              <input required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Last Name</label>
              <input required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
            </div>
          </div>
          <div className="input-group">
            <label>Email Address</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Age</label>
            <input type="number" required value={formData.age} onChange={e => setFormData({...formData, age: parseInt(e.target.value)})} />
          </div>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? <Loader2 className="spinner" /> : "Step into Dashboard"}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

// --- PROJECT SELECTOR ---
function ProjectSelector({ projects, selectedId, onSelect, onCreate }) {
  return (
    <div className="project-selector-container">
      <select value={selectedId || ''} onChange={(e) => onSelect(e.target.value)} className="project-dropdown">
        <option value="" disabled>Select active project...</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <button onClick={onCreate} className="icon-button-small" title="New Project">
        <Plus size={18} />
      </button>
    </div>
  )
}

// --- NEW PROJECT MODAL ---
function NewProjectModal({ userId, onClose, onCreated }) {
  const [formData, setFormData] = useState({ name: '', jd_text: '', resume_text: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/project/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user_id: userId })
      })
      const project = await res.json()
      onCreated(project)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card modal-content">
        <h3>Create New Career Project</h3>
        <p className="text-muted mb-4">A project links a specific Job Description to your Resume.</p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Project Name (e.g. Backend at Amazon)</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Job Description</label>
            <textarea required value={formData.jd_text} onChange={e => setFormData({...formData, jd_text: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Your Resume</label>
            <textarea required value={formData.resume_text} onChange={e => setFormData({...formData, resume_text: e.target.value})} />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="secondary-button">Cancel</button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="spinner-icon" />
                  <span>Analyzing Resume Intelligence...</span>
                </>
              ) : "Create Project"}
            </button>

          </div>
        </form>
      </motion.div>
    </div>
  )
}

// --- INTERVIEW SETUP MODAL ---
function InterviewSetupModal({ onStart, onClose }) {
  const [config, setConfig] = useState({ num_questions: 5, mode: 'Mixed' })

  return (
    <div className="modal-overlay">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card modal-content miniature">
        <h3>Interview Configuration</h3>
        <div className="input-group">
          <label>Number of Questions</label>
          <select value={config.num_questions} onChange={e => setConfig({...config, num_questions: parseInt(e.target.value)})}>
            <option value={5}>5 Questions (Fast)</option>
            <option value={10}>10 Questions (Standard)</option>
            <option value={20}>20 Questions (Deep Dive)</option>
          </select>
        </div>
        <div className="input-group">
          <label>Difficulty Mode</label>
          <div className="button-group">
            {['Mixed', 'MCQ', 'Descriptive'].map(m => (
              <button 
                key={m} 
                className={`mode-toggle ${config.mode === m ? 'active' : ''}`}
                onClick={() => setConfig({...config, mode: m})}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="secondary-button">Cancel</button>
          <button onClick={() => onStart(config)} className="primary-button">Start Session</button>
        </div>
      </motion.div>
    </div>
  )
}

// --- MAIN COMPONENTS ---

function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <BrainCircuit size={24} className="text-blue" />
        <span>skillgap-ai</span>
      </div>
      <nav className="sidebar-nav">
        <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>
        <button className={`nav-item ${activeTab === 'interview' ? 'active' : ''}`} onClick={() => setActiveTab('interview')}>
          <MessageSquare size={20} />
          <span>Interview</span>
        </button>
        <button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
          <BarChart3 size={20} />
          <span>Reports</span>
        </button>
      </nav>
      <div className="sidebar-footer">
        <div className="user-mini">
          <div className="avatar">{user?.first_name[0]}{user?.last_name[0]}</div>
          <div className="info">
            <span className="name">{user?.first_name}</span>
            <span className="email">{user?.email}</span>
          </div>
          <LogOut size={18} className="logout-trigger" onClick={onLogout} />
        </div>
      </div>
    </div>
  )
}

function Dashboard({ project, report, onStart }) {
  if (!project) return (
    <div className="flex-center full-height empty-state">
      <Briefcase size={64} className="text-muted mb-4" />
      <h2>No Active Project</h2>
      <p>Create or select a project from the top bar to begin.</p>
    </div>
  )

  const skills = JSON.parse(project.extracted_skills || '[]')
  const scores = report?.skill_scores || {}

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="view-container">
      <header className="view-header">
        <div>
          <div className="status-badge-mini mb-2">Project Active</div>
          <h1>{project.name}</h1>
          <p className="text-muted">Targeting skills from the uploaded Job Description.</p>
        </div>
        <div className="dashboard-stats">
          <div className="stat-card">
            <span className="label">Learning Velocity</span>
            <span className="value">{(report?.overall_score || 0) > 0 ? '+12%' : '0%'}</span>
          </div>
        </div>
      </header>


      <div className="dashboard-grid">
        <div className="dashboard-card span-8">
          <h3>Progress Trend</h3>
          <div className="chart-placeholder">
            {Object.keys(scores).length > 0 ? (
               <ResponsiveContainer width="100%" height={250}>
                 <LineChart data={Object.entries(scores).map(([s, sc], i) => ({ name: s, score: sc }))}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                   <XAxis dataKey="name" stroke="#64748b" />
                   <YAxis hide />
                   <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} />
                 </LineChart>
               </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Take an interview to see data</div>
            )}
          </div>
        </div>

        <div className="dashboard-card span-4">
          <h3>Target Skills</h3>
          <div className="skill-list-prod">
            {skills.map(s => (
              <div key={s} className="skill-row-prod">
                <div className="label">
                  <span>{s}</span>
                  <span>{scores[s] ? `${Math.round(scores[s] * 10)}%` : '0%'}</span>
                </div>
                <div className="bar-bg">
                  <div className="bar-fill" style={{ width: `${(scores[s] || 0) * 10}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <button className="primary-button mt-auto" onClick={onStart}>Start Training Interview</button>
        </div>
      </div>
    </motion.div>
  )
}

function InterviewView({ sessionId, onComplete }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatRef = useRef(null)

  useEffect(() => {
     // Fetch initial question if needed or handle start
  }, [sessionId])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    const text = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    
    try {
      const res = await fetch('/api/interview/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, user_answer: text })
      })
      const data = await res.json()
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.next_question || "Interview complete!",
        eval: data.evaluation
      }])
      
      if (data.status === 'completed') {
        setTimeout(onComplete, 3000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="interview-prod">
      <div className="chat-window-prod" ref={chatRef}>
        <div className="msg-row assistant">
          <div className="msg-bubble">
            Hello! I'm your AI Interviewer. I've analyzed your project context. Let's begin the evaluation.
          </div>
        </div>
        {messages.map((m, i) => (
          <div key={i} className={`msg-row ${m.role}`}>
             <div className="msg-bubble">
               <div className="m-text">{m.content}</div>
               {m.eval && (
                 <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="m-eval">
                    <div className="eval-badge">Provisional Score: {m.eval.score}/10</div>
                    <p className="feedback-text">{m.eval.feedback}</p>
                    {m.eval.missing_keywords.length > 0 && <div className="keywords"><strong>Keywords to focus: </strong>{m.eval.missing_keywords.join(', ')}</div>}
                    <div className="tips"><strong>Tip: </strong>{m.eval.improvement_tips}</div>
                 </motion.div>
               )}
             </div>
          </div>
        ))}
        {loading && (
          <div className="msg-row assistant">
            <div className="msg-bubble thinking-bubble">
              <Loader2 className="spinner-icon" />
              <span>Evaluating response intelligence...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="chat-input-prod">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Enter your response..." />
        <button type="submit"><Send size={20} /></button>
      </form>
    </div>
  )
}

function ReportView({ project, report }) {
  if (!report || report.overall_score === 0) return (
     <div className="flex-center full-height">
        <h3>No data available. Complete an interview to generate a report.</h3>
     </div>
  )

  return (
    <div className="view-container animate-fade-in">
      <h1>Performance Report: {project.name}</h1>
      <div className="report-hero dashboard-card">
         <div className="score-ring-large">
            <span>{report.overall_score}</span>
            <small>/10 Overall</small>
         </div>
      </div>
      <div className="report-sections mt-6">
         <div className="dashboard-card">
            <h3>Skill Strength</h3>
            {Object.entries(report.skill_scores).map(([s, sc]) => (
              <div key={s} className="skill-score-row">
                 <span>{s}</span>
                 <div className="bar"><div className="fill" style={{width: `${sc*10}%`}}></div></div>
              </div>
            ))}
         </div>
         <div className="dashboard-card mt-6">
            <h3>Learning Roadmap</h3>
            <ul className="roadmap-list">
              {report.roadmap.map((item, i) => <li key={i}><TrendingUp size={16} /> {item}</li>)}
            </ul>
         </div>
      </div>
    </div>
  )
}

// --- MAIN APP COMPONENT ---

export default function App() {
  const [user, setUser] = useState(null)
  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [report, setReport] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [appView, setAppView] = useState('MAIN') // MAIN, INTERVIEW
  const [sessionId, setSessionId] = useState(null)
  
  const [showNewProject, setShowNewProject] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [loading, setLoading] = useState(true)

  // Restore User
  useEffect(() => {
    const savedUser = localStorage.getItem('skillgap_user')
    if (savedUser) {
      const u = JSON.parse(savedUser)
      setUser(u)
      fetchProjects(u.id)
    }
    setLoading(false)
  }, [])

  const fetchProjects = async (uid) => {
    const res = await fetch(`/api/projects/${uid}`)
    const data = await res.json()
    setProjects(data)
    if (data.length > 0) setActiveProjectId(data[0].id)
  }

  const fetchReport = async (pid) => {
    const res = await fetch(`/api/report/${pid}`)
    const data = await res.json()
    setReport(data)
  }

  useEffect(() => {
    if (activeProjectId) fetchReport(activeProjectId)
  }, [activeProjectId])

  const handleLogin = (u) => {
    setUser(u)
    localStorage.setItem('skillgap_user', JSON.stringify(u))
    fetchProjects(u.id)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('skillgap_user')
    setProjects([])
    setActiveProjectId(null)
  }

  const startInterview = async (config) => {
    setShowSetup(false)
    const res = await fetch('/api/interview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: activeProjectId, ...config })
    })
    const data = await res.json()
    setSessionId(data.session_id)
    setAppView('INTERVIEW')
  }

  if (loading) return <div className="loading-screen"><Loader2 className="spinner" /></div>
  if (!user) return <LoginScreen onLogin={handleLogin} />

  const activeProject = projects.find(p => p.id === activeProjectId)

  return (
    <div className="app-shell">
      <Sidebar user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      <div className="app-main">
        <header className="top-bar">
          <ProjectSelector 
            projects={projects} 
            selectedId={activeProjectId} 
            onSelect={setActiveProjectId} 
            onCreate={() => setShowNewProject(true)} 
          />
        </header>

        <main className="content-area">
          <AnimatePresence mode="wait">
            {appView === 'INTERVIEW' ? (
              <InterviewView sessionId={sessionId} onComplete={() => { setAppView('MAIN'); fetchReport(activeProjectId); }} />
            ) : (
              <>
                {activeTab === 'dashboard' && <Dashboard project={activeProject} report={report} onStart={() => setShowSetup(true)} />}
                {activeTab === 'reports' && <ReportView project={activeProject} report={report} />}
              </>
            )}
          </AnimatePresence>
        </main>
      </div>

      {showNewProject && (
        <NewProjectModal 
          userId={user.id} 
          onClose={() => setShowNewProject(false)} 
          onCreated={(p) => { setProjects([...projects, p]); setActiveProjectId(p.id); setShowNewProject(false); }} 
        />
      )}

      {showSetup && (
        <InterviewSetupModal 
          onClose={() => setShowSetup(false)} 
          onStart={startInterview} 
        />
      )}
    </div>
  )
}
