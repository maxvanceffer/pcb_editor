import { v4 as uuid } from 'uuid'
import { BaseComponent } from './BaseComponent'
import type { GridPosition, Pin, SerializedElement, ComponentDefinition } from './types'

/** Handles any component from the catalog that has no dedicated implementation class. */
export class GenericComponent extends BaseComponent {
  readonly type: string
  readonly name: string
  readonly widthInHoles: number
  readonly heightInHoles: number
  readonly color: string
  readonly pins: Pin[]

  constructor(
    type: string,
    name: string,
    widthInHoles: number,
    heightInHoles: number,
    color: string,
    pins: Omit<Pin, 'connectedWireIds'>[],
    position: GridPosition,
    rotation: 0 | 90 | 180 | 270 = 0,
    id?: string,
  ) {
    super(id ?? uuid(), position, rotation)
    this.type = type
    this.name = name
    this.widthInHoles = widthInHoles
    this.heightInHoles = heightInHoles
    this.color = color
    this.pins = pins.map((p) => ({ ...p, connectedWireIds: [] }))
  }

  static fromDefinition(def: ComponentDefinition, position: GridPosition, id?: string): GenericComponent {
    return new GenericComponent(
      def.id,
      def.name,
      def.widthInHoles,
      def.heightInHoles,
      def.color,
      def.pins,
      position,
      0,
      id,
    )
  }

  serialize(): SerializedElement {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      rotation: this.rotation,
      // Store definition data so the component can be reconstructed without the catalog
      _name: this.name,
      _widthInHoles: this.widthInHoles,
      _heightInHoles: this.heightInHoles,
      _color: this.color,
      _pins: this.pins.map(({ connectedWireIds: _cw, ...rest }) => rest),
    }
  }
}
