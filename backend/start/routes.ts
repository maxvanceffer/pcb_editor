import router from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'
import { middleware } from './kernel.js'
import { readdir, access } from 'node:fs/promises'

// Health check (для Railway)
router.get('/api/health', async ({ response }) => {
  return response.ok({ status: 'ok' })
})

// Auth (публичные)
router.post('/api/auth/register', '#controllers/auth_controller.register')
router.post('/api/auth/login', '#controllers/auth_controller.login')
router.delete('/api/auth/logout', '#controllers/auth_controller.logout').use(middleware.auth())
router.get('/api/auth/me', '#controllers/auth_controller.me').use(middleware.auth())
router.delete('/api/auth/account', '#controllers/auth_controller.deleteAccount').use(middleware.auth())

// Social OAuth
router.get('/api/auth/google/redirect', '#controllers/social_auth_controller.googleRedirect')
router.get('/api/auth/google/callback', '#controllers/social_auth_controller.googleCallback')
router.get('/api/auth/github/redirect', '#controllers/social_auth_controller.githubRedirect')
router.get('/api/auth/github/callback', '#controllers/social_auth_controller.githubCallback')
router.post('/api/auth/link/confirm', '#controllers/social_auth_controller.confirmLink')

// Components (публичные)
router.get('/api/components', '#controllers/components_controller.index')
router.get('/api/components/:id', '#controllers/components_controller.show')

// Settings (только авторизованные)
router.get('/api/settings', '#controllers/settings_controller.show').use(middleware.auth())
router.patch('/api/settings', '#controllers/settings_controller.update').use(middleware.auth())

// Projects (только авторизованные)
router
  .group(() => {
    router.get('/', '#controllers/projects_controller.index')
    router.post('/', '#controllers/projects_controller.store')
    router.get('/:id', '#controllers/projects_controller.show')
    router.put('/:id', '#controllers/projects_controller.update')
    router.delete('/:id', '#controllers/projects_controller.destroy')
  })
  .prefix('/api/projects')
  .use(middleware.auth())

// SPA fallback — отдаём index.html для всех не-API маршрутов
router.get('*', async ({ response, logger }) => {
  const publicDir = app.publicPath()
  const indexPath = app.publicPath('index.html')

  try {
    const files = await readdir(publicDir)
    logger.info('public/ contents: %s', files.join(', '))
  } catch {
    logger.error('public/ dir not found at: %s', publicDir)
  }

  try {
    await access(indexPath)
    logger.info('index.html found at: %s', indexPath)
  } catch {
    logger.error('index.html NOT found at: %s', indexPath)
    return response.status(404).send('index.html not found at: ' + indexPath)
  }

  return response.download(indexPath)
})
