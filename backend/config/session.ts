import { defineConfig, stores } from '@adonisjs/session'

const sessionConfig = defineConfig({
  age: '2h',
  enabled: true,
  cookieName: 'adonis_session',

  clearWithBrowser: false,

  cookie: {
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  },

  store: 'cookie',
  stores: {
    cookie: stores.cookie(),
  },
})

export default sessionConfig
