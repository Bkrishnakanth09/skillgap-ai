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
  const [formData, setFormData] = useState({ name: '', email: '', age: 25 })
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
          <div className="input-group">
            <label>Full Name</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="John Doe" />
          </div>
          <div className="input-group">
            <label>Email Address</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" />
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
          <option key={p.id} value={p.id}>{p.title}</option>
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
  const [formData, setFormData] = useState({ title: '', jd_text: '' })
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
        <p className="text-muted mb-4">A project targets a specific Job Description to generate tailored interviews.</p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Project Title (e.g. Senior Backend at Google)</label>
            <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Project Alpha" />
          </div>
          <div className="input-group">
            <label>Job Description</label>
            <textarea required value={formData.jd_text} onChange={e => setFormData({...formData, jd_text: e.target.value})} placeholder="Paste the JD here..." />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="secondary-button">Cancel</button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="spinner-icon" />
                  <span>Extracting Skills Intelligence...</span>
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

function Sidebar({ activeTab, setActiveTab, setAppView, user, onLogout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <BrainCircuit size={24} className="text-blue" />
        <span>skillgap-ai</span>
      </div>
      <nav className="sidebar-nav">
        <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setAppView && setAppView('MAIN'); }}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>
        <button className={`nav-item ${activeTab === 'interview' ? 'active' : ''}`} onClick={() => { setActiveTab('interview'); setAppView && setAppView('MAIN'); }}>
          <MessageSquare size={20} />
          <span>Interview</span>
        </button>
        <button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => { setActiveTab('reports'); setAppView && setAppView('MAIN'); }}>
          <BarChart3 size={20} />
          <span>Reports</span>
        </button>
      </nav>
      <div className="sidebar-footer">
        <div className="user-mini">
          <div className="avatar">{user?.name ? user.name[0]?.toUpperCase() : 'U'}</div>
          <div className="info">
            <span className="info-name">{user?.name || 'Technical User'}</span>
            <span className="info-email">{user?.email || 'N/A'}</span>
          </div>
          <LogOut size={18} className="logout-trigger" onClick={onLogout} />
        </div>
      </div>
    </div>
  )
}


