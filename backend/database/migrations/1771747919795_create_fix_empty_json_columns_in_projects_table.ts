import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'projects'

  async up() {
    await this.db
      .from(this.tableName)
      .whereRaw("pin_user_labels = '' OR pin_user_labels IS NULL")
      .update({ pin_user_labels: '{}' })

    await this.db
      .from(this.tableName)
      .whereRaw("component_descriptions = '' OR component_descriptions IS NULL")
      .update({ component_descriptions: '{}' })
  }

  async down() {
    // Data migration — no rollback needed
  }
}
