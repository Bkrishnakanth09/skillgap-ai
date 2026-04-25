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

function InterviewPage({ session_id, first_question }) {
  const [messages, setMessages] = useState([{ role: 'bot', text: first_question }])
  const [input, setInput] = useState('')

  const handleSend = async () => {
    const res = await fetch('/api/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, answer: input })
    })
    const data = await res.json()
    setMessages([...messages, { role: 'user', text: input }, { role: 'bot', text: data.next_question || 'Interview done!' }])
    setInput('')
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

function App() {
  const [view, setView] = useState('LANDING')
  const [session, setSession] = useState(null)

  return (
    <main>
      {view === 'LANDING' ? (
        <LandingPage onStart={(data) => { setSession(data); setView('INTERVIEW'); }} />
      ) : (
        <InterviewPage session_id={session.session_id} first_question={session.first_question} />
      )}
    </main>
  )
}

export default App
