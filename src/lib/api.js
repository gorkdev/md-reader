const TOKEN_KEY = 'md-reader-token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request(method, url, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    // Network error (server down, restart, etc.) — don't touch auth state
    const err = new Error('Cannot connect to server')
    err.status = 0
    err.data = {}
    throw err
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const isLoginRequest = url.includes('/api/auth/login')
    if (res.status === 401 && !isLoginRequest) {
      // Only clear auth if the token is actually invalid, not a transient error.
      // Verify by checking the error message from the server.
      const serverMsg = data.error || ''
      if (serverMsg === 'Invalid token' || serverMsg === 'Missing token' || serverMsg === 'User not found') {
        setToken(null)
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  del: (url) => request('DELETE', url),
}
