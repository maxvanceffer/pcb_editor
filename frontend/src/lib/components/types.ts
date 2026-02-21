export interface GridPosition {
  x: number
  y: number
}

export interface Pin {
  id: string
  label: string
  offsetX: number
  offsetY: number
  connectedWireIds: string[]
}

export interface SerializedElement {
  id: string
  type: string
  position: GridPosition
  rotation: 0 | 90 | 180 | 270
  [key: string]: unknown
}

export interface BoardConfig {
  widthMm: number
  heightMm: number
  holePitchMm: number
  boardType: 'perfboard' | 'stripboard'
}

export interface ComponentDefinition {
  id: string
  name: string
  description: string
  category: string
  widthInHoles: number
  heightInHoles: number
  color: string
  specs?: Record<string, string>
  pins: Array<{ id: string; label: string; offsetX: number; offsetY: number }>
}

export type WireColor = '#ff0000' | '#0000ff' | '#000000' | '#ffff00' | '#00ff00' | '#ff8800'
