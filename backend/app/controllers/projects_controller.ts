import type { HttpContext } from '@adonisjs/core/http'
import Project from '../models/project.js'

export default class ProjectsController {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!
    const projects = await Project.query()
      .where('userId', user.id)
      .orderBy('updatedAt', 'desc')
      .select('id', 'name', 'description', 'createdAt', 'updatedAt')

    return response.ok({ projects })
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { name, description, boardConfig } = request.only(['name', 'description', 'boardConfig'])

    if (!name) {
      return response.badRequest({ message: 'Project name is required' })
    }

    const project = await Project.create({
      userId: user.id,
      name,
      description: description ?? null,
      boardConfig: boardConfig ?? {
        widthMm: 100,
        heightMm: 100,
        holePitchMm: 2.54,
        boardType: 'perfboard',
      },
      elements: [],
    })

    return response.created({
      id: project.id,
      name: project.name,
      description: project.description,
      boardConfig: project.boardConfig,
      elements: project.elements,
    })
  }

  async show({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const project = await Project.query()
      .where('id', params.id)
      .where('userId', user.id)
      .firstOrFail()

    return response.ok({
      id: project.id,
      name: project.name,
      description: project.description,
      boardConfig: project.boardConfig,
      elements: project.elements,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const project = await Project.query()
      .where('id', params.id)
      .where('userId', user.id)
      .firstOrFail()

    const { name, description, boardConfig, elements } = request.only([
      'name',
      'description',
      'boardConfig',
      'elements',
    ])

    project.merge({
      name: name ?? project.name,
      description: description !== undefined ? description : project.description,
      boardConfig: boardConfig ?? project.boardConfig,
      elements: elements ?? project.elements,
    })

    await project.save()

    return response.ok({ message: 'Project saved' })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const project = await Project.query()
      .where('id', params.id)
      .where('userId', user.id)
      .firstOrFail()

    await project.delete()

    return response.ok({ message: 'Project deleted' })
  }
}
