import type { GridPosition, Pin, SerializedElement } from './types'

export abstract class BaseComponent {
  readonly id: string
  abstract readonly type: string
  abstract readonly name: string
  abstract readonly widthInHoles: number
  abstract readonly heightInHoles: number
  abstract readonly pins: Pin[]
  abstract readonly color: string
  /** Whether the user can reassign pin labels for this component */
  readonly pinLabelsEditable: boolean = false

  position: GridPosition
  rotation: 0 | 90 | 180 | 270

  constructor(id: string, position: GridPosition, rotation: 0 | 90 | 180 | 270 = 0) {
    this.id = id
    this.position = { ...position }
    this.rotation = rotation
  }

  get effectiveWidth(): number {
    return this.rotation === 90 || this.rotation === 270 ? this.heightInHoles : this.widthInHoles
  }

  get effectiveHeight(): number {
    return this.rotation === 90 || this.rotation === 270 ? this.widthInHoles : this.heightInHoles
  }

  getOccupiedHoles(): GridPosition[] {
    const holes: GridPosition[] = []
    for (let dy = 0; dy < this.effectiveHeight; dy++) {
      for (let dx = 0; dx < this.effectiveWidth; dx++) {
        holes.push({ x: this.position.x + dx, y: this.position.y + dy })
      }
    }
    return holes
  }

  getAbsolutePinPositions(): Array<Pin & GridPosition> {
    return this.pins.map((pin) => {
      const rotated = this.rotatePinOffset(pin.offsetX, pin.offsetY)
      return {
        ...pin,
        x: this.position.x + rotated.x,
        y: this.position.y + rotated.y,
      }
    })
  }

  private rotatePinOffset(offsetX: number, offsetY: number): GridPosition {
    switch (this.rotation) {
      case 0:
        return { x: offsetX, y: offsetY }
      case 90:
        return { x: this.heightInHoles - 1 - offsetY, y: offsetX }
      case 180:
        return { x: this.widthInHoles - 1 - offsetX, y: this.heightInHoles - 1 - offsetY }
      case 270:
        return { x: offsetY, y: this.widthInHoles - 1 - offsetX }
    }
  }

  abstract serialize(): SerializedElement
}
