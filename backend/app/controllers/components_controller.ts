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
  async index({ request, response }: HttpContext) {
    const qs = request.qs()
    const category = qs.category as string | undefined
    const search = (qs.search as string | undefined)?.toLowerCase().trim()
    const ids = qs.ids ? String(qs.ids).split(',').filter(Boolean) : null
    const limit = Math.min(Number(qs.limit ?? 10), 200)
    const offset = Number(qs.offset ?? 0)

    let components = loadComponents()

    if (ids?.length) {
      components = components.filter((c: any) => ids.includes(String(c.id)))
    }

    if (category) {
      components = components.filter((c: any) => c.category === category)
    }

    if (search) {
      components = components.filter(
        (c: any) =>
          String(c.name).toLowerCase().includes(search) ||
          String(c.description ?? '').toLowerCase().includes(search),
      )
    }

    const total = components.length
    const items = components.slice(offset, offset + limit)

    return response.ok({ components: items, total, limit, offset })
  }

  async categories({ response }: HttpContext) {
    const all = loadComponents()
    const cats = [...new Set(all.map((c: any) => String(c.category)))]
    // microcontroller always first
    const sorted = ['microcontroller', ...cats.filter((c) => c !== 'microcontroller')]
    return response.ok({ categories: sorted })
  }

  async show({ params, response }: HttpContext) {
    const components = loadComponents()
    const component = components.find((c: any) => c.id === params.id)
    if (!component) {
      return response.notFound({ message: 'Component not found' })
    }
    return response.ok(component)
  }
}
