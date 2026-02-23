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
        )

      default:
        throw new Error(`Unknown component type: ${type}`)
    }
  }

  static fromDefinition(def: ComponentDefinition, position: GridPosition): AnyElement {
    return ComponentFactory.create({
      id: undefined as unknown as string,
      type: def.id,
      position,
      rotation: 0,
    })
  }
}
