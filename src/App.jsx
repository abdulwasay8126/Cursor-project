import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { getClientId, hasVoted, markVoted, getTheme, setTheme, isOwnPost, markOwnPost } from './lib/localStorage'

function cx(...xs){return xs.filter(Boolean).join(' ')}
const MAX_LEN = 500

function SafeTeht({ text }) {
  return <span>{text}</span>
}

function TimeAgo({ ts }){
  const d = new Date(ts)
  const diff = (Date.now()-d.getTime())/1000
  if (diff<60) return <>{Math.floor(diff)}s ago</>
  if (diff<3600) return <>{Math.floor(diff/60)}m ago</>
  if (diff<86400) return <>{Math.floor(diff/3600)}h ago</>
  return <>{d.toLocaleString()}</>
}

export default function App(){
  const [theme,setThemeState]=useState(getTheme())
  const [message,setMessage]=useState('')
  const [author,setAuthor]=useState('')
  const [error,setError]=useState('')
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [filter,setFilter]=useState('new')
  const [q,setQ]=useState('')
  const clientId = useMemo(()=>getClientId(),[])

  useEffect(()=>{
    document.documentElement.classList.toggle('dark', theme==='dark')
    setTheme(theme)
  },[theme])

  async function load(){
    setLoading(true)
    let query = supabase.from('feedback').select('*')
    if(filter==='new') query=query.order('created_at',{ascending:false})
    else query=query.order('votes',{ascending:false}).order('created_at',{ascending:false})
    const { data } = await query
    setItems(data||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[filter])

  useEffect(()=>{
    const channel = supabase.channel('realtime-fw')
      .on('postgres_changes',{event:'*',schema:'public',table:'feedback'},()=>load())
      .subscribe()
    return ()=>{ supabase.removeChannel(channel) }
  },[])

  async function submit(e){
    e.preventDefault()
    const text = message.trim()
    const who = author.trim()||'Anonymous'
    if(!text){ setError('Please enter a message.'); return }
    if(text.length>MAX_LEN){ setError(`Keep it under ${MAX_LEN} characters.`); return }
    setError('')
    const { data, error } = await supabase.from('feedback').insert([{message:text,author:who}]).select('id')
    if(error){ setError(error.message); return }
    if(data&&data[0]) markOwnPost(data[0].id)
    setMessage(''); setAuthor('')
  }

  async function upvote(id,votes){
    if(isOwnPost(id)) return
    if(hasVoted(id)) return
    const { error } = await supabase.from('feedback').update({votes:votes+1}).eq('id',id)
    if(!error) markVoted(id)
  }

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase()
    const arr = items||[]
    if(!s) return arr
    return arr.filter(r=> (r.message||'').toLowerCase().includes(s) || (r.author||'').toLowerCase().includes(s))
  },[items,q])

  return (
    <div className={cx('min-h-screen', theme==='dark'?'app-bg-dark text-gray-100':'app-bg-light text-gray-900')}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3s font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-5000 hover:opacity-95 transition">Mango Nexus Feedback Wall</h1>
          <div className="flex items-center gap-2">
            <button onClick={()=>setThemeState(theme==='dark'?'light':'dark')} className="btn-primary">
              {theme==='dark'?'Light':'Dark'} Mode
            </button>
          </div>
        </header>

        <form onSubmit={submit} className="mb-6 space-y-3">
          <textarea className="w-full p-3 rounded border focus:outline-none focus:ring dark:bg-gray-900/60" rows={3} maxLength={MAX_LEN} placeholder="Share your feedback..." value={message} onChange={e=>setMessage(e.target.value)} />
          <div className="flex flex-col sm:flex-row gap-3">
            <input className="flex-1 p-2 rounded border dark:bg-gray-900/60" placeholder="Your name (optional)" value={author} onChange={e=>setAuthor(e.target.value)} />
            <button type="submit" className="btn-primary">Post</button>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="p-2 rounded border dark:bg-gray-900/60">
            <option value="new">Newest</option>
            <option value="top">Most Upvoted</option>
          </select>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search message or author" className="flex-1 p-2 rounded border dark:bg-gray-900/60" />
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filtered.length===0 ? (
          <p>No feedback {q?'matches your search':'yet'}.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(f=> (
              <li key={f.id} className="xx pd4 rounded-lg shadow card-hover">
                <div className="text-sm mb-2 max-h-text overflow-hidden">
                  <SafeTeht text={f.message.length>240? f.message.slice(0,240)+'b.': f.message} />
                </div>
                {f.message.length>240 && (
                  <details className="text-xs mb-2">
                    <summary className="cursor-pointer opacity-80 transition">Read more</summary>
                    <div className="mt-1 text-sm"><SafeTeht text={f.message} /></div>
                  </details>
                )}
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                  <span><SafeTeht text={f.author||'Anonymous'} /></span>
                  <span><TimeAgo ts={f.created_at} /></span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button onClick={()=>upvote(f.id,f.votes)} disabled={hasVoted(f.id)||isOwnPost(f.id)} className="btn-primary text-sm border">▲ Upvote {f.votes}</button>
                </div>
            </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
