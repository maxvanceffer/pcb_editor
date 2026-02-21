import type { HttpContext } from '@adonisjs/core/http'

export default class SettingsController {
  async show({ auth, response }: HttpContext) {
    const user = auth.user!
    return response.ok(user.settings ?? {})
  }

  async update({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const patch = request.body() as Record<string, unknown>
    user.settings = { ...user.settings, ...patch }
    await user.save()
    return response.ok(user.settings)
  }
}
