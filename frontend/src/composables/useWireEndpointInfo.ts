import type { GridPosition } from '@/lib/components/types'
import type { WireTrace } from '@/lib/components/WireTrace'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'

// Converts 0-based column index to board label (A, B, C, ... Z, AA, AB, ...)
function colLabel(x: number): string {
  if (x < 26) return String.fromCharCode(65 + x)
  return (
    String.fromCharCode(64 + Math.floor(x / 26)) +
    String.fromCharCode(65 + (x % 26))
  )
}

export interface PinEndpoint {
  type: 'pin'
  module: string        // component type name, e.g. "JST PH 2-pin"
  description: string | null  // user-set description, null if not set
  pinLabel: string      // effective pin label
}

export interface GridEndpoint {
  type: 'grid'
  coord: string         // e.g. "C3"
}

export type EndpointInfo = PinEndpoint | GridEndpoint

export interface WireEndpointLabel {
  stops: EndpointInfo[]
  color: string
}

export function useWireEndpointInfo() {
  const projectStore = useProjectStore()
  const editorStore = useEditorStore()

  function resolvePosition(pos: GridPosition): EndpointInfo {
    for (const comp of projectStore.placedComponents) {
      for (const pin of comp.getAbsolutePinPositions()) {
        if (pin.x === pos.x && pin.y === pos.y) {
          const pinLabel = editorStore.getPinLabel(comp.id, pin.id) || pin.label
          const description = editorStore.getComponentDescription(comp.id) || null
          return { type: 'pin', module: comp.name, description, pinLabel }
        }
      }
    }
    return { type: 'grid', coord: `${colLabel(pos.x)}${pos.y + 1}` }
  }

  function describeEndpoint(pos: GridPosition): string {
    const info = resolvePosition(pos)
    if (info.type === 'pin') {
      return info.description
        ? `${info.module} · ${info.description} · ${info.pinLabel}`
        : `${info.module} · ${info.pinLabel}`
    }
    return info.coord
  }

  function getWireLabel(wire: WireTrace): WireEndpointLabel {
    const stops: EndpointInfo[] = []

    stops.push(resolvePosition(wire.startPosition))

    // Include waypoints that land on component pins as intermediate stops
    for (const wp of wire.waypoints) {
      const info = resolvePosition(wp)
      if (info.type === 'pin') stops.push(info)
    }

    stops.push(resolvePosition(wire.endPosition))

    return { stops, color: wire.color }
  }

  return { describeEndpoint, getWireLabel }
}
