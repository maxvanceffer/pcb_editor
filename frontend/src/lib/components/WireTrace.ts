import { v4 as uuid } from 'uuid'
import type { GridPosition, SerializedElement, WireColor } from './types'

export interface CrossingPoint {
  withWireId: string
  point: { x: number; y: number } // SVG px координаты
  jumpOver: boolean
}

export class WireTrace {
  readonly id: string
  readonly type = 'wire'

  startPosition: GridPosition
  endPosition: GridPosition
  color: WireColor
  waypoints: GridPosition[]
  crossings: CrossingPoint[]
  // Дырки где пользователь явно выбрал "оставить раздельно" (показывать точки-индикаторы)
  sharedHoles: GridPosition[]
  // Board side where the wire is routed
  side: 'front' | 'back'

  constructor(
    startPosition: GridPosition,
    endPosition: GridPosition,
    color: WireColor = '#ff0000',
    waypoints: GridPosition[] = [],
    id?: string,
    crossings: CrossingPoint[] = [],
    sharedHoles: GridPosition[] = [],
    side: 'front' | 'back' = 'front',
  ) {
    this.id = id ?? uuid()
    this.startPosition = { ...startPosition }
    this.endPosition = { ...endPosition }
    this.color = color
    this.waypoints = waypoints.map((p) => ({ ...p }))
    this.crossings = crossings.map((c) => ({ ...c, point: { ...c.point } }))
    this.sharedHoles = sharedHoles.map((p) => ({ ...p }))
    this.side = side
  }

  getAllPoints(): GridPosition[] {
    return [this.startPosition, ...this.waypoints, this.endPosition]
  }

  toSVGPoints(holeSpacing: number, marginLeft: number, marginTop: number): string {
    return this.getAllPoints()
      .map(
        (p) =>
          `${marginLeft + p.x * holeSpacing + holeSpacing / 2},${marginTop + p.y * holeSpacing + holeSpacing / 2}`,
      )
      .join(' ')
  }

  serialize(): SerializedElement {
    return {
      id: this.id,
      type: this.type,
      position: this.startPosition,
      rotation: 0,
      startPosition: this.startPosition,
      endPosition: this.endPosition,
      color: this.color,
      waypoints: this.waypoints,
      crossings: this.crossings,
      sharedHoles: this.sharedHoles,
      side: this.side,
    }
  }
}
