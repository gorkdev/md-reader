import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Dot grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.15]">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Animated gradient sweep */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.06), transparent)',
          animation: 'sweep 8s ease-in-out infinite',
        }}
      />

      {/* Horizontal lines */}
      <div className="absolute top-[30%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute top-[60%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

      {/* Vertical accent line */}
      <div
        className="absolute right-0 top-0 bottom-0 w-px"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.1) 60%, transparent)',
        }}
      />
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
      setError('Geçersiz kullanıcı adı veya şifre')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Sol panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-foreground text-background relative flex-col justify-between p-12 overflow-hidden">
        <AnimatedGrid />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md border border-white/20 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
            </div>
            <span className="text-sm font-medium opacity-70">MD Reader</span>
          </div>
        </div>

        <div className="relative z-10 max-w-sm">
          <h1 className="text-3xl font-semibold tracking-tight leading-[1.2] mb-3">
            Markdown dosyalarınızı tek yerden yönetin.
          </h1>
          <p className="text-sm leading-relaxed opacity-40">
            Yerel dosyalarınızı okuyun, düzenleyin ve kategorilere göre filtreleyin. Basit, hızlı, verimli.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-xs opacity-30">
          <span>Hızlı</span>
          <span className="w-1 h-1 rounded-full bg-current" />
          <span>Güvenli</span>
          <span className="w-1 h-1 rounded-full bg-current" />
          <span>Yerel</span>
        </div>
      </div>

      {/* Sağ panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
        {/* Mobil logo */}
        <div className="absolute top-6 left-6 lg:hidden">
          <span className="text-sm font-semibold">MD Reader</span>
        </div>

        <div
          className="w-full max-w-[320px] transition-all duration-500 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          <div className="mb-8">
            <h2 className="text-xl font-semibold tracking-tight mb-1">Hoş geldiniz</h2>
            <p className="text-sm text-muted-foreground">Devam etmek için giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              className="space-y-1.5 transition-all duration-500 ease-out"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(8px)',
                transitionDelay: '100ms',
              }}
            >
              <label className="text-sm font-medium">Kullanıcı Adı</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-10"
                required
              />
            </div>

            <div
              className="space-y-1.5 transition-all duration-500 ease-out"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(8px)',
                transitionDelay: '200ms',
              }}
            >
              <label className="text-sm font-medium">Şifre</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div
              className="transition-all duration-500 ease-out"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(8px)',
                transitionDelay: '300ms',
              }}
            >
              <Button type="submit" className="w-full h-10">
                Giriş Yap
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
