import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status === 'ok' ? 'ok' : 'error'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <main>
      <h1>Support Desk</h1>
      <p>API status: {status}</p>
    </main>
  )
}

export default App
