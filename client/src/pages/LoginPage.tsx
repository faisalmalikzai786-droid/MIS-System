import { useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'

import { LoginAtmosphere, SpotlightCard } from '@/components/login-atmosphere'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState<'email' | 'password' | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        redirect?: string
      }

      if (!res.ok) {
        setError(data.error || 'Invalid email or password.')
        return
      }

      window.location.href = data.redirect || '/dashboard'
    } catch {
      setError('Could not reach the server. Is Express running on port 3000?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh overflow-hidden">
      {/* Brand side */}
      <aside className="relative hidden w-[48%] overflow-hidden bg-[linear-gradient(155deg,oklch(0.38_0.08_195),oklch(0.32_0.07_210)_50%,oklch(0.28_0.06_230))] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
        <LoginAtmosphere variant="brand" />

        <div className="animate-fade-up relative z-10 flex items-center gap-3">
          <div className="animate-soft-bounce flex size-11 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-white/80 uppercase">
              Office MIS
            </p>
            <p className="text-xs text-white/50">Classes · Students · Fees</p>
          </div>
        </div>

        <div className="animate-fade-up relative z-10 space-y-7 [animation-delay:100ms]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/85 backdrop-blur-md">
            <Sparkles className="size-3.5 text-[oklch(0.9_0.06_195)]" />
            Smooth, modern workspace
          </div>

          <h1 className="max-w-md text-4xl leading-[1.12] font-semibold tracking-tight text-white xl:text-5xl">
            Manage your office
            <span className="block bg-gradient-to-r from-white via-[oklch(0.9_0.05_195)] to-white bg-clip-text text-transparent">
              with clarity & calm.
            </span>
          </h1>

          <p className="max-w-sm text-base leading-relaxed text-white/72">
            A clear place for classes, students, attendance, and fees.
          </p>

          <div className="flex flex-col gap-3 pt-1">
            {[
              { icon: Users, label: 'Students & classes', hint: 'Training first' },
              { icon: Wallet, label: 'Fees & payments', hint: 'Clear money flow' },
            ].map((item, i) => (
              <button
                key={item.label}
                type="button"
                className="group flex w-full max-w-xs items-center gap-3 rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-left text-white/90 shadow-sm backdrop-blur-md transition-all duration-300 hover:translate-x-2 hover:border-white/30 hover:bg-white/16 hover:shadow-[0_12px_30px_-12px_oklch(0_0_0_/_0.45)]"
                style={{ animationDelay: `${180 + i * 90}ms` }}
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20 transition duration-300 group-hover:scale-110 group-hover:bg-[oklch(0.75_0.08_195_/_0.3)]">
                  <item.icon className="size-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-white/55">{item.hint}</span>
                </span>
                <ArrowRight className="size-4 opacity-0 transition duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>

        <p className="animate-fade-up relative z-10 text-sm text-white/45 [animation-delay:260ms]">
          Secure session · Built for your team
        </p>
      </aside>

      {/* Form side */}
      <main className="relative flex w-full flex-1 items-center justify-center bg-[linear-gradient(165deg,oklch(0.985_0.01_210),oklch(0.96_0.025_200)_55%,oklch(0.97_0.02_220))] px-4 py-12 sm:px-8">
        <LoginAtmosphere variant="form" />

        <SpotlightCard className="animate-fade-up w-full max-w-[430px] [animation-delay:80ms]">
          <CardHeader className="space-y-4 p-6 pb-2 text-center sm:text-left">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.4_0.08_210)] p-3 text-primary-foreground shadow-[0_12px_28px_-10px_oklch(0.48_0.09_195_/_0.55)] transition duration-500 hover:rotate-6 hover:scale-110 sm:mx-0">
              <Building2 className="size-6" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase lg:hidden">
                Office MIS
              </p>
              <CardTitle className="text-2xl tracking-tight">Welcome back</CardTitle>
              <CardDescription className="text-base">
                Sign in to continue — your dashboard is waiting.
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 p-6">
              {error ? (
                <Alert variant="destructive" className="animate-fade-up">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2 text-left">
                <Label
                  htmlFor="email"
                  className={cn('transition-colors duration-200', focused === 'email' && 'text-primary')}
                >
                  Email
                </Label>
                <div
                  className={cn(
                    'relative rounded-xl transition-all duration-300',
                    focused === 'email' && 'scale-[1.015]'
                  )}
                >
                  <Mail
                    className={cn(
                      'pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-all duration-300',
                      focused === 'email' && 'text-primary scale-110'
                    )}
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="admin@course.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    required
                    className={cn(
                      'h-12 rounded-xl border-border/80 bg-background/88 pl-11 shadow-sm transition-all duration-300',
                      'hover:border-primary/40 hover:bg-background/95',
                      'focus-visible:border-primary focus-visible:ring-primary/25'
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <Label
                  htmlFor="password"
                  className={cn(
                    'transition-colors duration-200',
                    focused === 'password' && 'text-primary'
                  )}
                >
                  Password
                </Label>
                <div
                  className={cn(
                    'relative rounded-xl transition-all duration-300',
                    focused === 'password' && 'scale-[1.015]'
                  )}
                >
                  <Lock
                    className={cn(
                      'pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-all duration-300',
                      focused === 'password' && 'text-primary scale-110'
                    )}
                  />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    required
                    className={cn(
                      'h-12 rounded-xl border-border/80 bg-background/88 pr-11 pl-11 shadow-sm transition-all duration-300',
                      'hover:border-primary/40 hover:bg-background/95',
                      'focus-visible:border-primary focus-visible:ring-primary/25'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:scale-110 hover:bg-secondary hover:text-foreground active:scale-95"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 p-6 pt-0">
              <Button
                type="submit"
                disabled={loading}
                className={cn(
                  'group relative h-12 w-full overflow-hidden rounded-xl text-base font-semibold',
                  'shadow-[0_14px_30px_-12px_oklch(0.48_0.09_195_/_0.45)] transition-all duration-300',
                  'hover:scale-[1.02] hover:shadow-[0_18px_36px_-12px_oklch(0.48_0.09_195_/_0.55)]',
                  'active:scale-[0.98]'
                )}
              >
                <span className="animate-shimmer pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,oklch(1_0_0_/_0.22)_45%,transparent_65%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Demo admin:{' '}
                <span className="font-medium text-foreground">admin@course.local</span> /{' '}
                <span className="font-medium text-foreground">Admin@123</span>
              </p>
            </CardFooter>
          </form>
        </SpotlightCard>
      </main>
    </div>
  )
}
