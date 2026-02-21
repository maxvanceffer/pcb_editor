import { v4 as uuid } from 'uuid'
import { BaseComponent } from './BaseComponent'
import type { GridPosition, Pin, SerializedElement } from './types'

export class LEDComponent extends BaseComponent {
  readonly type = 'led'
  readonly name = 'LED'
  readonly widthInHoles = 1
  readonly heightInHoles = 2
  readonly color = '#e63946'
  readonly pins: Pin[]

  constructor(
    position: GridPosition,
    rotation: 0 | 90 | 180 | 270 = 0,
    id?: string,
  ) {
    super(id ?? uuid(), position, rotation)
    this.pins = [
      { id: 'vcc', label: 'VCC', offsetX: 0, offsetY: 0, connectedWireIds: [] },
      { id: 'gnd', label: 'GND', offsetX: 0, offsetY: 1, connectedWireIds: [] },
    ]
  }

  serialize(): SerializedElement {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      rotation: this.rotation,
    }
  }
}
