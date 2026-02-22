import router from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'
import { middleware } from './kernel.js'
import { readdirSync, existsSync } from 'node:fs'

// Health check (для Railway)
router.get('/api/health', async ({ response }) => {
  return response.ok({ status: 'ok' })
})

// Диагностика путей (временно)
router.get('/api/debug/paths', async ({ response }) => {
  const publicPath = app.publicPath()
  const exists = existsSync(publicPath)
  let contents: string[] = []
  let assetsContents: string[] = []
  if (exists) {
    contents = readdirSync(publicPath)
    const assetsPath = publicPath + '/assets'
    if (existsSync(assetsPath)) {
      assetsContents = readdirSync(assetsPath).slice(0, 10)
    }
  }
  return response.ok({ publicPath, exists, contents, assetsContents })
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
// Статические файлы (assets, иконки и т.д.) обрабатывает @adonisjs/static provider
router.get('*', async ({ request, response }) => {
  const url = request.url()
  // Если запрашивается статический файл — не отдаём index.html
  if (url.match(/\.(js|css|svg|png|ico|jpg|jpeg|webp|gif|woff|woff2|ttf|eot|map)$/i)) {
    return response.status(404).send('Not found')
  }
  return response.download(app.publicPath('index.html'))
})
