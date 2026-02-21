import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('password').nullable().alter()
      table.string('oauth_provider').nullable()
      table.string('oauth_provider_id').nullable()
      // Временный код для подтверждения объединения аккаунтов
      table.string('link_code').nullable()
      table.timestamp('link_code_expires_at').nullable()
      // Временные данные OAuth-сессии для хранения до подтверждения
      table.text('link_pending_data').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('password').notNullable().alter()
      table.dropColumn('oauth_provider')
      table.dropColumn('oauth_provider_id')
      table.dropColumn('link_code')
      table.dropColumn('link_code_expires_at')
      table.dropColumn('link_pending_data')
    })
  }
}
