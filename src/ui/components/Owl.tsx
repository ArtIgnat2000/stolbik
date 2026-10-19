import type { CSSProperties } from 'react'
import { BLOB_ART_SLOTS, ITEM_ART_IDS } from '../shopArt'
import { ItemArtImages } from './ItemArtImages'

interface ShoeStyle {
  shape: 'sneaker' | 'boot' | 'sandal' | 'fin'
  color: string
  dark: string
  glow?: boolean
}

const SHOE_STYLES: Record<string, ShoeStyle> = {
  'shoes-first-step': { shape: 'sneaker', color: '#6fc7b8', dark: '#42988e' },
  'shoes-cozy': { shape: 'sandal', color: '#b39ae8', dark: '#8a71c9' },
  'shoes-breeze': { shape: 'sneaker', color: '#6ab6e8', dark: '#3f86c9' },
  'shoes-autumn': { shape: 'boot', color: '#e8a04f', dark: '#c97f2e' },
  'shoes-snowflake': { shape: 'boot', color: '#a9cdf2', dark: '#6d9fd4' },
  'shoes-fins': { shape: 'fin', color: '#4fc9c1', dark: '#2f9c96' },
  'shoes-neon': { shape: 'sneaker', color: '#c8f25c', dark: '#8fbe2e', glow: true }
}

function ShoeShape({ shape, color, dark }: ShoeStyle) {
  if (shape === 'sneaker') {
    return <g strokeLinejoin="round" strokeLinecap="round">
      <path d="M-11 117v-6c0-2.8 2.2-5 5-5h2.5c1.8 0 3.2 1 4 2.5l1.6 2.6c2 1 5 1.9 8 1.9v4z" fill={color} stroke={dark} strokeWidth="1.6" />
      <rect x="-13" y="116" width="26" height="7" rx="3.5" fill="#fff8ea" stroke={dark} strokeWidth="1.6" />
      <path d="M-4.5 110.5l3.5 2.2" fill="none" stroke="#fff" strokeWidth="1.8" />
    </g>
  }
  if (shape === 'boot') {
    return <g strokeLinejoin="round" strokeLinecap="round">
      <path d="M-10 117v-12c0-3 2.5-5.5 5.5-5.5h3c3 0 5.5 2.5 5.5 5.5v12z" fill={color} stroke={dark} strokeWidth="1.6" />
      <path d="M-10 106h19" fill="none" stroke={dark} strokeWidth="1.5" opacity=".55" />
      <rect x="-12.5" y="115.5" width="26" height="7" rx="3.5" fill="#fff8ea" stroke={dark} strokeWidth="1.6" />
    </g>
  }
  if (shape === 'sandal') {
    return <g strokeLinejoin="round" strokeLinecap="round">
      <path d="M-7.5 118c0-4 3-7 7-7s7 3 7 7" fill="none" stroke={dark} strokeWidth="2.4" />
      <rect x="-12" y="117" width="24" height="6.5" rx="3.25" fill={color} stroke={dark} strokeWidth="1.6" />
    </g>
  }
  return <g strokeLinejoin="round" strokeLinecap="round">
    <path d="M-6 113h6c6 0 13 2 17 6.5-5 4-12 6.5-17 5.5-3.5-.7-6-4-6-8z" fill={color} stroke={dark} strokeWidth="1.6" />
    <circle cx="-2" cy="117" r="3" fill="#fff8ea" stroke={dark} strokeWidth="1.3" />
  </g>
}

function ShoeLayer({ shoeId }: { shoeId: string }) {
  const style = SHOE_STYLES[shoeId]
  if (!style) return null
  return <g data-shoes={shoeId} aria-hidden="true">
    {style.glow && <ellipse cx="64" cy="125" rx="36" ry="5" fill={style.color} opacity=".3" />}
    <g transform="translate(46 0) scale(-1 1)"><ShoeShape {...style} /></g>
    <g transform="translate(82 0)"><ShoeShape {...style} /></g>
  </g>
}

interface OwlProps {
  size?: number
  accent?: string
  accessories?: readonly string[]
  className?: string
}

export function Owl({ size = 96, accent = '#7560df', accessories = [], className = '' }: OwlProps) {
  const style: CSSProperties = { width: size, height: size, flex: '0 0 auto' }
  const shoeId = accessories.find((id) => id in SHOE_STYLES)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
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
      {accessories.includes('cap') && !ITEM_ART_IDS.has('cap') && <path d="M34 37c7-12 19-19 31-19s25 7 31 19v7H34v-7Zm53 8c14 1 22 5 22 10H85v-8Z" fill="#f1a04f" stroke="#d9883f" strokeWidth="2" strokeLinejoin="round" />}
      {accessories.includes('bow') && !ITEM_ART_IDS.has('bow') && <path d="m92 47-13-9 2 16 11-7Zm2 0 13-9-2 16-11-7Z" fill="#dc7093" stroke="#bd4d78" strokeWidth="2" strokeLinejoin="round" />}
      {accessories.includes('glasses') && !ITEM_ART_IDS.has('glasses') && <g fill="none" stroke="#52617c" strokeWidth="3"><circle cx="47" cy="68" r="17"/><circle cx="81" cy="68" r="17"/><path d="M64 67h-1m-33 0h-6m92 0h-6"/></g>}
      {accessories.includes('scarf') && !ITEM_ART_IDS.has('scarf') && <path d="M31 103c17 12 49 12 66 0l-4 10c-19 13-40 13-58 0l-4-10Zm42 8 12 2-6 14-11-3 5-13Z" fill="#5bb9aa" stroke="#42988e" strokeWidth="2" strokeLinejoin="round" />}
      {accessories.includes('medal') && !ITEM_ART_IDS.has('medal') && <g><path d="m56 103 8 7 8-7v15H56Z" fill="#e57877"/><circle cx="64" cy="119" r="9" fill="#f4c55e" stroke="#dca93e" strokeWidth="2"/><path d="m64 113 2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4Z" fill="#fff3d4"/></g>}
      {shoeId && !ITEM_ART_IDS.has(shoeId) && <ShoeLayer shoeId={shoeId} />}
      <ItemArtImages items={accessories} slots={BLOB_ART_SLOTS} />
    </svg>
  )
}
