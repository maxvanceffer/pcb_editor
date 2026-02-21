// Маппинг типа компонента → путь к картинке в /public/components/
// Файлы должны лежать в frontend/public/components/
export const COMPONENT_IMAGES: Record<string, string> = {
  'esp32s3':      '/components/esp32s3.png',
  'ams1117-3.3':  '/components/ams1117.png',
  'ams1117-5.0':  '/components/ams1117.png',
  'ir-receiver':  '/components/ir-receiver.png',
  'led':          '/components/led.png',
}

export function getComponentImage(type: string): string | null {
  return COMPONENT_IMAGES[type] ?? null
}
