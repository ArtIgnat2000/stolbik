import { FULL_ART_SLOTS } from '../shopArt'
import { ItemArtImages } from './ItemArtImages'

interface DressUpOwlProps {
  accent?: string
  items?: readonly string[]
  className?: string
}

export function DressUpOwl({ accent = '#7560df', items = [], className = '' }: DressUpOwlProps) {
  return (
    <div className={`dress-up-owl ${className}`.trim()}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" role="img" aria-label="Сова БУК в полный рост">
        <g strokeLinejoin="round" strokeLinecap="round">
          <rect x="72" y="234" width="15" height="40" rx="7" fill="#efa84b" />
          <rect x="113" y="234" width="15" height="40" rx="7" fill="#efa84b" />
          <ellipse cx="79.5" cy="277" rx="16" ry="9" fill="#efa84b" />
          <ellipse cx="120.5" cy="277" rx="16" ry="9" fill="#efa84b" />
          <ellipse cx="100" cy="188" rx="62" ry="74" fill={accent} />
          <ellipse cx="40" cy="188" rx="15" ry="50" fill={accent} opacity=".85" transform="rotate(-12 40 188)" />
          <ellipse cx="160" cy="188" rx="15" ry="50" fill={accent} opacity=".85" transform="rotate(12 160 188)" />
          <ellipse cx="100" cy="198" rx="42" ry="56" fill="#fff3d4" />
          <path d="M56 44 42 6l36 18z" fill={accent} />
          <path d="M144 44 158 6l-36 18z" fill={accent} />
          <ellipse cx="100" cy="72" rx="58" ry="54" fill={accent} />
          <ellipse cx="100" cy="78" rx="50" ry="46" fill="#fff3d4" />
          <ellipse cx="79" cy="74" rx="19" ry="21" fill="#fff" />
          <ellipse cx="121" cy="74" rx="19" ry="21" fill="#fff" />
          <circle cx="83" cy="76" r="8.5" fill="#34415e" />
          <circle cx="117" cy="76" r="8.5" fill="#34415e" />
          <circle cx="85.5" cy="73" r="2.6" fill="#fff" />
          <circle cx="119.5" cy="73" r="2.6" fill="#fff" />
          <path d="m100 88-10 13h20z" fill="#efa84b" />
          <path d="M82 112c5.5 4.5 11 6.5 18 6.5s12.5-2 18-6.5" fill="none" stroke="#d99646" strokeWidth="4" />
        </g>
        <ItemArtImages items={items} slots={FULL_ART_SLOTS} />
      </svg>
    </div>
  )
}
