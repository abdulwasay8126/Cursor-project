const KEY = 'feedbackwall.client_id'
const VOTED_KEY = 'feedbackwall.voted'

export function getClientId() {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}

export function hasVoted(feedbackId) {
  const raw = localStorage.getItem(VOTED_KEY)
  const set = new Set(raw ? JSON.parse(raw) : [])
  return set.has(feedbackId)
}

export function markVoted(feedbackId) {
  const raw = localStorage.getItem(VOTED_KEY)
  const set = new Set(raw ? JSON.parse(raw) : [])
  set.add(feedbackId)
  localStorage.setItem(VOTED_KEY, JSON.stringify(Array.from(set)))
}

export function getTheme() {
  return localStorage.getItem('feedbackwall.theme') || 'light'
}

export function setTheme(t) {
  localStorage.setItem('feedbackwall.theme', t)
}
