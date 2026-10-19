import { ITEM_ART_IDS, artHref, artTransform, type ArtPlacement, type ArtSlot } from '../shopArt'

interface ItemArtImagesProps {
  items: readonly string[]
  slots: Readonly<Record<string, ArtPlacement>>
}

function ArtImage({ id, slot }: { id: string; slot: ArtSlot }) {
  return <image
    data-item-art={id}
    href={artHref(slot.file ? `${id}${slot.file}` : id)}
    x={slot.x}
    y={slot.y}
    width={slot.w}
    height={slot.w * slot.ratio}
    transform={artTransform(slot)}
  />
}

export function ItemArtImages({ items, slots }: ItemArtImagesProps) {
  return <>{items.filter((id) => ITEM_ART_IDS.has(id) && slots[id]).map((id) => {
    const placement = slots[id]!
    const list = Array.isArray(placement) ? placement : [placement]
    return <g key={id}>{list.map((slot, index) => <ArtImage key={index} id={id} slot={slot} />)}</g>
  })}</>
}
