import { defineStore } from 'pinia'
import { ref, computed, shallowRef, triggerRef } from 'vue'
import api from '@/lib/api'
import { ComponentFactory, type AnyElement } from '@/lib/components/ComponentFactory'
import { BaseComponent } from '@/lib/components/BaseComponent'
import { WireTrace } from '@/lib/components/WireTrace'
import { useEditorStore } from '@/stores/editorStore'
import type { BoardConfig, SerializedElement } from '@/lib/components/types'

export const useProjectStore = defineStore('project', () => {
  const projectId = ref<number | null>(null)
  const projectName = ref('')
  const projectDescription = ref('')
  const boardConfig = ref<BoardConfig>({
    widthMm: 100,
    heightMm: 100,
    holePitchMm: 2.54,
    boardType: 'perfboard',
  })

  // shallowRef: Vue не проксирует содержимое объектов — классы сохраняют prototype
  const elements = shallowRef<AnyElement[]>([])

  const placedComponents = computed(() =>
    elements.value.filter((e): e is BaseComponent => e instanceof BaseComponent),
  )
  const wires = computed(() =>
    elements.value.filter((e): e is WireTrace => e instanceof WireTrace),
  )

  const occupiedHoles = computed(() => {
    const map = new Map<string, string>()
    for (const el of placedComponents.value) {
      for (const h of el.getOccupiedHoles()) {
        map.set(`${h.x},${h.y}`, el.id)
      }
    }
    return map
  })

  function addElement(el: AnyElement) {
    elements.value = [...elements.value, el]
  }

  function removeElement(id: string) {
    elements.value = elements.value.filter((e) => e.id !== id)
  }

  function getElementById(id: string): AnyElement | undefined {
    return elements.value.find((e) => e.id === id)
  }

  // Вызывать после мутации позиции/ротации элемента для обновления reactivity
  function notifyElementChanged() {
    triggerRef(elements)
  }

  async function loadProject(id: number) {
    const { data } = await api.get(`/api/projects/${id}`)
    projectId.value = data.id
    projectName.value = data.name
    projectDescription.value = data.description ?? ''
    boardConfig.value = data.boardConfig
    elements.value = (data.elements as SerializedElement[]).map((e) => ComponentFactory.create(e))
    // Restore pin label overrides and component descriptions
    const editorStore = useEditorStore()
    editorStore.pinUserLabels = (data.pinUserLabels as Record<string, string>) ?? {}
    editorStore.componentDescriptions = (data.componentDescriptions as Record<string, string>) ?? {}
  }

  async function saveProject() {
    if (!projectId.value) return
    const editorStore = useEditorStore()
    await api.put(`/api/projects/${projectId.value}`, {
      name: projectName.value,
      description: projectDescription.value,
      boardConfig: boardConfig.value,
      elements: elements.value.map((e) => e.serialize()),
      pinUserLabels: editorStore.pinUserLabels,
      componentDescriptions: editorStore.componentDescriptions,
    })
  }

  async function createProject(name: string, description: string, config: BoardConfig): Promise<number> {
    const { data } = await api.post('/api/projects', { name, description, boardConfig: config })
    projectId.value = data.id
    projectName.value = data.name
    projectDescription.value = data.description ?? ''
    boardConfig.value = data.boardConfig
    elements.value = []
    return data.id
  }

  function reset() {
    projectId.value = null
    projectName.value = ''
    projectDescription.value = ''
    boardConfig.value = { widthMm: 100, heightMm: 100, holePitchMm: 2.54, boardType: 'perfboard' }
    elements.value = []
  }

  return {
    projectId, projectName, projectDescription, boardConfig,
    elements, placedComponents, wires, occupiedHoles,
    addElement, removeElement, getElementById, notifyElementChanged,
    loadProject, saveProject, createProject, reset,
  }
})
