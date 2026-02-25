import { v4 as uuid } from 'uuid'
import { BaseComponent } from './BaseComponent'
import type { GridPosition, Pin, SerializedElement } from './types'

const ESP32S3_PINS: Omit<Pin, 'connectedWireIds'>[] = [
  // Left column (offsetX=0), top to bottom
  { id: 'L3V3_1', label: '3.3V', offsetX: 0, offsetY: 0  },
  { id: 'L3V3_2', label: '3.3V', offsetX: 0, offsetY: 1  },
  { id: 'RST',    label: 'RST',  offsetX: 0, offsetY: 2  },
  { id: 'IO4',    label: 'IO4',  offsetX: 0, offsetY: 3  },
  { id: 'IO5',    label: 'IO5',  offsetX: 0, offsetY: 4  },
  { id: 'IO6',    label: 'IO6',  offsetX: 0, offsetY: 5  },
  { id: 'IO7',    label: 'IO7',  offsetX: 0, offsetY: 6  },
  { id: 'IO15',   label: 'IO15', offsetX: 0, offsetY: 7  },
  { id: 'IO16',   label: 'IO16', offsetX: 0, offsetY: 8  },
  { id: 'IO17',   label: 'IO17', offsetX: 0, offsetY: 9  },
  { id: 'IO18',   label: 'IO18', offsetX: 0, offsetY: 10 },
  { id: 'IO8',    label: 'IO8',  offsetX: 0, offsetY: 11 },
  { id: 'IO3',    label: 'IO3',  offsetX: 0, offsetY: 12 },
  { id: 'IO46',   label: 'IO46', offsetX: 0, offsetY: 13 },
  { id: 'IO9',    label: 'IO9',  offsetX: 0, offsetY: 14 },
  { id: 'IO10',   label: 'IO10', offsetX: 0, offsetY: 15 },
  { id: 'IO11',   label: 'IO11', offsetX: 0, offsetY: 16 },
  { id: 'IO12',   label: 'IO12', offsetX: 0, offsetY: 17 },
  { id: 'IO13',   label: 'IO13', offsetX: 0, offsetY: 18 },
  { id: 'IO14',   label: 'IO14', offsetX: 0, offsetY: 19 },
  { id: 'L5V',    label: '5V',   offsetX: 0, offsetY: 20 },
  { id: 'LGND',   label: 'GND',  offsetX: 0, offsetY: 21 },

  // Right column (offsetX=10), top to bottom
  { id: 'RGND1',  label: 'GND',  offsetX: 10, offsetY: 0  },
  { id: 'TX',     label: 'TX',   offsetX: 10, offsetY: 1  },
  { id: 'RX',     label: 'RX',   offsetX: 10, offsetY: 2  },
  { id: 'IO1',    label: 'IO1',  offsetX: 10, offsetY: 3  },
  { id: 'IO2',    label: 'IO2',  offsetX: 10, offsetY: 4  },
  { id: 'IO42',   label: 'IO42', offsetX: 10, offsetY: 5  },
  { id: 'IO41',   label: 'IO41', offsetX: 10, offsetY: 6  },
  { id: 'IO40',   label: 'IO40', offsetX: 10, offsetY: 7  },
  { id: 'IO39',   label: 'IO39', offsetX: 10, offsetY: 8  },
  { id: 'IO38',   label: 'IO38', offsetX: 10, offsetY: 9  },
  { id: 'IO37',   label: 'IO37', offsetX: 10, offsetY: 10 },
  { id: 'IO36',   label: 'IO36', offsetX: 10, offsetY: 11 },
  { id: 'IO35',   label: 'IO35', offsetX: 10, offsetY: 12 },
  { id: 'IO0',    label: 'IO0',  offsetX: 10, offsetY: 13 },
  { id: 'IO45',   label: 'IO45', offsetX: 10, offsetY: 14 },
  { id: 'IO48',   label: 'IO48', offsetX: 10, offsetY: 15 },
  { id: 'IO47',   label: 'IO47', offsetX: 10, offsetY: 16 },
  { id: 'IO21',   label: 'IO21', offsetX: 10, offsetY: 17 },
  { id: 'IO20',   label: 'IO20', offsetX: 10, offsetY: 18 },
  { id: 'IO19',   label: 'IO19', offsetX: 10, offsetY: 19 },
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
