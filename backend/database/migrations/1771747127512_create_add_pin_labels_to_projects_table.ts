import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'projects'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('pin_user_labels').notNullable().defaultTo('{}')
      table.text('component_descriptions').notNullable().defaultTo('{}')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('pin_user_labels')
      table.dropColumn('component_descriptions')
    })
  }
}
