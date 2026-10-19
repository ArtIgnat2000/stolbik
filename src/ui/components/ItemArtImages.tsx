import { ITEM_ART_IDS, artHref, artTransform, type ArtSlot } from '../shopArt'

interface ItemArtImagesProps {
  items: readonly string[]
  slots: Readonly<Record<string, ArtSlot>>
}

export function ItemArtImages({ items, slots }: ItemArtImagesProps) {
  return <>{items.filter((id) => ITEM_ART_IDS.has(id) && slots[id]).map((id) => {
    const slot = slots[id]!
    return <image
      key={id}
      data-item-art={id}
      href={artHref(id)}
      x={slot.x}
      y={slot.y}
      width={slot.w}
      height={slot.w * slot.ratio}
      transform={artTransform(slot)}
    />
  })}</>
}
