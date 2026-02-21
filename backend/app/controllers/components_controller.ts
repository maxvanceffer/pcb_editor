import type { HttpContext } from '@adonisjs/core/http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataPath = join(__dirname, '../../database/data/components.json')

function loadComponents() {
  const raw = readFileSync(dataPath, 'utf-8')
  return JSON.parse(raw).components as Record<string, unknown>[]
}

export default class ComponentsController {
  async index({ response }: HttpContext) {
    const components = loadComponents()
    return response.ok({ components })
  }

  async show({ params, response }: HttpContext) {
    const components = loadComponents()
    const component = components.find((c) => c.id === params.id)
    if (!component) {
      return response.notFound({ message: 'Component not found' })
    }
    return response.ok(component)
  }
}