function InterviewView({ sessionId, onComplete }) {
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const chatRef = useRef(null)

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  const fetchSession = async () => {
    const res = await fetch(`/api/session/${sessionId}/full`)
    const data = await res.json()
    setSession(data)
    
    const initialMessages = []
    let activeQuestionFound = false
    
    for (const h of data.history) {
      if (activeQuestionFound) break
      
      const parsedMissing = Array.isArray(h.missing_keywords) ? h.missing_keywords : 
                           (typeof h.missing_keywords === 'string' ? JSON.parse(h.missing_keywords) : [])

      initialMessages.push({ role: 'assistant', content: h.question_text, isQuestion: true, skill: h.skill })
      
      if (h.user_answer) {
        initialMessages.push({ 
          role: 'user', 
          content: h.user_answer,
          eval: {
            score: h.ai_score,
            feedback: h.feedback,
            missing_keywords: parsedMissing,
            ideal_answer: h.ideal_answer,
            depth: h.depth,
            improvement_tip: h.improvement_tip
          }
        })
      } else {
        activeQuestionFound = true
      }
    }
    
    setMessages(initialMessages)
    setLoading(false)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading || !sessionId) return
    
    const unanswered = session.history.find(h => !h.user_answer)
    if (!unanswered) return

    const text = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    
    try {
      const res = await fetch('/api/interview/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId, 
          question_id: unanswered.question_id, 
          user_answer: text 
        })
      })
      const data = await res.json()
      
      // Update state once from response to ensure perfect sync
      const latestRes = await fetch(`/api/session/${sessionId}/full`)
      const latestData = await latestRes.json()
      setSession(latestData)
      
      if (data.status === 'completed') {
        setMessages(prev => [...prev, { role: 'assistant', content: "Interview cycle complete. Analyzing final performance..." }])
        setTimeout(() => onComplete(sessionId), 3000)
      } else {
        // Find the newly active message thread
        const newHist = []
        let stop = false
        for (const h of latestData.history) {
           if (stop) break
           newHist.push({ role: 'assistant', content: h.question_text, isQuestion: true, skill: h.skill })
           if (h.user_answer) {
              const pm = Array.isArray(h.missing_keywords) ? h.missing_keywords : 
                         (typeof h.missing_keywords === 'string' ? JSON.parse(h.missing_keywords) : [])
              newHist.push({ 
                role: 'user', 
                content: h.user_answer,
                eval: { ...h, missing_keywords: pm }
              })
           } else {
              stop = true
           }
        }
        setMessages(newHist)
      }
    } catch (err) {
      console.error("Submission failed:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="interview-prod animate-fade-in">
      <div className="chat-window-prod" ref={chatRef}>
        <div className="msg-row assistant">
          <div className="msg-bubble">
            Hello! I'm your AI Interviewer. I've prepared a technical assessment for you. Let's begin.
          </div>
        </div>
        {messages.map((m, i) => (
          <div key={i} className={`msg-row ${m.role}`}>
             <div className="msg-bubble">
               {m.skill && <div className="skill-tag">{m.skill}</div>}
               <div className="m-text">{m.content}</div>
               {m.eval && (
                 <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="m-eval detailed">
                    <div className="eval-header-pro">
                       <div className="eh-left">
                          <span className="eb-score">Score: {m.eval.score}/10</span>
                          <span className={`eb-depth depth-${m.eval.depth?.toLowerCase()}`}>{m.eval.depth}</span>
                       </div>
                    </div>
                    <p className="feedback-text">{m.eval.feedback}</p>
                    
                    {m.eval.missing_keywords?.length > 0 && (
                      <div className="eval-block red">
                        <div className="block-label">❌ MISSING CONCEPTS</div>
                        <div className="keywords-grid">
                           {m.eval.missing_keywords.map(k => <span key={k} className="k-badge">{k}</span>)}
                        </div>
                      </div>
                    )}
                    
                    <div className="eval-block green">
                      <div className="block-label">✅ IDEAL RESPONSE</div>
                      <p className="ideal-text">{m.eval.ideal_answer}</p>
                    </div>

                    <div className="eval-block blue">
                      <div className="block-label">💡 MENTOR TIP</div>
                      <p className="feedback-text-small">{m.eval.feedback}</p>
                    </div>
                 </motion.div>
               )}
             </div>
          </div>
        ))}
        {loading && (
          <div className="msg-row assistant">
            <div className="msg-bubble thinking-bubble">
              <Loader2 className="spinner-icon" />
              <span>Analyzing technical depth...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="chat-input-prod">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Explain your approach..." />
        <button type="submit" disabled={loading}><Send size={20} /></button>
      </form>
    </div>
  )
}

function HistoryView({ project, onOpen }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (project) fetchHistory()
  }, [project])

  const fetchHistory = async () => {
    const res = await fetch(`/api/history/${project.id}`)
    const data = await res.json()
    setHistory(data)
    setLoading(false)
  }

  if (loading) return <div className="flex-center py-12"><Loader2 className="spinner" /></div>

  return (
    <div className="view-container animate-fade-in">
      <div className="flex-between mb-6">
         <h1>Interview History</h1>
         <span className="text-muted">{history.length} Sessions detected</span>
      </div>
      <div className="history-list">
         {history.length > 0 ? history.map(s => (
           <div key={s.id} className="glass-card history-item" onClick={() => onOpen(s.id)}>
              <div className="h-left">
                 <div className="h-date">{new Date(s.created_at).toLocaleDateString()}</div>
                 <div className="h-status">{s.status === 'completed' ? 'Completed' : 'In Progress'}</div>
              </div>
              <div className="h-right">
                 <div className="h-score">{s.score ? `${(s.score).toFixed(1)}/10` : '...' }</div>
                 <ChevronRight size={20} />
              </div>
           </div>
         )) : (
           <div className="empty-state py-12 flex-center">
              <MessageSquare size={48} className="text-muted mb-4" />
              <p>No history for this project yet.</p>
           </div>
         )}
      </div>
    </div>
  )
}

