import { useState, useEffect, useRef } from 'react'

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
    <div className="premium-container animate-fade-in">
      <h1>skillgap-ai</h1>
      <p className="subtitle">AI-powered skill evaluation. Bridge the gap to your dream role.</p>
      
      <div className="glass-card">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Your Resume Content</label>
            <textarea 
              placeholder="Paste your resume..."
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
          
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Initializing...' : 'Start Technical Evaluation'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ChatInterface({ session_id, first_question, onComplete }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: first_question }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  useEffect(scrollToBottom, [messages, isTyping])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    
    setTimeout(() => setIsTyping(true), 600)

    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, answer: userMsg })
      })
      const data = await res.json()

      setTimeout(() => {
        setIsTyping(false)
        if (data.next_question) {
          setMessages(prev => [...prev, { role: 'assistant', content: data.next_question }])
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: "Thank you! Generating your report..." }])
          setTimeout(() => onComplete(), 2000)
        }
      }, 1000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="premium-container animate-fade-in">
      <div className="glass-card" style={{ height: '80vh', display: 'flex', flexDirection: 'column', maxWidth: '800px' }}>
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: '1rem', textAlign: m.role === 'user' ? 'right' : 'left' }}>
              <div style={{ 
                display: 'inline-block', 
                padding: '0.8rem 1.2rem', 
                borderRadius: '16px', 
                background: m.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: 'white',
                maxWidth: '85%'
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {isTyping && <div className="typing-indicator" style={{ color: '#94a3b8' }}>Bot is thinking</div>}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
          <textarea 
            placeholder="Type your answer..."
            style={{ minHeight: '60px', height: '60px' }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="primary-button" style={{ width: 'auto', padding: '0 1.5rem', marginTop: 0 }} disabled={loading}>Send</button>
        </form>
      </div>
    </div>
  )
}

function ReportPage({ session_id }) {
  const [report, setReport] = useState(null)

  useEffect(() => {
    fetch(`/api/report/${session_id}`).then(res => res.json()).then(setReport)
  }, [session_id])

  if (!report) return <div className="premium-container"><h1>Generating Report...</h1></div>

  return (
    <div className="premium-container animate-fade-in">
      <h1>Final Analysis</h1>
      <p className="subtitle">Overall Score: <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{report.overall_score}/5.0</span></p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', width: '100%', maxWidth: '1000px' }}>
        <div className="glass-card" style={{ maxWidth: 'none', padding: '2rem' }}>
          <h3>Skill Breakdown</h3>
          {report.skills_report.map((s, i) => (
            <div key={i} style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>{s.skill}</span>
                <span>{s.average_score}/5</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                <div style={{ width: `${(s.average_score / 5) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
        <div className="glass-card" style={{ maxWidth: 'none', padding: '2rem' }}>
          <h3>Learning Roadmap</h3>
          {report.roadmap.map((step, i) => (
            <div key={i} style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              {step}
            </div>
          ))}
          <button className="primary-button" onClick={() => window.location.reload()}>New Evaluation</button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [view, setView] = useState('LANDING')
  const [session, setSession] = useState(null)

  return (
    <main>
      {view === 'LANDING' ? (
        <LandingPage onStart={(data) => { setSession(data); setView('INTERVIEW'); }} />
      ) : view === 'INTERVIEW' ? (
        <ChatInterface session_id={session.session_id} first_question={session.first_question} onComplete={() => setView('REPORT')} />
      ) : (
        <ReportPage session_id={session.session_id} />
      )}
    </main>
  )
}

export default App
