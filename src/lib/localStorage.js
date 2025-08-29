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

// Generate a more stable device fingerprint
function generateDeviceFingerprint() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'top'
  ctx.font = '14px Arial'
  ctx.fillText('Device fingerprint', 2, 2)
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|')
  
  // Create a hash of the fingerprint
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

const KEY = 'feedbackwall.client_id'
const VOTED_KEY = 'feedbackwall.voted'
const OWN_KEY = 'feedbackwall.own_posts'
const DEVICE_KEY = 'feedbackwall.device_id'

export function getClientId() {
  let id = getCookie(KEY)
  if (!id) {
    id = crypto.randomUUID()
    setCookie(KEY, id)
  }
  return id
}

// Get or create device ID
export function getDeviceId() {
  let deviceId = getCookie(DEVICE_KEY)
  if (!deviceId) {
    deviceId = generateDeviceFingerprint()
    setCookie(DEVICE_KEY, deviceId)
  }
  return deviceId
}

// Enhanced voting tracking that combines client ID and device ID
export function hasVoted(feedbackId) {
  const raw = getCookie(VOTED_KEY)
  if (!raw) return false
  try {
    const votedData = JSON.parse(raw)
    const clientId = getClientId()
    const deviceId = getDeviceId()
    
    // Check if this client or device has voted on this post
    return votedData.some(item => 
      (item.clientId === clientId || item.deviceId === deviceId) && 
      item.postId === feedbackId
    )
  } catch (e) {
    return false
  }
}

export function markVoted(feedbackId) {
  const raw = getCookie(VOTED_KEY)
  let votedData = []
  if (raw) {
    try {
      votedData = JSON.parse(raw)
    } catch (e) {
      votedData = []
    }
  }
  
  const clientId = getClientId()
  const deviceId = getDeviceId()
  
  // Add this vote with both client and device tracking
  votedData.push({
    clientId: clientId,
    deviceId: deviceId,
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

// Enhanced own post tracking
export function isOwnPost(feedbackId) {
  const raw = getCookie(OWN_KEY)
  if (!raw) return false
  try {
    const ownPostsData = JSON.parse(raw)
    const clientId = getClientId()
    const deviceId = getDeviceId()
    
    // Check if this client or device owns this post
    return ownPostsData.some(item => 
      (item.clientId === clientId || item.deviceId === deviceId) && 
      item.postId === feedbackId
    )
  } catch (e) {
    return false
  }
}

export function markOwnPost(feedbackId) {
  const raw = getCookie(OWN_KEY)
  let ownPostsData = []
  if (raw) {
    try {
      ownPostsData = JSON.parse(raw)
    } catch (e) {
      ownPostsData = []
    }
  }
  
  const clientId = getClientId()
  const deviceId = getDeviceId()
  
  // Add this post with both client and device tracking
  ownPostsData.push({
    clientId: clientId,
    deviceId: deviceId,
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