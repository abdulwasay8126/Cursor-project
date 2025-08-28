import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { getClientId, hasVoted, markVoted, getTheme, setTheme } from './lib/localStorage'

function classNames(...xs) { return xs.filter(Boolean).join(' ') }

function sanitize(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function prettyTime(ts) {
  const d = new Date(ts)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return d.toLocaleString()
}

const MAX_LEN = 500

export default function App() {
  const [theme, setThemeState] = useState(getTheme())
  const [message, setMessage] = useState('')
  const [author, setAuthor] = useState('')
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('new') // 'new' | 'top'
  const [q, setQ] = useState('')
  const clientId = useMemo(() => getClientId(), [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    setTheme(theme)
  }, [theme])

  async function load() {
    setLoading(true)
    let query = supabase.from('feedback').select('*')
    if (filter === 'new') query = query.order('created_at', { ascending: false })
    else query = query.order('votes', { ascending: false }).order('created_at', { ascending: false })
    const { data, error } = await query
    if (!error) setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  useEffect(() => {
    const channel = supabase.channel('realtime:feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function submit(e) {
    e.preventDefault()
    const trimmed = message.trim()
    const who = author.trim() || 'Anonymous'
    if (!trimmed) { setError('Please enter a message.'); return }
    if (trimmed.length > MAX_LEN) { setError(`Keep it under ${MAX_LEN} characters.`); return }
    setError('')
    const { error } = await supabase.from('feedback').insert([{ message: trimmed, author: who }])
    if (error) setError(error.message)
    else { setMessage(''); setAuthor('') }
  }

  async function upvote(id, currentVotes) {
    if (hasVoted(id)) return
    const { error } = await supabase.from('feedback').update({ votes: currentVotes + 1 }).eq('id', id)
    if (!error) markVoted(id)
  }

  const filtered = useMemo(() => {
    const x = (items || [])
    if (!q.trim()) return x
    const s = q.trim().toLowerCase()
    return x.filter(r => (r.message || '').toLowerCase().includes(s) || (r.author || '').toLowerCase().includes(s))
  }, [items, q])

  return (
    <div className={classNames('min-h-screen', 'bg-white text-gray-900', theme==='dark' && 'dark bg-gray-900 text-gray-100')}> 
      <div className="max-w-3xl mx-auto p-4">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Feedback Wall</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setThemeState(theme==='dark'?'light':'dark')} className="px-3 py-1 rounded border">
              {theme==='dark' ? 'Light' : 'Dark'} Mode
            </button>
          </div>
        </header>

        <form onSubmit={submit} className="mb-6 space-y-3">
          <textarea
            className="w-full p-3 border rounded focus:outline-none focus:ring"
            rows={3}
            maxLength={MAX_LEN}
            placeholder="Share your feedback..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <input
              className="flex-1 mr-3 p-2 border rounded"
              placeholder="Your name (optional)"
              value={author}
              onChange={e => setAuthor(e.target.value)}
            />
            <button type="submit" className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500">Post</button>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>

        <div className="flex items-center gap-3 mb-4">
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="border rounded p-2">
            <option value="new">Newest</option>
            <option value="top">Most Upvoted</option>
          </select>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search message or author" className="flex-1 p-2 border rounded" />
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filtered.length === 0 ? (
          <p>No feedback {q ? 'matches your search' : 'yet'}.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(f => (
              <li key={f.id} className="rounded-lg shadow p-4 bg-yellow-50 dark:bg-gray-800 border border-yellow-100 dark:border-gray-700">
                <p className="text-sm mb-2" dangerouslySetInnerHTML={{ __html: sanitize(f.message.length>180? (f.message.slice(0,180)+ '…'): f.message) }} />
                {f.message.length>180 && <details className="text-xs mb-2"><summary className="cursor-pointer">Read more</summary><div dangerouslySetInnerHTML={{ __html: sanitize(f.message) }} /></details>}
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                  <span>{f.author || 'Anonymous'}</span>
                  <span>{prettyTime(f.created_at)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button onClick={()=>upvote(f.id, f.votes)} disabled={hasVoted(f.id)} className={classNames('px-3 py-1 rounded text-sm border', hasVoted(f.id)?'opacity-60 cursor-not-allowed':'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500')}>▲ Upvote {f.votes}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
