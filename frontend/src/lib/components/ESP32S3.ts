import { v4 as uuid } from 'uuid'
import { BaseComponent } from './BaseComponent'
import type { GridPosition, Pin, SerializedElement } from './types'

const ESP32S3_PINS: Omit<Pin, 'connectedWireIds'>[] = [
  // Left column (offsetX=0), top to bottom
  { id: 'L3V3_1', label: '3.3V', offsetX: 0, offsetY: 0  },
  { id: 'L3V3_2', label: '3.3V', offsetX: 0, offsetY: 1  },
  { id: 'RST',    label: 'RST',  offsetX: 0, offsetY: 2  },
  { id: 'IO4',    label: 'IO4',  offsetX: 0, offsetY: 3,  functions: ['ADC1', 'TOUCH'] },
  { id: 'IO5',    label: 'IO5',  offsetX: 0, offsetY: 4,  functions: ['ADC1', 'TOUCH'] },
  { id: 'IO6',    label: 'IO6',  offsetX: 0, offsetY: 5,  functions: ['ADC1', 'TOUCH'] },
  { id: 'IO7',    label: 'IO7',  offsetX: 0, offsetY: 6,  functions: ['ADC1', 'TOUCH'] },
  { id: 'IO15',   label: 'IO15', offsetX: 0, offsetY: 7,  functions: ['ADC2'] },
  { id: 'IO16',   label: 'IO16', offsetX: 0, offsetY: 8,  functions: ['ADC2'] },
  { id: 'IO17',   label: 'IO17', offsetX: 0, offsetY: 9,  functions: ['ADC2'] },
  { id: 'IO18',   label: 'IO18', offsetX: 0, offsetY: 10, functions: ['ADC2'] },
  { id: 'IO8',    label: 'IO8',  offsetX: 0, offsetY: 11, functions: ['SDA', 'ADC1', 'TOUCH'] },
  { id: 'IO3',    label: 'IO3',  offsetX: 0, offsetY: 12, functions: ['ADC1', 'TOUCH'] },
  { id: 'IO46',   label: 'IO46', offsetX: 0, offsetY: 13, functions: ['STRAP'] },
  { id: 'IO9',    label: 'IO9',  offsetX: 0, offsetY: 14, functions: ['SCL', 'ADC1', 'TOUCH'] },
  { id: 'IO10',   label: 'IO10', offsetX: 0, offsetY: 15, functions: ['ADC1', 'TOUCH'] },
  { id: 'IO11',   label: 'IO11', offsetX: 0, offsetY: 16, functions: ['ADC2', 'TOUCH'] },
  { id: 'IO12',   label: 'IO12', offsetX: 0, offsetY: 17, functions: ['ADC2', 'TOUCH'] },
  { id: 'IO13',   label: 'IO13', offsetX: 0, offsetY: 18, functions: ['ADC2', 'TOUCH'] },
  { id: 'IO14',   label: 'IO14', offsetX: 0, offsetY: 19, functions: ['ADC2', 'TOUCH'] },
  { id: 'L5V',    label: '5V',   offsetX: 0, offsetY: 20 },
  { id: 'LGND',   label: 'GND',  offsetX: 0, offsetY: 21 },

  // Right column (offsetX=10), top to bottom
  { id: 'RGND1',  label: 'GND',  offsetX: 10, offsetY: 0  },
  { id: 'TX',     label: 'TX',   offsetX: 10, offsetY: 1,  functions: ['UART0'] },
  { id: 'RX',     label: 'RX',   offsetX: 10, offsetY: 2,  functions: ['UART0'] },
  { id: 'IO1',    label: 'IO1',  offsetX: 10, offsetY: 3,  functions: ['ADC1', 'TOUCH'] },
  { id: 'IO2',    label: 'IO2',  offsetX: 10, offsetY: 4,  functions: ['ADC1', 'TOUCH'] },
  { id: 'IO42',   label: 'IO42', offsetX: 10, offsetY: 5,  functions: ['JTAG'] },
  { id: 'IO41',   label: 'IO41', offsetX: 10, offsetY: 6,  functions: ['JTAG'] },
  { id: 'IO40',   label: 'IO40', offsetX: 10, offsetY: 7,  functions: ['JTAG'] },
  { id: 'IO39',   label: 'IO39', offsetX: 10, offsetY: 8,  functions: ['JTAG'] },
  { id: 'IO38',   label: 'IO38', offsetX: 10, offsetY: 9  },
  { id: 'IO37',   label: 'IO37', offsetX: 10, offsetY: 10 },
  { id: 'IO36',   label: 'IO36', offsetX: 10, offsetY: 11 },
  { id: 'IO35',   label: 'IO35', offsetX: 10, offsetY: 12 },
  { id: 'IO0',    label: 'IO0',  offsetX: 10, offsetY: 13, functions: ['BOOT', 'STRAP'] },
  { id: 'IO45',   label: 'IO45', offsetX: 10, offsetY: 14, functions: ['STRAP'] },
  { id: 'IO48',   label: 'IO48', offsetX: 10, offsetY: 15, functions: ['RGB LED'] },
  { id: 'IO47',   label: 'IO47', offsetX: 10, offsetY: 16 },
  { id: 'IO21',   label: 'IO21', offsetX: 10, offsetY: 17 },
  { id: 'IO20',   label: 'IO20', offsetX: 10, offsetY: 18, functions: ['USB D+'] },
  { id: 'IO19',   label: 'IO19', offsetX: 10, offsetY: 19, functions: ['USB D-'] },
  { id: 'RGND2',  label: 'GND',  offsetX: 10, offsetY: 20 },
  { id: 'RGND3',  label: 'GND',  offsetX: 10, offsetY: 21 },
]

export class ESP32S3Component extends BaseComponent {
  readonly type = 'esp32s3'
  readonly name = 'ESP32-S3 (44-pin Dual USB)'
  readonly widthInHoles = 11
  readonly heightInHoles = 22
  readonly color = '#4a90d9'
  readonly pins: Pin[]

  constructor(position: GridPosition, rotation: 0 | 90 | 180 | 270 = 0, id?: string) {
    super(id ?? uuid(), position, rotation)
    this.pins = ESP32S3_PINS.map((p) => ({ ...p, connectedWireIds: [] }))
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
