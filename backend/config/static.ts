import { defineConfig } from '@adonisjs/static'

const staticConfig = defineConfig({
  enabled: true,
  etag: true,
  lastModified: true,
  dotFiles: 'ignore',
  maxAge: '30d',
})

export default staticConfig
