import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

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
      {/* Sol panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground text-background flex-col justify-between p-12">
        <div>
          <span className="text-sm font-semibold tracking-wider uppercase opacity-60">MD Reader</span>
        </div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight leading-tight mb-4">
            Markdown dosyalarınızı
            <br />
            tek yerden yönetin.
          </h1>
          <p className="text-base opacity-50 max-w-md leading-relaxed">
            Yerel dosyalarınızı okuyun, düzenleyin ve kategorilere göre filtreleyin.
          </p>
        </div>

        <p className="text-xs opacity-30">&copy; 2026</p>
      </div>

      {/* Sağ panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[320px]">
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-1">Giriş Yap</h2>
            <p className="text-sm text-muted-foreground">Devam etmek için hesabınıza giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kullanıcı Adı</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Şifre</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Giriş Yap
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
