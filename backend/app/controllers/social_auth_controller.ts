import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import env from '#start/env'
import { sendMail } from '#services/mail_service'

const FRONTEND_URL = () => env.get('FRONTEND_URL', 'http://localhost:5173')

interface PendingOAuthData {
  provider: string
  providerId: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default class SocialAuthController {
  // ── Google ─────────────────────────────────────────────────────────────

  async googleRedirect({ ally }: HttpContext) {
    return ally.use('google').redirect()
  }

  async googleCallback({ ally, response }: HttpContext) {
    const google = ally.use('google')

    if (google.accessDenied() || google.stateMisMatch() || google.hasError()) {
      return response.redirect(`${FRONTEND_URL()}/login?error=oauth_failed`)
    }

    const googleUser = await google.user()

    if (!googleUser.email) {
      return response.redirect(`${FRONTEND_URL()}/login?error=no_email`)
    }

    return this.handleOAuthCallback(response, {
      provider: 'google',
      providerId: googleUser.id,
      email: googleUser.email,
      fullName: googleUser.name ?? null,
      avatarUrl: googleUser.avatarUrl ?? null,
    })
  }

  // ── GitHub ─────────────────────────────────────────────────────────────

  async githubRedirect({ ally }: HttpContext) {
    return ally.use('github').redirect()
  }

  async githubCallback({ ally, response }: HttpContext) {
    const github = ally.use('github')

    if (github.accessDenied() || github.stateMisMatch() || github.hasError()) {
      return response.redirect(`${FRONTEND_URL()}/login?error=oauth_failed`)
    }

    const githubUser = await github.user()

    let email = githubUser.email
    if (!email) {
      const emails = await github.userEmails()
      const primary = emails.find((e) => e.verified && e.primary)
      email = primary?.email ?? null
    }

    if (!email) {
      return response.redirect(`${FRONTEND_URL()}/login?error=no_email`)
    }

    return this.handleOAuthCallback(response, {
      provider: 'github',
      providerId: String(githubUser.id),
      email,
      fullName: githubUser.name ?? null,
      avatarUrl: githubUser.avatarUrl ?? null,
    })
  }

  // ── Confirm link code ──────────────────────────────────────────────────

  async confirmLink({ request, response }: HttpContext) {
    const { email, code } = request.only(['email', 'code'])

    if (!email || !code) {
      return response.badRequest({ message: 'Email and code are required' })
    }

    const user = await User.findBy('email', email)

    if (!user || !user.linkCode || !user.linkCodeExpiresAt) {
      return response.unprocessableEntity({ message: 'Invalid or expired code' })
    }

    if (user.linkCode !== code) {
      return response.unprocessableEntity({ message: 'Invalid code' })
    }

    if (DateTime.now() > user.linkCodeExpiresAt) {
      return response.unprocessableEntity({ message: 'Code has expired' })
    }

    if (!user.linkPendingData) {
      return response.unprocessableEntity({ message: 'No pending OAuth data' })
    }

    const pending: PendingOAuthData = JSON.parse(user.linkPendingData)

    // Связываем аккаунт
    user.oauthProvider = pending.provider
    user.oauthProviderId = pending.providerId
    if (!user.fullName && pending.fullName) {
      user.fullName = pending.fullName
    }
    if (!user.avatarUrl && pending.avatarUrl) {
      user.avatarUrl = pending.avatarUrl
    }
    user.linkCode = null
    user.linkCodeExpiresAt = null
    user.linkPendingData = null
    await user.save()

    const token = await User.accessTokens.create(user)
    return response.ok({ token: token.value!.release() })
  }

  // ── Shared logic ────────────────────────────────────────────────────────

  private async handleOAuthCallback(
    response: HttpContext['response'],
    params: PendingOAuthData,
  ) {
    const { provider, providerId, email, fullName, avatarUrl } = params

    // 1. Найти по provider ID — возвращающийся пользователь
    const existingByProvider = await User.query()
      .where('oauth_provider', provider)
      .where('oauth_provider_id', providerId)
      .first()

    if (existingByProvider) {
      if (avatarUrl && !existingByProvider.avatarUrl) {
        existingByProvider.avatarUrl = avatarUrl
        await existingByProvider.save()
      }
      const token = await User.accessTokens.create(existingByProvider)
      return response.redirect(`${FRONTEND_URL()}/login?token=${token.value!.release()}`)
    }

    // 2. Найти по email — пользователь с паролем хочет войти через OAuth
    const existingByEmail = await User.findBy('email', email)

    if (existingByEmail) {
      // Отправляем код подтверждения для объединения аккаунтов
      const code = generateCode()
      existingByEmail.linkCode = code
      existingByEmail.linkCodeExpiresAt = DateTime.now().plus({ minutes: 15 })
      existingByEmail.linkPendingData = JSON.stringify({ provider, providerId, email, fullName, avatarUrl })
      await existingByEmail.save()

      await sendMail({
        to: email,
        subject: 'Tracify — подтверждение объединения аккаунтов',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Объединение аккаунтов</h2>
            <p>Вы пытаетесь войти через <strong>${provider}</strong> с адресом <strong>${email}</strong>, который уже зарегистрирован в Tracify.</p>
            <p>Для объединения аккаунтов введите код подтверждения:</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:24px;background:#f4f4f5;border-radius:8px;margin:16px 0">
              ${code}
            </div>
            <p style="color:#71717a;font-size:14px">Код действителен 15 минут. Если вы не запрашивали это — проигнорируйте письмо.</p>
          </div>
        `,
      })

      const linkEmail = encodeURIComponent(email)
      const providerName = encodeURIComponent(provider)
      return response.redirect(
        `${FRONTEND_URL()}/login?link_required=1&link_email=${linkEmail}&link_provider=${providerName}`,
      )
    }

    // 3. Новый пользователь
    const newUser = new User()
    newUser.email = email
    newUser.fullName = fullName
    newUser.oauthProvider = provider
    newUser.oauthProviderId = providerId
    newUser.avatarUrl = avatarUrl
    newUser.settings = {}
    await newUser.save()

    const token = await User.accessTokens.create(newUser)
    return response.redirect(`${FRONTEND_URL()}/login?token=${token.value!.release()}`)
  }
}
