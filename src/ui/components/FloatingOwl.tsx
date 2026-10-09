import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Owl } from './Owl'

const HELLO_LINES = [
  'Рад тебя видеть! 🦉',
  'Отлично получается — продолжай!',
  'Каждый шаг делает тебя сильнее!',
  'Не спеши, я рядом.',
  'Ух-ты! БУК танцует от радости! ✨'
]

export function FloatingOwl({ accent, accessories }: { accent: string; accessories: readonly string[] }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [message, setMessage] = useState('Привет! Я БУК. Нажми на меня, если нужна поддержка.')
  const [collapsed, setCollapsed] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [tapCount, setTapCount] = useState(0)
  const [dancing, setDancing] = useState(false)
  const pointer = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)
  const danceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onScroll = () => {
      setHidden(true)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
      scrollTimer.current = setTimeout(() => setHidden(false), 750)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
      if (danceTimer.current) clearTimeout(danceTimer.current)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
    }
  }, [])

  const handleDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointer.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y, moved: false }
    longPressed.current = false
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true
      setMessage('Секретное совиное приветствие! Ты настоящий исследователь 🌟')
    }, 750)
  }

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointer.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      start.moved = true
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
      const maxX = Math.max(12, window.innerWidth - 82)
      const maxY = Math.max(12, window.innerHeight - 108)
      setOffset({
        x: Math.max(-window.innerWidth + 96, Math.min(maxX - (window.innerWidth - 90), start.ox + dx)),
        y: Math.max(-window.innerHeight + 120, Math.min(maxY - (window.innerHeight - 112), start.oy + dy))
      })
    }
  }

  const handleUp = () => {
    const start = pointer.current
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    pointer.current = null
    if (!start || start.moved || longPressed.current) return
    const nextCount = tapCount + 1
    setTapCount(nextCount)
    setMessage(HELLO_LINES[Math.min(nextCount - 1, HELLO_LINES.length - 1)] ?? HELLO_LINES[0]!)
    if (nextCount % 5 === 0) {
      setDancing(true)
      if (danceTimer.current) clearTimeout(danceTimer.current)
      danceTimer.current = setTimeout(() => setDancing(false), 900)
    }
  }

  if (hidden) return null
  return (
    <div className={`floating-owl${collapsed ? ' floating-owl-collapsed' : ''}${dancing ? ' floating-owl-dancing' : ''}`} style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
      {collapsed ? (
        <button className="owl-collapse-button" type="button" aria-label="Показать БУКа" onClick={() => setCollapsed(false)}>
          <Owl size={40} accent={accent} accessories={accessories} />
        </button>
      ) : (
        <>
          <div className="owl-speech" role="status">{message}</div>
          <div
            className="floating-owl-drag-area"
            role="button"
            tabIndex={0}
            aria-label="БУК. Перетащи сову или нажми для приветствия"
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setTapCount((count) => count + 1)
                setMessage(HELLO_LINES[(tapCount) % HELLO_LINES.length] ?? HELLO_LINES[0]!)
              }
            }}
          >
            <Owl size={72} accent={accent} accessories={accessories} />
          </div>
          <button className="owl-minimize-button" type="button" aria-label="Свернуть БУКа в угол" onClick={() => setCollapsed(true)}>−</button>
        </>
      )}
    </div>
  )
}
