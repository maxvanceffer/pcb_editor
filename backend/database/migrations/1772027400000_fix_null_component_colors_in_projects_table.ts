import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'projects'

  async up() {
    await this.db
      .from(this.tableName)
      .whereNull('component_colors')
      .orWhere('component_colors', '')
      .update({ component_colors: '{}' })
  }

  async down() {}
}
