import type { SerializedElement, GridPosition, ComponentDefinition, WireColor } from './types'
import type { CrossingPoint } from './WireTrace'
import { BaseComponent } from './BaseComponent'
import { ESP32S3Component } from './ESP32S3'
import { JSTConnector } from './JSTConnector'
import { AMS1117Component } from './AMS1117'
import { BatteryHolder } from './BatteryHolder'
import { IRReceiverComponent } from './IRReceiver'
import { LEDComponent } from './LED'
import { WireTrace } from './WireTrace'
import { GenericComponent } from './GenericComponent'

export type AnyElement = BaseComponent | WireTrace

export class ComponentFactory {
  static create(serialized: SerializedElement): AnyElement {
    const { type, position, rotation, id } = serialized
    const rot = (rotation ?? 0) as 0 | 90 | 180 | 270

    switch (type) {
      case 'esp32s3':
        return new ESP32S3Component(position, rot, id)

      case 'jst-2pin':
        return new JSTConnector(2, position, rot, id)
      case 'jst-3pin':
        return new JSTConnector(3, position, rot, id)
      case 'jst-4pin':
        return new JSTConnector(4, position, rot, id)
      case 'jst-5pin':
        return new JSTConnector(5, position, rot, id)
      case 'jst-6pin':
        return new JSTConnector(6, position, rot, id)

      case 'ams1117-3.3':
        return new AMS1117Component('3.3', position, rot, id)
      case 'ams1117-5.0':
        return new AMS1117Component('5.0', position, rot, id)

      case 'battery-18650':
        return new BatteryHolder('18650', position, rot, id)
      case 'battery-aa':
        return new BatteryHolder('AA', position, rot, id)
      case 'battery-aaa':
        return new BatteryHolder('AAA', position, rot, id)

      case 'ir-receiver':
        return new IRReceiverComponent(position, rot, id)

      case 'led':
        return new LEDComponent(position, rot, id)

      case 'wire':
        return new WireTrace(
          (serialized.startPosition as GridPosition) ?? position,
          (serialized.endPosition as GridPosition) ?? position,
          (serialized.color as WireColor) ?? '#ff0000',
          (serialized.waypoints as GridPosition[]) ?? [],
          id,
          (serialized.crossings as CrossingPoint[]) ?? [],
          (serialized.sharedHoles as GridPosition[]) ?? [],
          (serialized.side as 'front' | 'back') ?? 'front',
        )

      default: {
        // Reconstruct from embedded definition data saved by GenericComponent.serialize()
        if (serialized._widthInHoles !== undefined) {
          type RawPin = Omit<import('./types').Pin, 'connectedWireIds'>
          return new GenericComponent(
            type,
            serialized._name as string,
            serialized._widthInHoles as number,
            serialized._heightInHoles as number,
            serialized._color as string,
            serialized._pins as RawPin[],
            position,
            rot,
            id,
          )
        }
        throw new Error(`Unknown component type: ${type}`)
      }
    }
  }

  static fromDefinition(def: ComponentDefinition, position: GridPosition): AnyElement {
    // Use dedicated class if available, otherwise fall back to GenericComponent
    const knownTypes = new Set([
      'esp32s3',
      'jst-2pin', 'jst-3pin', 'jst-4pin', 'jst-5pin', 'jst-6pin',
      'ams1117-3.3', 'ams1117-5.0',
      'battery-18650', 'battery-aa', 'battery-aaa',
      'ir-receiver',
      'led',
    ])
    if (knownTypes.has(def.id)) {
      return ComponentFactory.create({
        id: undefined as unknown as string,
        type: def.id,
        position,
        rotation: 0,
      })
    }
    return GenericComponent.fromDefinition(def, position)
  }
}
