// Cookie utility functions
function setCookie(name, value, days = 365) {
  const expires = new Date()
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

function getCookie(name) {
  const nameEQ = name + "="
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
}

const KEY = 'feedbackwall.client_id'
const VOTED_KEY = 'feedbackwall.voted'
const OWN_KEY = 'feedbackwall.own_posts'
const USER_EMAIL_KEY = 'feedbackwall.user_email'

export function getClientId() {
  let id = getCookie(KEY)
  if (!id) {
    id = crypto.randomUUID()
    setCookie(KEY, id)
  }
  return id
}

// Get current user email (from stored cookie)
export function getUserEmail() {
  return getCookie(USER_EMAIL_KEY) || null
}

// Set user email (called when user posts with email)
export function setUserEmail(email) {
  if (email && email.trim()) {
    setCookie(USER_EMAIL_KEY, email.trim().toLowerCase())
  }
}

// Check if user has voted on a specific post (email-based)
export function hasVoted(feedbackId) {
  const userEmail = getUserEmail()
  if (!userEmail) return false
  
  const raw = getCookie(VOTED_KEY)
  if (!raw) return false
  try {
    const votedData = JSON.parse(raw)
    // Check if this email has voted on this post
    return votedData.some(item => item.email === userEmail && item.postId === feedbackId)
  } catch (e) {
    return false
  }
}

// Mark that user has voted on a post (email-based)
export function markVoted(feedbackId) {
  const userEmail = getUserEmail()
  if (!userEmail) return
  
  const raw = getCookie(VOTED_KEY)
  let votedData = []
  if (raw) {
    try {
      votedData = JSON.parse(raw)
    } catch (e) {
      votedData = []
    }
  }
  
  // Add this vote to the list
  votedData.push({
    email: userEmail,
    postId: feedbackId,
    timestamp: Date.now()
  })
  
  setCookie(VOTED_KEY, JSON.stringify(votedData))
}

export function getTheme() {
  return getCookie('feedbackwall.theme') || 'light'
}

export function setTheme(t) {
  setCookie('feedbackwall.theme', t)
}

// Check if user owns a specific post (email-based)
export function isOwnPost(feedbackId) {
  const userEmail = getUserEmail()
  if (!userEmail) return false
  
  const raw = getCookie(OWN_KEY)
  if (!raw) return false
  try {
    const ownPostsData = JSON.parse(raw)
    // Check if this email owns this post
    return ownPostsData.some(item => item.email === userEmail && item.postId === feedbackId)
  } catch (e) {
    return false
  }
}

// Mark that user owns a post (email-based)
export function markOwnPost(feedbackId, authorEmail) {
  if (!authorEmail || !authorEmail.trim()) return
  
  const email = authorEmail.trim().toLowerCase()
  const raw = getCookie(OWN_KEY)
  let ownPostsData = []
  if (raw) {
    try {
      ownPostsData = JSON.parse(raw)
    } catch (e) {
      ownPostsData = []
    }
  }
  
  // Add this post to the user's owned posts
  ownPostsData.push({
    email: email,
    postId: feedbackId,
    timestamp: Date.now()
  })
  
  setCookie(OWN_KEY, JSON.stringify(ownPostsData))
}

// Comment length validation
export const MAX_COMMENT_LEN = 300 // Maximum comment length

export function validateCommentLength(content) {
  return content.length <= MAX_COMMENT_LEN
}

// Check if user can vote on a post (email-based validation)
export function canVoteOnPost(feedbackId) {
  const userEmail = getUserEmail()
  if (!userEmail) {
    return { canVote: false, reason: "Please post with your email first to vote" }
  }
  
  if (isOwnPost(feedbackId)) {
    return { canVote: false, reason: "You cannot vote on your own post" }
  }
  
  if (hasVoted(feedbackId)) {
    return { canVote: false, reason: "You have already voted on this post" }
  }
  
  return { canVote: true, reason: "" }
}