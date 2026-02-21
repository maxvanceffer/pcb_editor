import type { HttpContext } from '@adonisjs/core/http'
import User from '../models/user.js'
import { errors as authErrors } from '@adonisjs/auth'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const { email, password, fullName } = request.only(['email', 'password', 'fullName'])

    if (!email || !password) {
      return response.badRequest({ message: 'Email and password are required' })
    }

    const existing = await User.findBy('email', email)
    if (existing) {
      return response.conflict({ message: 'Email already in use' })
    }

    const user = await User.create({ email, password, fullName: fullName ?? null })
    const token = await User.accessTokens.create(user)

    return response.created({
      token: token.value!.release(),
      user: { id: user.id, email: user.email, fullName: user.fullName },
    })
  }

  async login({ request, response }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])

    try {
      const user = await User.verifyCredentials(email, password)
      const token = await User.accessTokens.create(user)

      return response.ok({
        token: token.value!.release(),
        user: { id: user.id, email: user.email, fullName: user.fullName },
      })
    } catch (error) {
      if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
        return response.unauthorized({ message: 'Invalid email or password' })
      }
      throw error
    }
  }

  async logout({ auth, response }: HttpContext) {
    const user = auth.user!
    await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    return response.ok({ message: 'Logged out' })
  }

  async me({ auth, response }: HttpContext) {
    const user = auth.user!
    return response.ok({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      oauthProvider: user.oauthProvider,
    })
  }

  async deleteAccount({ auth, response }: HttpContext) {
    const user = auth.user!
    await user.delete()
    return response.ok({ message: 'Account deleted' })
  }
}