function Dashboard({ project, stats, onStart, onResume }) {
  if (!project) return <div>Loading project...</div>

  return (
    <div className="view-container animate-fade-in">
      <header className="view-header">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, Developer</h1>
          <p className="text-muted">You're tracking progress for <span className="text-primary font-bold">{project.title}</span></p>
        </div>
        <div className="flex gap-4">
          <button onClick={onResume} className="secondary-button">Resume Last Session</button>
          <button onClick={onStart} className="primary-button"><Plus size={18} /> New Technical Interview</button>
        </div>
      </header>

      <div className="dashboard-grid">
         {/* Advanced Analytics */}
         <div className="dashboard-card span-8">
            <div className="flex-between mb-6">
               <h3>Technical Growth Trend</h3>
               <div className="stat-pill">Accuracy: {stats?.velocity}</div>
            </div>

            <div className="learning-insight-box mb-6">
               <div className="li-header">
                  <BrainCircuit size={18} />
                  <span>Compass Learning Insight</span>
               </div>
               <p className="li-text">{stats?.learning_insight}</p>
            </div>

            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer>
                <LineChart data={stats?.progress_graph}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
         </div>

         <div className="dashboard-card span-4">
            <h3>Judge Insights</h3>
            <div className="flex flex-col gap-6 mt-4">
               <div className="insight-row">
                  <div className="label">Most Improved Skill</div>
                  <div className="value-box blue">{stats?.most_improved}</div>
               </div>
               <div className="insight-row">
                  <div className="label">Weakest technical domain</div>
                  <div className="value-box red">{stats?.weakest_domain}</div>
               </div>
               <div className="insight-row">
                  <div className="label">Consistency Score</div>
                  <div className="value-box green">{stats?.consistency}</div>
               </div>
            </div>
         </div>

         <div className="dashboard-card span-4 highlight-card">
            <BrainCircuit size={32} className="mb-4 text-primary" />
            <h3>Top 3 Repeated Mistakes</h3>
            <div className="mistake-list mt-2">
               {stats?.weak_areas?.map((w, i) => (
                 <div key={i} className="mistake-item">
                    <span className="m-idx">{i+1}</span>
                    <span className="m-text">Lacks depth in {w}</span>
                 </div>
               ))}
            </div>
         </div>

         <div className="dashboard-card span-8">
            <h3>Skill Proficiency Map</h3>
            <div className="topic-grid">
               {stats && Object.entries(stats.skill_scores).map(([s, sc]) => (
                 <div key={s} className="topic-card">
                    <div className="flex-between mb-1">
                       <span className="t-name">{s}</span>
                       <span className="t-val">{Math.round(sc * 10)}%</span>
                    </div>
                    <div className="t-bar-bg"><div className="t-bar-fill" style={{width: `${sc*10}%`}}></div></div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  )
}

function ReportView({ project, stats, roadmap, sessionId }) {
  const [sessionDetails, setSessionDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (sessionId) fetchSessionDetails()
  }, [sessionId])

  const fetchSessionDetails = async () => {
    setLoading(true)
    const res = await fetch(`/api/session/${sessionId}/full`)
    const data = await res.json()
    setSessionDetails(data)
    setLoading(false)
  }

  if (!stats || !project) return (
     <div className="flex-center full-height py-20">
        <Loader2 className="spinner mb-4" />
        <h3>Synthesizing Technical Performance Data...</h3>
     </div>
  )

  if (sessionId && !sessionDetails && loading) return (
    <div className="flex-center full-height">
       <Loader2 className="spinner" />
    </div>
  )

  return (
    <div className="view-container animate-fade-in">
      <header className="view-header">
        <div>
          <h1>Performance Map: {project.title}</h1>
          <p className="text-muted">Aggregated data & detailed session insights.</p>
        </div>
      </header>

      <div className="report-grid">
          <div className="dashboard-card span-4 flex-center score-focus">
            <div className="score-circle highlight">
               <span className="sc-val">{sessionDetails ? (sessionDetails.skill_gap_score || 0).toFixed(0) : 0}%</span>
               <span className="sc-label">Skill Gap Match</span>
            </div>
          </div>
          
          <div className="dashboard-card span-8 mentor-card">
             <div className="flex items-center gap-3 mb-4">
                <BrainCircuit className="text-primary" size={28} />
                <h3>AI Mentor Summary</h3>
             </div>
             <p className="mentor-text">{sessionDetails?.mentor_summary || "Complete an interview to receive a mentor-grade evaluation of your technical persona."}</p>
             <div className="mt-4 flex gap-4">
                <div className="m-stat">
                   <span className="ms-label">Confidence</span>
                   <span className="ms-value text-blue">High Range</span>
                </div>
                <div className="m-stat">
                   <span className="ms-label">Depth</span>
                   <span className="ms-value text-green">Analytical</span>
                </div>
             </div>
          </div>

         {sessionDetails && sessionDetails.history.some(h => h.user_answer) ? (
           <div className="dashboard-card span-12 mt-6">
              <h3>Detailed Session Breakdown</h3>
              <div className="session-thread-mini">
                 {sessionDetails.history.map((h, i) => h.user_answer && (
                   <div key={i} className="mini-turn">
                      <div className="flex-between mb-2">
                         <div className="mt-q">Q: {h.question_text}</div>
                         <div className="eb-status">{h.verdict}</div>
                      </div>
                      <div className="mt-a">Your Answer: "{h.user_answer}"</div>
                      <div className="mt-eval">
                         <span className="eb-score">Score: {h.ai_score}/10</span>
                         <p className="feedback-text-small">{h.feedback}</p>
                         {h.missing_keywords?.length > 0 && <div className="k-mini">Gaps: {h.missing_keywords.join(', ')}</div>}
                      </div>
                   </div>
                 ))}
              </div>
           </div>
         ) : sessionId && (
           <div className="dashboard-card span-12 mt-6 flex-center py-10">
              <p className="text-muted">Session incomplete. No detailed answers recorded yet.</p>
           </div>
         )}
         
         <div className="dashboard-card span-6 mt-6">
            <h3>Technical Gap Analysis</h3>
            <p className="text-muted mb-4">Core concepts frequently missed in recent sessions.</p>
            <div className="gap-list">
               {stats.weak_areas?.map(w => (
                 <div key={w} className="gap-item">
                    <CheckCircle2 size={16} className="text-red" />
                    <span>{w}</span>
                 </div>
               ))}
            </div>
         </div>

         <div className="dashboard-card span-6 mt-6">
            <h3>Adaptive Learning Roadmap</h3>
            <div className="roadmap-flow">
               {roadmap?.map((step, i) => (
                 <div key={i} className="roadmap-step">
                    <div className="rs-icon"><TrendingUp size={16} /></div>
                    <div className="rs-text">{step}</div>
                 </div>
               ))}
            </div>
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
  const [stats, setStats] = useState(null)
  const [roadmap, setRoadmap] = useState([])
  
  const [activeTab, setActiveTab] = useState('dashboard')
  const [appView, setAppView] = useState('MAIN') // MAIN, INTERVIEW
  const [sessionId, setSessionId] = useState(null)
  
  const [showNewProject, setShowNewProject] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [loading, setLoading] = useState(true)

  // Restore User
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('skillgap_user')
      if (savedUser) {
        const u = JSON.parse(savedUser)
        setUser(u)
        fetchProjects(u.id)
      }
    } catch (e) {
      console.error("Localstorage recovery failed", e)
    }
    setLoading(false)
  }, [])

  const fetchProjects = async (uid) => {
    const res = await fetch(`/api/projects/${uid}`)
    const data = await res.json()
    setProjects(data)
    if (data.length > 0) {
      const savedPid = localStorage.getItem('skillgap_active_pid')
      const exists = data.find(p => p.id === savedPid)
      setActiveProjectId(exists ? savedPid : data[0].id)
    }
  }

  const fetchStats = async (pid) => {
    if (!user || !pid) return
    try {
      const [statsRes, roadmapRes] = await Promise.all([
        fetch(`/api/dashboard/stats/${pid}`),
        fetch(`/api/report/roadmap/${pid}`)
      ])
      if (statsRes.ok) setStats(await statsRes.json())
      if (roadmapRes.ok) setRoadmap(await roadmapRes.json())
    } catch (e) {
      console.error("Stats fetch failed", e)
    }
  }

  useEffect(() => {
    if (activeProjectId && user) {
      localStorage.setItem('skillgap_active_pid', activeProjectId)
      fetchStats(activeProjectId)
    }
  }, [activeProjectId, user])

  const handleLogin = (u) => {
    setUser(u)
    localStorage.setItem('skillgap_user', JSON.stringify(u))
    fetchProjects(u.id)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('skillgap_user')
    localStorage.removeItem('skillgap_active_pid')
    setProjects([])
    setActiveProjectId(null)
    setSessionId(null)
    setAppView('MAIN')
  }

  const handleProjectSelect = (pid) => {
    setActiveProjectId(pid)
    setSessionId(null)
    setAppView('MAIN')
    setActiveTab('dashboard')
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

  const resumeLastSession = async () => {
    const res = await fetch(`/api/history/${activeProjectId}`)
    const history = await res.json()
    const lastSession = history.find(s => s.status === 'active')
    if (lastSession) {
       setSessionId(lastSession.id)
       setAppView('INTERVIEW')
    } else {
       setShowSetup(true)
    }
  }

  const openPastSession = (sid) => {
    setSessionId(sid)
    setAppView('INTERVIEW')
  }

  const onInterviewComplete = (sid) => {
    setSessionId(sid)
    setAppView('MAIN')
    setActiveTab('reports')
    fetchStats(activeProjectId)
  }

  if (loading) return <div className="loading-screen"><Loader2 className="spinner" /></div>
  if (!user) return <LoginScreen onLogin={handleLogin} />

  const activeProject = projects.find(p => p.id === activeProjectId)

  return (
    <div className="app-shell">
      <Sidebar user={user} activeTab={activeTab} setActiveTab={setActiveTab} setAppView={setAppView} onLogout={handleLogout} />
      
      <div className="app-main">
        <header className="top-bar">
          <ProjectSelector 
            projects={projects} 
            selectedId={activeProjectId} 
            onSelect={handleProjectSelect} 
            onCreate={() => setShowNewProject(true)} 
          />
        </header>

        <main className="content-area">
          <AnimatePresence mode="wait">
            {appView === 'INTERVIEW' ? (
              <InterviewView sessionId={sessionId} onComplete={onInterviewComplete} />
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <Dashboard 
                    project={activeProject} 
                    stats={stats} 
                    onStart={() => setShowSetup(true)} 
                    onResume={resumeLastSession}
                  />
                )}
                {activeTab === 'interview' && <HistoryView project={activeProject} onOpen={openPastSession} />}
                {activeTab === 'reports' && (
                  <ReportView 
                    project={activeProject} 
                    stats={stats} 
                    roadmap={roadmap} 
                    sessionId={sessionId} 
                  />
                )}
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
