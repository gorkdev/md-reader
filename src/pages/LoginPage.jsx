import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function FloatingPaths() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="50%" stopColor="white" stopOpacity="0.12" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[
          { d: "M-50 300 Q200 100 400 300 Q600 500 850 300", delay: '0s', dur: '20s' },
          { d: "M-50 200 Q150 400 350 200 Q550 0 850 200", delay: '2s', dur: '22s' },
          { d: "M-50 400 Q250 200 450 400 Q650 600 850 400", delay: '4s', dur: '18s' },
          { d: "M-50 150 Q200 350 400 150 Q600 -50 850 150", delay: '1s', dur: '24s' },
          { d: "M-50 450 Q300 250 500 450 Q700 650 850 450", delay: '3s', dur: '21s' },
        ].map((line, i) => (
          <g key={i}>
            <path
              d={line.d}
              fill="none"
              stroke="url(#line-grad)"
              strokeWidth="0.5"
              style={{
                animation: `pathFloat ${line.dur} ease-in-out infinite`,
                animationDelay: line.delay,
              }}
            />
            <circle r="1.5" fill="white" fillOpacity="0.3">
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

      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/[0.02] blur-[100px]" />
    </div>
  )
}

export default function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  if (isAuthenticated) {
    navigate('/', { replace: true })
    return null
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const success = login(username, password)
    if (success) {
      navigate('/')
    } else {
      setError('Invalid username or password')
    }
  }

  return (
    <div className="min-h-screen flex bg-foreground">
      {/* Left panel - animated dark */}
      <div className="hidden lg:flex lg:flex-1 relative flex-col justify-between p-10 text-background overflow-hidden">
        <FloatingPaths />

        <div className="relative z-10">
          <span className="text-sm font-medium opacity-50 tracking-wide">MD Reader</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-semibold tracking-tight leading-[1.1] mb-4 text-background">
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

      {/* Right panel - form */}
      <div className="w-full lg:w-[420px] flex flex-col bg-background lg:rounded-l-2xl relative">
        {/* Mobile header */}
        <div className="p-6 lg:hidden">
          <span className="text-sm font-semibold">MD Reader</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-10">
          <div
            className="w-full max-w-[340px] transition-all duration-700 ease-out"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
            }}
          >
            <div className="mb-10">
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Welcome back</h2>
              <p className="text-sm text-muted-foreground">Sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div
                className="space-y-2 transition-all duration-700 ease-out"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(12px)',
                  transitionDelay: '80ms',
                }}
              >
                <label className="text-sm font-medium">Username</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              <div
                className="space-y-2 transition-all duration-700 ease-out"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(12px)',
                  transitionDelay: '160ms',
                }}
              >
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div
                className="pt-1 transition-all duration-700 ease-out"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(12px)',
                  transitionDelay: '240ms',
                }}
              >
                <Button type="submit" className="w-full h-11">
                  Sign In
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div
          className="p-6 text-center transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transitionDelay: '400ms',
          }}
        >
          <p className="text-xs text-muted-foreground">
            Default credentials: admin / admin123
          </p>
        </div>
      </div>
    </div>
  )
}
