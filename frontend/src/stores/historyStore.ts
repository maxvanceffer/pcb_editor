import { defineStore } from 'pinia'
import { ref, computed, markRaw } from 'vue'
import { useProjectStore } from './projectStore'
import { ComponentFactory } from '@/lib/components/ComponentFactory'
import { BaseComponent } from '@/lib/components/BaseComponent'
import type { SerializedElement, GridPosition } from '@/lib/components/types'

export type HistoryAction =
  | { type: 'add'; element: SerializedElement }
  | { type: 'remove'; element: SerializedElement }
  | { type: 'move'; id: string; from: GridPosition; to: GridPosition }
  | { type: 'rotate'; id: string; from: number; to: number }

export const useHistoryStore = defineStore('history', () => {
  const past = ref<HistoryAction[]>([])
  const future = ref<HistoryAction[]>([])

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  function describeAction(action: HistoryAction): string {
    switch (action.type) {
      case 'add': return `Добавить ${action.element.type}`
      case 'remove': return `Удалить ${action.element.type}`
      case 'move': return `Переместить элемент`
      case 'rotate': return `Повернуть элемент`
    }
  }

  function push(action: HistoryAction) {
    past.value.push(action)
    future.value = []
  }

  function undo() {
    if (!canUndo.value) return
    const action = past.value.pop()!
    future.value.push(action)
    applyInverse(action)
  }

  function redo() {
    if (!canRedo.value) return
    const action = future.value.pop()!
    past.value.push(action)
    applyForward(action)
  }

  function applyInverse(action: HistoryAction) {
    const store = useProjectStore()
    switch (action.type) {
      case 'add':
        store.removeElement(action.element.id)
        break
      case 'remove':
        store.addElement(markRaw(ComponentFactory.create(action.element)))
        break
      case 'move': {
        const el = store.getElementById(action.id)
        if (el instanceof BaseComponent) el.position = { ...action.from }
        break
      }
      case 'rotate': {
        const el = store.getElementById(action.id)
        if (el instanceof BaseComponent) el.rotation = action.from as 0 | 90 | 180 | 270
        break
      }
    }
  }

  function applyForward(action: HistoryAction) {
    const store = useProjectStore()
    switch (action.type) {
      case 'add':
        store.addElement(markRaw(ComponentFactory.create(action.element)))
        break
      case 'remove':
        store.removeElement(action.element.id)
        break
      case 'move': {
        const el = store.getElementById(action.id)
        if (el instanceof BaseComponent) el.position = { ...action.to }
        break
      }
      case 'rotate': {
        const el = store.getElementById(action.id)
        if (el instanceof BaseComponent) el.rotation = action.to as 0 | 90 | 180 | 270
        break
      }
    }
  }

  function clear() {
    past.value = []
    future.value = []
  }

  return { past, future, canUndo, canRedo, describeAction, push, undo, redo, clear }
})
