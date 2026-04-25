import { useState } from 'react'

function LandingPage({ onStart }) {
  const [resume, setResume] = useState('')
  const [loading, setLoading] = useState(false)

  const handleStart = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: resume, job_description: 'Software Engineer' })
      })
      const data = await res.json()
      onStart(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="landing-container">
      <h1>skillgap-ai</h1>
      <textarea 
        placeholder="Paste resume..." 
        value={resume} 
        onChange={(e) => setResume(e.target.value)}
      />
      <button onClick={handleStart} disabled={loading}>
        {loading ? 'Initializing...' : 'Start Interview'}
      </button>
    </div>
  )
}

function InterviewPage({ session_id, first_question, onComplete }) {
  const [messages, setMessages] = useState([{ role: 'bot', text: first_question }])
  const [input, setInput] = useState('')

  const handleSend = async () => {
    const res = await fetch('/api/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, answer: input })
    })
    const data = await res.json()
    const userMsg = { role: 'user', text: input }
    const botMsg = { role: 'bot', text: data.next_question || 'Interview complete!' }
    setMessages([...messages, userMsg, botMsg])
    setInput('')
    
    if (!data.next_question) {
      setTimeout(() => onComplete(), 2000)
    }
  }

  return (
    <div className="interview-container">
      <div className="chat-log">
        {messages.map((m, i) => <div key={i} className={m.role}>{m.text}</div>)}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={handleSend}>Send</button>
    </div>
  )
}

function ReportPage({ session_id }) {
  const [report, setReport] = useState(null)

  useState(() => {
    fetch(`/api/report/${session_id}`)
      .then(res => res.json())
      .then(setReport)
  }, [])

  if (!report) return <div>Generating report...</div>

  return (
    <div className="report-container">
      <h1>Your Skill Report</h1>
      <p>Overall Score: {report.overall_score}</p>
      <ul>
        {report.skills_report.map((s, i) => (
          <li key={i}>
            <strong>{s.skill}</strong>: {s.average_score} ({s.status})
          </li>
        ))}
      </ul>
      <h2>Roadmap</h2>
      <ul>{report.roadmap.map((step, i) => <li key={i}>{step}</li>)}</ul>
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
        <InterviewPage session_id={session.session_id} first_question={session.first_question} onComplete={() => setView('REPORT')} />
      ) : (
        <ReportPage session_id={session.session_id} />
      )}
    </main>
  )
}

export default App
