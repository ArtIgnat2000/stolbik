import type { CSSProperties } from 'react'

interface OwlProps {
  size?: number
  accent?: string
  accessories?: readonly string[]
  className?: string
}

export function Owl({ size = 96, accent = '#7560df', accessories = [], className = '' }: OwlProps) {
  const style: CSSProperties = { width: size, height: size, flex: '0 0 auto' }
  return (
    <svg
      className={`owl-illustration ${className}`}
      style={style}
      viewBox="0 0 128 128"
      role="img"
      aria-label="Сова БУК"
    >
      <ellipse cx="64" cy="72" rx="48" ry="43" fill={accent} />
      <path d="M26 47 21 18l29 17c9-4 19-4 28 0l29-17-5 31c8 10 12 21 11 34-2 25-22 42-49 42S15 108 15 82c0-13 4-25 11-35Z" fill="#fff3d4" />
      <path d="m27 34 6 23-15 10 2-24Zm74 0-6 23 15 10-2-24Z" fill={accent} opacity=".8" />
      <ellipse cx="47" cy="68" rx="19" ry="21" fill="#fff" />
      <ellipse cx="81" cy="68" rx="19" ry="21" fill="#fff" />
      <circle cx="51" cy="70" r="8" fill="#34415e" />
      <circle cx="77" cy="70" r="8" fill="#34415e" />
      <circle cx="53" cy="67" r="2.4" fill="#fff" />
      <circle cx="79" cy="67" r="2.4" fill="#fff" />
      <path d="m64 76-10 13h20L64 76Z" fill="#efa84b" />
      <path d="M45 98c6 5 12 7 19 7s13-2 19-7" fill="none" stroke="#d99646" strokeWidth="4" strokeLinecap="round" />
      <path d="M31 101c-9 1-13 5-14 11 8 1 15-1 20-7m60-4c9 1 13 5 14 11-8 1-15-1-20-7" fill="#fff3d4" />
      {accessories.includes('cap') && <path d="M34 37c7-12 19-19 31-19s25 7 31 19v7H34v-7Zm53 8c14 1 22 5 22 10H85v-8Z" fill="#f1a04f" stroke="#d9883f" strokeWidth="2" strokeLinejoin="round" />}
      {accessories.includes('bow') && <path d="m92 47-13-9 2 16 11-7Zm2 0 13-9-2 16-11-7Z" fill="#dc7093" stroke="#bd4d78" strokeWidth="2" strokeLinejoin="round" />}
      {accessories.includes('glasses') && <g fill="none" stroke="#52617c" strokeWidth="3"><circle cx="47" cy="68" r="17"/><circle cx="81" cy="68" r="17"/><path d="M64 67h-1m-33 0h-6m92 0h-6"/></g>}
      {accessories.includes('scarf') && <path d="M31 103c17 12 49 12 66 0l-4 10c-19 13-40 13-58 0l-4-10Zm42 8 12 2-6 14-11-3 5-13Z" fill="#5bb9aa" stroke="#42988e" strokeWidth="2" strokeLinejoin="round" />}
      {accessories.includes('medal') && <g><path d="m56 103 8 7 8-7v15H56Z" fill="#e57877"/><circle cx="64" cy="119" r="9" fill="#f4c55e" stroke="#dca93e" strokeWidth="2"/><path d="m64 113 2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4Z" fill="#fff3d4"/></g>}
    </svg>
  )
}
