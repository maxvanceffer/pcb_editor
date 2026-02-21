import { v4 as uuid } from 'uuid'
import { BaseComponent } from './BaseComponent'
import type { GridPosition, Pin, SerializedElement } from './types'

export class JSTConnector extends BaseComponent {
  readonly type: string
  readonly name: string
  readonly widthInHoles = 1
  readonly heightInHoles: number
  readonly color = '#e8a838'
  readonly pins: Pin[]
  readonly pinCount: number

  constructor(
    pinCount: 2 | 3 | 4 | 5 | 6,
    position: GridPosition,
    rotation: 0 | 90 | 180 | 270 = 0,
    id?: string,
  ) {
    super(id ?? uuid(), position, rotation)
    this.pinCount = pinCount
    this.heightInHoles = pinCount
    this.type = `jst-${pinCount}pin`
    this.name = `JST XH ${pinCount}-pin (2.5mm)`
    this.pins = Array.from({ length: pinCount }, (_, i) => ({
      id: `pin${i + 1}`,
      label: i === 0 ? '+' : i === pinCount - 1 ? '-' : `P${i + 1}`,
      offsetX: 0,
      offsetY: i,
      connectedWireIds: [],
    }))
  }

  serialize(): SerializedElement {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      rotation: this.rotation,
      pinCount: this.pinCount,
    }
  }
}
