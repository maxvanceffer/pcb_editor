import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class Project extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column({
    prepare: (value: object) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value),
  })
  declare boardConfig: Record<string, unknown>

  @column({
    prepare: (value: unknown[]) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value),
  })
  declare elements: unknown[]

  @column({
    prepare: (value: Record<string, string>) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value),
  })
  declare pinUserLabels: Record<string, string>

  @column({
    prepare: (value: Record<string, string>) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value),
  })
  declare componentDescriptions: Record<string, string>

  @column({
    prepare: (value: Record<string, string>) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value),
  })
  declare componentColors: Record<string, string>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
