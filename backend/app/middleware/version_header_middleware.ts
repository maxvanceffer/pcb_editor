import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { APP_VERSION } from '../version.js'

export default class VersionHeaderMiddleware {
  async handle({ response }: HttpContext, next: NextFn) {
    await next()
    response.header('X-App-Version', APP_VERSION)
  }
}
