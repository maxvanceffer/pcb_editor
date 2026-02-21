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

  async googleCallback({ ally, response, logger }: HttpContext) {
    const google = ally.use('google')

    const accessDenied = google.accessDenied()
    const stateMisMatch = google.stateMisMatch()
    const hasError = google.hasError()

    logger.info('Google callback: accessDenied=%s stateMisMatch=%s hasError=%s', accessDenied, stateMisMatch, hasError)

    if (hasError) {
      logger.error('Google OAuth error: %s', google.getError())
    }

    if (accessDenied || stateMisMatch || hasError) {
      logger.warn('Google OAuth failed, redirecting to error page')
      return response.redirect(`${FRONTEND_URL()}/login?error=oauth_failed`)
    }

    const googleUser = await google.user()
    logger.info('Google user fetched: email=%s id=%s', googleUser.email, googleUser.id)

    if (!googleUser.email) {
      logger.warn('Google user has no email')
      return response.redirect(`${FRONTEND_URL()}/login?error=no_email`)
    }

    return this.handleOAuthCallback(response, logger, {
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

  async githubCallback({ ally, response, logger }: HttpContext) {
    const github = ally.use('github')

    const accessDenied = github.accessDenied()
    const stateMisMatch = github.stateMisMatch()
    const hasError = github.hasError()

    logger.info('GitHub callback: accessDenied=%s stateMisMatch=%s hasError=%s', accessDenied, stateMisMatch, hasError)

    if (hasError) {
      logger.error('GitHub OAuth error: %s', github.getError())
    }

    if (accessDenied || stateMisMatch || hasError) {
      logger.warn('GitHub OAuth failed, redirecting to error page')
      return response.redirect(`${FRONTEND_URL()}/login?error=oauth_failed`)
    }

    const githubUser = await github.user()
    logger.info('GitHub user fetched: email=%s id=%s', githubUser.email, githubUser.id)

    let email = githubUser.email
    if (!email) {
      const token = await github.accessToken()
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${token.token}`, 'User-Agent': 'tracify-app' },
      })
      const emails = (await emailsRes.json()) as { email: string; verified: boolean; primary: boolean }[]
      const primary = emails.find((e) => e.verified && e.primary)
      email = primary?.email ?? null
      logger.info('GitHub fallback email fetch: found=%s', email)
    }

    if (!email) {
      logger.warn('GitHub user has no email')
      return response.redirect(`${FRONTEND_URL()}/login?error=no_email`)
    }

    return this.handleOAuthCallback(response, logger, {
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
    logger: HttpContext['logger'],
    params: PendingOAuthData,
  ) {
    const { provider, providerId, email, fullName, avatarUrl } = params
    logger.info('handleOAuthCallback: provider=%s email=%s FRONTEND_URL=%s', provider, email, FRONTEND_URL())

    // 1. Найти по provider ID — возвращающийся пользователь
    const existingByProvider = await User.query()
      .where('oauth_provider', provider)
      .where('oauth_provider_id', providerId)
      .first()

    if (existingByProvider) {
      logger.info('Found existing user by provider: id=%s', existingByProvider.id)
      if (avatarUrl && !existingByProvider.avatarUrl) {
        existingByProvider.avatarUrl = avatarUrl
        await existingByProvider.save()
      }
      const token = await User.accessTokens.create(existingByProvider)
      const redirectUrl = `${FRONTEND_URL()}/login?token=${token.value!.release()}`
      logger.info('Redirecting existing user to: %s', redirectUrl.split('?')[0])
      return response.redirect(redirectUrl)
    }

    // 2. Найти по email — пользователь с паролем хочет войти через OAuth
    const existingByEmail = await User.findBy('email', email)

    if (existingByEmail) {
      logger.info('Found existing user by email, sending link code')
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
    logger.info('Creating new user for email=%s', email)
    const newUser = new User()
    newUser.email = email
    newUser.fullName = fullName
    newUser.oauthProvider = provider
    newUser.oauthProviderId = providerId
    newUser.avatarUrl = avatarUrl
    newUser.settings = {}
    await newUser.save()

    const token = await User.accessTokens.create(newUser)
    const redirectUrl = `${FRONTEND_URL()}/login?token=${token.value!.release()}`
    logger.info('Redirecting new user to: %s', redirectUrl.split('?')[0])
    return response.redirect(redirectUrl)
  }
}
