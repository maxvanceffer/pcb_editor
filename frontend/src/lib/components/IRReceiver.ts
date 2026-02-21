import { v4 as uuid } from 'uuid'
import { BaseComponent } from './BaseComponent'
import type { GridPosition, Pin, SerializedElement } from './types'

export class IRReceiverComponent extends BaseComponent {
  readonly type = 'ir-receiver'
  readonly name = 'IR Receiver Module'
  readonly widthInHoles = 3
  readonly heightInHoles = 2
  readonly color = '#1a1a2e'
  readonly pins: Pin[]

  constructor(
    position: GridPosition,
    rotation: 0 | 90 | 180 | 270 = 0,
    id?: string,
  ) {
    super(id ?? uuid(), position, rotation)
    this.pins = [
      { id: 'out', label: 'OUT', offsetX: 0, offsetY: 0, connectedWireIds: [] },
      { id: 'vcc', label: 'VCC', offsetX: 1, offsetY: 0, connectedWireIds: [] },
      { id: 'gnd', label: 'GND', offsetX: 2, offsetY: 0, connectedWireIds: [] },
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
