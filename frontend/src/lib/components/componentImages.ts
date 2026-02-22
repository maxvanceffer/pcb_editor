// Component type → image path in /public/components/
export const COMPONENT_IMAGES: Record<string, string> = {
  'esp32s3':      '/components/esp32s3.png',
  'ams1117-3.3':  '/components/ams1117.png',
  'ams1117-5.0':  '/components/ams1117.png',
  'ir-receiver':  '/components/ir-receiver.png',
  'led':          '/components/led.png',
  'jst-2pin':     '/components/jst_2.54_2pins.png',
  'jst-3pin':     '/components/jst_2.54_3_pins.png',
  'jst-4pin':     '/components/jst_2.54_4_pins.png',
  'jst-5pin':     '/components/jst_2.54_4_pins.png',
  'jst-6pin':     '/components/jst_2.54_4_pins.png',
}

export function getComponentImage(type: string): string | null {
  return COMPONENT_IMAGES[type] ?? null
}
