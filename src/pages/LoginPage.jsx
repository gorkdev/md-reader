import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { VscMarkdown } from 'react-icons/vsc'
import { HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) {
    navigate('/', { replace: true })
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    await new Promise(r => setTimeout(r, 600))

    const success = login(username, password)
    if (success) {
      navigate('/')
    } else {
      setError('Gecersiz kullanici adi veya sifre')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-15 animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />

      {/* Login Card */}
      <Card className="w-full max-w-md relative backdrop-blur-2xl bg-white/[0.07] border-white/[0.12] shadow-2xl animate-scale-in animate-glow-pulse">
        <CardHeader className="text-center space-y-4 pb-2">
          {/* Logo */}
          <div className="mx-auto animate-fade-in-up stagger-1">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-violet-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 mx-auto transition-transform duration-500 hover:scale-110 hover:rotate-3 hover:shadow-purple-500/40">
              <VscMarkdown className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="animate-fade-in-up stagger-2">
            <CardTitle className="text-3xl font-bold text-white tracking-tight">
              MD Reader
            </CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              Markdown dosyalarinizi yonetin
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-2 animate-fade-in-up stagger-3">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <HiOutlineUser className="w-4 h-4 text-purple-400" />
                Kullanici Adi
              </label>
              <Input
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-500 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20 transition-all duration-300 hover:bg-white/[0.09] hover:border-white/[0.2]"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2 animate-fade-in-up stagger-4">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <HiOutlineLockClosed className="w-4 h-4 text-purple-400" />
                Sifre
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-500 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20 transition-all duration-300 hover:bg-white/[0.09] hover:border-white/[0.2]"
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div className="animate-fade-in-up text-red-400 text-sm text-center bg-red-500/10 py-2.5 px-4 rounded-lg border border-red-500/20 flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="animate-fade-in-up stagger-5 pt-1">
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 hover:from-purple-500 hover:via-violet-500 hover:to-blue-500 text-white font-semibold shadow-lg shadow-purple-500/20 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Giris yapiliyor...
                  </span>
                ) : 'Giris Yap'}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="animate-fade-in-up stagger-6">
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.08]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-3 text-slate-500">Demo Bilgileri</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
              <span className="bg-white/[0.04] px-3 py-1.5 rounded-md border border-white/[0.06] font-mono">admin</span>
              <span className="text-slate-600">/</span>
              <span className="bg-white/[0.04] px-3 py-1.5 rounded-md border border-white/[0.06] font-mono">admin123</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
