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

export function getClientId() {
  let id = getCookie(KEY)
  if (!id) {
    id = crypto.randomUUID()
    setCookie(KEY, id)
  }
  return id
}

export function hasVoted(feedbackId) {
  const raw = getCookie(VOTED_KEY)
  if (!raw) return false
  try {
    const set = new Set(JSON.parse(raw))
    return set.has(feedbackId)
  } catch (e) {
    return false
  }
}

export function markVoted(feedbackId) {
  const raw = getCookie(VOTED_KEY)
  let set = new Set()
  if (raw) {
    try {
      set = new Set(JSON.parse(raw))
    } catch (e) {
      set = new Set()
    }
  }
  set.add(feedbackId)
  setCookie(VOTED_KEY, JSON.stringify(Array.from(set)))
}

export function getTheme() {
  return getCookie('feedbackwall.theme') || 'light'
}

export function setTheme(t) {
  setCookie('feedbackwall.theme', t)
}

export function isOwnPost(feedbackId) {
  const raw = getCookie(OWN_KEY)
  if (!raw) return false
  try {
    const set = new Set(JSON.parse(raw))
    return set.has(feedbackId)
  } catch (e) {
    return false
  }
}

export function markOwnPost(feedbackId) {
  const raw = getCookie(OWN_KEY)
  let set = new Set()
  if (raw) {
    try {
      set = new Set(JSON.parse(raw))
    } catch (e) {
      set = new Set()
    }
  }
  set.add(feedbackId)
  setCookie(OWN_KEY, JSON.stringify(Array.from(set)))
}

// Comment length validation
export const MAX_COMMENT_LEN = 300 // Maximum comment length

export function validateCommentLength(content) {
  return content.length <= MAX_COMMENT_LEN
}