import { v4 as uuid } from 'uuid'
import { BaseComponent } from './BaseComponent'
import type { GridPosition, Pin, SerializedElement } from './types'

export class AMS1117Component extends BaseComponent {
  readonly type: string
  readonly name: string
  readonly widthInHoles = 1
  readonly heightInHoles = 3
  readonly color = '#1a6b3a'
  readonly pins: Pin[]
  readonly voltage: '3.3' | '5.0'

  constructor(
    voltage: '3.3' | '5.0',
    position: GridPosition,
    rotation: 0 | 90 | 180 | 270 = 0,
    id?: string,
  ) {
    super(id ?? uuid(), position, rotation)
    this.voltage = voltage
    this.type = `ams1117-${voltage}`
    this.name = `AMS1117-${voltage} LDO регулятор`
    this.pins = [
      { id: 'gnd', label: 'GND', offsetX: 0, offsetY: 0, connectedWireIds: [] },
      { id: 'out', label: 'OUT', offsetX: 0, offsetY: 1, connectedWireIds: [] },
      { id: 'in',  label: 'IN',  offsetX: 0, offsetY: 2, connectedWireIds: [] },
    ]
  }

  serialize(): SerializedElement {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      rotation: this.rotation,
      voltage: this.voltage,
    }
  }
}
