import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { getClientId, hasVoted, markVoted, getTheme, setTheme, isOwnPost, markOwnPost, validateCommentLength, MAX_COMMENT_LEN, setUserEmail, canVoteOnPost } from './lib/localStorage'
import cx from 'clsx'

const MAX_LEN = 500
const PREVIEW_LEN = 80 // Reduced to show fewer words initially

function SafeText({ text }) {
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
  const [email,setEmail]=useState('')
  const [error,setError]=useState('')
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [filter,setFilter]=useState('new')
  const [q,setQ]=useState('')
  const [expandedCard, setExpandedCard] = useState(null)
  const [comments, setComments] = useState([])
  const [commentContent, setCommentContent] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('')
  const [commentEmail, setCommentEmail] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentError, setCommentError] = useState('')
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

  // Load comments for expanded card
  async function loadComments(feedbackId) {
    if (!feedbackId) return
    setLoadingComments(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('feedback_id', feedbackId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error loading comments:', error)
        setComments([])
      } else {
        setComments(data || [])
      }
    } catch (err) {
      console.error('Error loading comments:', err)
      setComments([])
    }
    setLoadingComments(false)
  }

  // Subscribe to comments changes
  useEffect(() => {
    if (!expandedCard) return

    const channel = supabase.channel(`comments-${expandedCard.id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'comments', filter: `feedback_id=eq.${expandedCard.id}` },
        () => loadComments(expandedCard.id)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [expandedCard])

  async function submit(e){
    e.preventDefault()
    const text = message.trim()
    const who = author.trim()||'Anonymous'
    const userEmail = email.trim()
    
    if(!text){ setError('Please enter a message.'); return }
    if(text.length>MAX_LEN){ setError(`Keep it under ${MAX_LEN} characters.`); return }
    
    setError('')
    const { data, error } = await supabase.from('feedback').insert([{message:text,author:who}]).select('id')
    if(error){ setError(error.message); return }
    
    if(data&&data[0]) {
      // Store the user's email for voting tracking
      if (userEmail) {
        setUserEmail(userEmail)
        markOwnPost(data[0].id, userEmail)
      }
    }
    
    setMessage(''); setAuthor(''); setEmail('')
  }

  async function upvote(id,votes){
    const voteCheck = canVoteOnPost(id)
    if (!voteCheck.canVote) {
      // Show error message to user
      alert(voteCheck.reason)
      return
    }
    
    const { error } = await supabase.from('feedback').update({votes:votes+1}).eq('id',id)
    if(!error) markVoted(id)
  }

  async function submitComment(e) {
    e.preventDefault()
    const content = commentContent.trim()
    const author = commentAuthor.trim() || 'Anonymous'
    const userEmail = commentEmail.trim()
    
    if (!content) {
      setCommentError('Please enter a comment.')
      return
    }
    
    if (!validateCommentLength(content)) {
      setCommentError(`Comment must be under ${MAX_COMMENT_LEN} characters.`)
      return
    }
    
    if (!expandedCard) return

    setCommentError('') // Clear any previous errors

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          feedback_id: expandedCard.id,
          content: content,
          author: author
        }])
        .select()

      if (error) {
        console.error('Error submitting comment:', error)
        setCommentError('Failed to post comment. Please try again.')
      } else {
        // Store the user's email for voting tracking
        if (userEmail) {
          setUserEmail(userEmail)
        }
        
        // Add the new comment immediately to the local state
        if (data && data[0]) {
          setComments(prevComments => [...prevComments, data[0]])
        }
        setCommentContent('')
        setCommentAuthor('')
        setCommentEmail('')
      }
    } catch (err) {
      console.error('Error submitting comment:', err)
      setCommentError('Failed to post comment. Please try again.')
    }
  }

  function openExpandedCard(feedback) {
    setExpandedCard(feedback)
    loadComments(feedback.id)
    setCommentContent('')
    setCommentAuthor('')
    setCommentEmail('')
    setCommentError('')
  }

  function closeExpandedCard() {
    setExpandedCard(null)
    setComments([])
    setCommentError('')
  }

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase()
    const arr = items||[]
    if(!s) return arr
    return arr.filter(r=> (r.message||'').toLowerCase().includes(s) || (r.author||'').toLowerCase().includes(s))
  },[items,q])

  return (
    <div className={cx('min-h-screen bg-animated', theme==='dark'?'app-bg-dark text-gray-100':'app-bg-light text-gray-900')}>
      <div className="bg-content max-w-6xl mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-8">
          <h1 className="brand-title text-4xl sm:text-5xl">Mango Nexus Feedback Wall</h1>
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
            <input className="flex-1 p-2 rounded border dark:bg-gray-900/60" type="email" placeholder="Your email (for voting)" value={email} onChange={e=>setEmail(e.target.value)} />
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
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(f=> (
              <li key={f.id} className={cx('card-base card-hover', theme==='dark'?'card-dark':'card-light')}>
                <div className="message-preview text-[0.95rem] leading-6 mb-2">
                  <SafeText text={f.message.length>PREVIEW_LEN? f.message.slice(0,PREVIEW_LEN)+'…': f.message} />
                </div>
                {/* Add comment button for all posts */}
                <button
                  onClick={() => openExpandedCard(f)}
                  className="add-comment-btn"
                >
                  {f.message.length>PREVIEW_LEN ? 'Read more & Comment' : 'Add Comment'}
                </button>
                <div className="flex items-center justify-between text-xs opacity-80">
                  <span><SafeText text={f.author||'Anonymous'} /></span>
                  <span><TimeAgo ts={f.created_at} /></span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button 
                    onClick={()=>upvote(f.id,f.votes)} 
                    className={cx('btn-primary text-sm border')}
                    title={(() => {
                      const voteCheck = canVoteOnPost(f.id)
                      return voteCheck.canVote ? "Upvote this post" : voteCheck.reason
                    })()}
                  >
                    ▲ Upvote {f.votes}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Expanded Card Overlay */}
      {expandedCard && (
        <div className="expanded-card-overlay" onClick={closeExpandedCard}>
          <div className="expanded-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={closeExpandedCard}>×</button>
            
            <div className="expanded-card-header">
              <h2 className="text-xl font-semibold mb-2">Feedback Details</h2>
            </div>
            
            <div className="expanded-card-content">
              <SafeText text={expandedCard.message} />
            </div>
            
            <div className="expanded-card-meta">
              <span><SafeText text={expandedCard.author || 'Anonymous'} /></span>
              <span><TimeAgo ts={expandedCard.created_at} /></span>
            </div>

            <div className="comments-section">
              <h3 className="comments-header">Comments ({comments.length})</h3>
              
              <form onSubmit={submitComment} className="comment-form">
                <div className="relative">
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Add a comment..."
                    className="comment-input"
                    rows="3"
                    maxLength={MAX_COMMENT_LEN}
                    required
                  />
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {commentContent.length}/{MAX_COMMENT_LEN} characters
                  </div>
                </div>
                <input
                  type="text"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="Your name (optional)"
                  className="comment-author-input"
                />
                <input
                  type="email"
                  value={commentEmail}
                  onChange={(e) => setCommentEmail(e.target.value)}
                  placeholder="Your email (for voting)"
                  className="comment-author-input"
                />
                <button type="submit" className="comment-submit">
                  Post Comment
                </button>
                {commentError && <p className="text-red-500 text-sm mt-2">{commentError}</p>}
              </form>

              <div className="comments-list">
                {comments.length === 0 ? (
                  <div className="no-comments">No comments yet. Be the first to comment!</div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-content">
                        <SafeText text={comment.content} />
                      </div>
                      <div className="comment-meta">
                        <span className="comment-author">
                          <SafeText text={comment.author || 'Anonymous'} />
                        </span>
                        <span><TimeAgo ts={comment.created_at} /></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}