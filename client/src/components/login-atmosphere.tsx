import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type LoginAtmosphereProps = {
  variant?: 'brand' | 'form'
  className?: string
}

export function LoginAtmosphere({ variant = 'form', className }: LoginAtmosphereProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [spot, setSpot] = useState({ x: 50, y: 40 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function onMove(e: globalThis.MouseEvent) {
      const rect = el!.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setSpot({ x, y })
    }

    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [])

  const isBrand = variant === 'brand'

  return (
    <div ref={ref} className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div
        className="absolute inset-0 transition-[background] duration-300"
        style={{
          background: isBrand
            ? `radial-gradient(600px circle at ${spot.x}% ${spot.y}%, oklch(0.75 0.08 195 / 0.28), transparent 45%)`
            : `radial-gradient(520px circle at ${spot.x}% ${spot.y}%, oklch(0.7 0.08 195 / 0.16), transparent 42%)`,
        }}
      />

      <div
        className={cn(
          'animate-float-a absolute -top-24 -left-20 size-[28rem] rounded-full blur-3xl',
          isBrand ? 'bg-[oklch(0.55_0.1_195_/_0.35)]' : 'bg-[oklch(0.8_0.06_195_/_0.35)]'
        )}
      />
      <div
        className={cn(
          'animate-float-b absolute top-1/3 -right-28 size-[26rem] rounded-full blur-3xl',
          isBrand ? 'bg-[oklch(0.7_0.08_220_/_0.25)]' : 'bg-[oklch(0.88_0.04_210_/_0.45)]'
        )}
      />
      <div
        className={cn(
          'animate-float-c absolute -bottom-32 left-1/4 size-[22rem] rounded-full blur-3xl',
          isBrand ? 'bg-[oklch(0.4_0.08_200_/_0.4)]' : 'bg-[oklch(0.75_0.05_180_/_0.2)]'
        )}
      />

      <div
        className={cn(
          'animate-drift-grid absolute inset-0 opacity-60',
          isBrand ? 'bg-dot-grid-light' : 'bg-dot-grid'
        )}
      />

      <div
        className={cn(
          'animate-beam absolute top-0 left-0 h-full w-40 bg-gradient-to-r from-transparent to-transparent',
          isBrand ? 'via-white/25' : 'via-primary/15'
        )}
      />
      <div
        className={cn(
          'animate-beam absolute top-0 left-0 h-full w-24 bg-gradient-to-r from-transparent to-transparent [animation-delay:4s]',
          isBrand ? 'via-white/15' : 'via-[oklch(0.7_0.06_195_/_0.2)]'
        )}
      />

      <div className="absolute top-1/2 left-1/2 size-2">
        <div
          className={cn(
            'animate-orbit absolute size-2.5 rounded-full',
            isBrand
              ? 'bg-white/70 shadow-[0_0_18px_oklch(1_0_0_/_0.55)]'
              : 'bg-primary/70 shadow-[0_0_16px_oklch(0.5_0.09_195_/_0.5)]'
          )}
        />
      </div>

      <div
        className={cn(
          'animate-pulse-ring absolute top-[18%] right-[12%] size-40 rounded-full border',
          isBrand ? 'border-white/20' : 'border-primary/20'
        )}
      />
      <div
        className={cn(
          'animate-pulse-ring absolute bottom-[16%] left-[10%] size-28 rounded-full border [animation-delay:1.2s]',
          isBrand ? 'border-white/15' : 'border-[oklch(0.65_0.06_195_/_0.3)]'
        )}
      />
    </div>
  )
}

type SpotlightCardProps = {
  children: ReactNode
  className?: string
}

export function SpotlightCard({ children, className }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState(false)

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-[0_24px_60px_-30px_oklch(0.35_0.05_220_/_0.35)] backdrop-blur-xl transition-all duration-500',
        'hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_32px_70px_-28px_oklch(0.45_0.08_195_/_0.25)]',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: hover
            ? `radial-gradient(420px circle at ${pos.x}px ${pos.y}px, oklch(0.7 0.08 195 / 0.12), transparent 40%)`
            : undefined,
        }}
      />
      <div
        className="pointer-events-none absolute inset-px rounded-[15px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: hover
            ? `radial-gradient(280px circle at ${pos.x}px ${pos.y}px, oklch(0.55 0.1 195 / 0.3), transparent 45%)`
            : undefined,
          mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1px',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
