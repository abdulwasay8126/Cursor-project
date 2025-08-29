import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { cx } from 'clsx'
import './index.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const PREVIEW_LEN = 100

function App() {
  const [theme, setTheme] = useState('light')
  const [feedback, setFeedback] = useState([])
  const [message, setMessage] = useState('')
  const [author, setAuthor] = useState('')
  const [expandedCard, setExpandedCard] = useState(null)
  const [comments, setComments] = useState([])
  const [commentContent, setCommentContent] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('')

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    
    // Load client ID from localStorage
    let clientId = localStorage.getItem('clientId')
    if (!clientId) {
      clientId = 'client_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('clientId', clientId)
    }
    
    loadFeedback()
  }, [])

  async function loadFeedback() {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error loading feedback:', error)
    } else {
      setFeedback(data || [])
    }
  }

  async function submitFeedback(e) {
    e.preventDefault()
    const clientId = localStorage.getItem('clientId')
    
    if (!message.trim()) return
    
    const { data, error } = await supabase
      .from('feedback')
      .insert([{
        message: message.trim(),
        author: author.trim() || 'Anonymous',
        client_id: clientId
      }])
      .select()
    
    if (error) {
      console.error('Error submitting feedback:', error)
    } else {
      setMessage('')
      setAuthor('')
      loadFeedback()
    }
  }

  async function upvote(id, currentVotes) {
    const clientId = localStorage.getItem('clientId')
    const votedPosts = JSON.parse(localStorage.getItem('votedPosts') || '[]')
    
    if (votedPosts.includes(id)) return
    
    const { error } = await supabase
      .from('feedback')
      .update({ votes: currentVotes + 1 })
      .eq('id', id)
    
    if (error) {
      console.error('Error upvoting:', error)
    } else {
      votedPosts.push(id)
      localStorage.setItem('votedPosts', JSON.stringify(votedPosts))
      loadFeedback()
    }
  }

  function hasVoted(id) {
    const votedPosts = JSON.parse(localStorage.getItem('votedPosts') || '[]')
    return votedPosts.includes(id)
  }

  function isOwnPost(id) {
    const clientId = localStorage.getItem('clientId')
    const ownPosts = JSON.parse(localStorage.getItem('ownPosts') || '[]')
    return ownPosts.includes(id)
  }

  function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  async function openExpandedCard(feedback) {
    setExpandedCard(feedback)
    setComments([])
    await loadComments(feedback.id)
  }

  async function loadComments(feedbackId) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error loading comments:', error)
    } else {
      setComments(data || [])
    }
  }

  async function submitComment(e) {
    e.preventDefault()
    const content = commentContent.trim()
    const author = commentAuthor.trim() || 'Anonymous'

    if (!content) return
    if (!expandedCard) return

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          feedback_id: expandedCard.id,
          content: content,
          author: author
        }])
        .select() // Select the inserted data to get the full comment object

      if (error) {
        console.error('Error submitting comment:', error)
      } else {
        // Add the new comment immediately to the local state
        if (data && data[0]) {
          setComments(prevComments => [...prevComments, data[0]])
        }
        setCommentContent('')
        setCommentAuthor('')
      }
    } catch (err) {
      console.error('Error submitting comment:', err)
    }
  }

  function closeExpandedCard() {
    setExpandedCard(null)
    setComments([])
    setCommentContent('')
    setCommentAuthor('')
  }

  // Subscribe to real-time updates for comments
  useEffect(() => {
    if (!expandedCard) return

    const subscription = supabase
      .channel('comments')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `feedback_id=eq.${expandedCard.id}`
      }, (payload) => {
        // Only add if it's not already in the local state
        setComments(prevComments => {
          const exists = prevComments.find(c => c.id === payload.new.id)
          if (!exists) {
            return [...prevComments, payload.new]
          }
          return prevComments
        })
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [expandedCard])

  function SafeText({ text }) {
    return <span dangerouslySetInnerHTML={{ __html: text.replace(/</g, '&lt;').replace(/>/g, '&gt;') }} />
  }

  function TimeAgo({ ts }) {
    const now = new Date()
    const then = new Date(ts)
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const filteredItems = feedback.filter(f => 
    !message || f.message.toLowerCase().includes(message.toLowerCase()) ||
    (f.author && f.author.toLowerCase().includes(message.toLowerCase()))
  )

  return (
    <div className={cx('min-h-screen transition-colors duration-300', theme==='dark'?'app-bg-dark text-white':'app-bg-light text-gray-800')}>
      <div className="bg-animated">
        <div className="bg-content">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 brand-title">
                Mango Nexus
              </h1>
              <p className="text-lg opacity-80 mb-6">Feedback Wall</p>
              <button 
                onClick={toggleTheme}
                className="btn-primary"
              >
                {theme === 'light' ? '🌙' : '☀️'} Toggle Theme
              </button>
            </div>

            <form onSubmit={submitFeedback} className="max-w-2xl mx-auto mb-8">
              <div className="card-base card-light dark:card-dark">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your feedback..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                  rows="3"
                  required
                />
                <div className="flex gap-4 mt-4">
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Your name (optional)"
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <button type="submit" className="btn-primary">
                    Submit
                  </button>
                </div>
              </div>
            </form>

            <div className="max-w-4xl mx-auto">
              <ul className="space-y-4">
                {filteredItems.map(f => (
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
                      <button onClick={()=>upvote(f.id,f.votes)} disabled={hasVoted(f.id)||isOwnPost(f.id)} className={cx('btn-primary text-sm border', (hasVoted(f.id)||isOwnPost(f.id))&&'opacity-60 cursor-not-allowed')}>▲ Upvote {f.votes}</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Card Overlay */}
      {expandedCard && (
        <div className="expanded-card-overlay" onClick={closeExpandedCard}>
          <div className="expanded-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={closeExpandedCard}>
              ×
            </button>
            
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
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Add a comment..."
                  className="comment-input"
                  rows="3"
                  required
                />
                <input
                  type="text"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="Your name (optional)"
                  className="comment-author-input"
                />
                <button type="submit" className="comment-submit">
                  Post Comment
                </button>
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

export default App