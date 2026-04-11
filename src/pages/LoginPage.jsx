import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PATHS = [
  { d: "M-50 300 Q200 100 400 300 Q600 500 850 300", delay: '0s', dur: '20s' },
  { d: "M-50 200 Q150 400 350 200 Q550 0 850 200", delay: '2s', dur: '22s' },
  { d: "M-50 400 Q250 200 450 400 Q650 600 850 400", delay: '4s', dur: '18s' },
  { d: "M-50 150 Q200 350 400 150 Q600 -50 850 150", delay: '1s', dur: '24s' },
  { d: "M-50 450 Q300 250 500 450 Q700 650 850 450", delay: '3s', dur: '21s' },
]

function FloatingPaths() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.12" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {PATHS.map((line, i) => (
          <g key={i} style={{ animation: `pathFloat ${line.dur} ease-in-out infinite`, animationDelay: line.delay }}>
            <path
              d={line.d}
              fill="none"
              stroke="url(#line-grad)"
              strokeWidth="0.5"
            />
            <circle r="1.5" fill="currentColor" fillOpacity="0.3">
              <animateMotion
                dur={line.dur}
                repeatCount="indefinite"
                path={line.d}
                begin={line.delay}
              />
            </circle>
          </g>
        ))}
      </svg>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-foreground/[0.02] blur-[100px]" />
    </div>
  )
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [visible, setVisible] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  // Login sayfasında scrollbar gizle
  useEffect(() => {
    document.documentElement.classList.add('no-scrollbar')
    return () => { document.documentElement.classList.remove('no-scrollbar') }
  }, [])

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const result = await login(username, password)
    setSubmitting(false)
    if (result.ok) {
      navigate('/')
    } else {
      const raw = result.error || ''
      const friendly =
        raw === 'Invalid credentials' ? 'Kullanıcı adı veya şifre hatalı'
        : raw === 'Username and password required' ? 'Kullanıcı adı ve şifre gerekli'
        : raw || 'Giriş başarısız'
      setError(friendly)
    }
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left panel */}
      <div className="hidden lg:flex lg:flex-1 relative flex-col justify-between p-10 text-foreground overflow-hidden">
        <FloatingPaths />

        <div className="relative z-10">
          <span className="text-sm font-medium opacity-50 tracking-wide">MD Reader</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-semibold tracking-tight leading-[1.1] mb-4 text-foreground">
            Manage your
            <br />
            markdown files,
            <br />
            <span className="opacity-40">effortlessly.</span>
          </h1>
        </div>

        <div className="relative z-10 flex items-center gap-5 text-xs opacity-25">
          <span>Fast</span>
          <span className="w-px h-3 bg-current" />
          <span>Secure</span>
          <span className="w-px h-3 bg-current" />
          <span>Local</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-[520px] flex flex-col bg-muted/30 lg:rounded-l-2xl relative">
        <div className="p-6 lg:hidden">
          <span className="text-sm font-semibold">MD Reader</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-12">
          <div
            className="w-full max-w-[360px] transition-all duration-700 ease-out"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
            }}
          >
            <div className="mb-8">
              <h2 className="text-xl font-semibold tracking-tight mb-1">Welcome back</h2>
              <p className="text-sm text-muted-foreground">Sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div
                className="space-y-1.5 transition-all duration-700 ease-out"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(12px)',
                  transitionDelay: '80ms',
                }}
              >
                <label className="text-xs font-medium text-muted-foreground">Username</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div
                className="space-y-1.5 transition-all duration-700 ease-out"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(12px)',
                  transitionDelay: '160ms',
                }}
              >
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div key={error} className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <span className="leading-5">⚠</span>
                  <span className="leading-5">{error}</span>
                </div>
              )}

              <div
                className="pt-1 transition-all duration-700 ease-out"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(12px)',
                  transitionDelay: '240ms',
                }}
              >
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div
          className="p-6 text-center transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transitionDelay: '400ms' }}
        >
          <p className="text-xs text-muted-foreground">Multi-user collaborative editing</p>
        </div>
      </div>
    </div>
  )
}
