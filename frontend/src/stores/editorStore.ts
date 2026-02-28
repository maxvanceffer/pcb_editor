import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ComponentDefinition, GridPosition } from '@/lib/components/types'

export type Tool = 'select' | 'hand' | 'wire'

export const HOLE_SPACING = 24
export const MARGIN_LEFT = 36
export const MARGIN_TOP = 36
// Зона вокруг платы для размещения компонентов вне неё (в ячейках сетки)
export const CANVAS_PADDING = 10

export const useEditorStore = defineStore('editor', () => {
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)

  const activeTool = ref<Tool>('select')

  // Drag от sidebar
  const isDragging = ref(false)
  const draggingDef = ref<ComponentDefinition | null>(null)
  const dragPreview = ref<{ x: number; y: number; w: number; h: number } | null>(null)
  const dragGridPos = ref<GridPosition | null>(null)

  // Перемещение элемента на холсте
  const movingElementId = ref<string | null>(null)
  const movePreviewPos = ref<GridPosition | null>(null)

  // Выделение
  const selectedElementId = ref<string | null>(null)

  // Wire tool
  const wireStart = ref<GridPosition | null>(null)
  const wirePreviewEnd = ref<GridPosition | null>(null)

  // Segment cut mode: two ctrl+clicked holes on the same wire
  const segmentCutPoints = ref<GridPosition[]>([])
  const segmentCutWireId = ref<string | null>(null)

  // Board flip: view from the back/solder side
  const boardFlipped = ref(false)

  watch(activeTool, () => {
    segmentCutPoints.value = []
    segmentCutWireId.value = null
  })

  // Component types added to the project sidebar (ids)
  const projectComponentIds = ref<string[]>(
    JSON.parse(localStorage.getItem('projectComponentIds') ?? '[]'),
  )

  function addProjectComponent(id: string) {
    if (projectComponentIds.value.includes(id)) return
    projectComponentIds.value = [...projectComponentIds.value, id]
    localStorage.setItem('projectComponentIds', JSON.stringify(projectComponentIds.value))
  }

  function removeProjectComponent(id: string) {
    projectComponentIds.value = projectComponentIds.value.filter((x) => x !== id)
    localStorage.setItem('projectComponentIds', JSON.stringify(projectComponentIds.value))
  }

  // Размеры SVG платы и контейнера (обновляются из PCBBoard)
  const svgWidth = ref(0)
  const svgHeight = ref(0)
  const containerWidth = ref(0)
  const containerHeight = ref(0)

  function centerBoard() {
    if (!svgWidth.value || !containerWidth.value) return
    panX.value = Math.round((containerWidth.value - svgWidth.value * zoom.value) / 2)
    panY.value = Math.round((containerHeight.value - svgHeight.value * zoom.value) / 2)
  }

  // Скрытые элементы (по id)
  const hiddenElementIds = ref<Set<string>>(new Set())

  function toggleElementVisibility(id: string) {
    const next = new Set(hiddenElementIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    hiddenElementIds.value = next
  }

  function isElementHidden(id: string): boolean {
    return hiddenElementIds.value.has(id)
  }

  // Режим отображения меток пинов
  const showPinLabels = ref(false)

  // Пользовательские описания компонентов: ключ = componentId, значение = описание
  const componentDescriptions = ref<Record<string, string>>({})

  function setComponentDescription(componentId: string, description: string, trim = false) {
    const value = trim ? description.trim() : description
    if (value) {
      componentDescriptions.value = { ...componentDescriptions.value, [componentId]: value }
    } else {
      const next = { ...componentDescriptions.value }
      delete next[componentId]
      componentDescriptions.value = next
    }
  }

  function getComponentDescription(componentId: string): string {
    return componentDescriptions.value[componentId] ?? ''
  }

  // Пользовательские цвета компонентов: ключ = componentId, значение = hex-цвет
  const componentColors = ref<Record<string, string>>({})

  function setComponentColor(componentId: string, color: string | null) {
    if (color) {
      componentColors.value = { ...componentColors.value, [componentId]: color }
    } else {
      const next = { ...componentColors.value }
      delete next[componentId]
      componentColors.value = next
    }
  }

  function getComponentColor(componentId: string): string | null {
    return componentColors.value[componentId] ?? null
  }

  // Пользовательские метки пинов: ключ = `${componentId}:${pinId}`, значение = метка
  const pinUserLabels = ref<Record<string, string>>({})

  // Сигнальные типы для выбора
  const SIGNAL_PRESETS = ['GND', 'VCC', '3V3', '5V', 'SDA', 'SCL', 'TX', 'RX', 'MOSI', 'MISO', 'SCK', 'CS', 'INT', 'RST', 'PWM', 'ADC'] as const

  function setPinLabel(componentId: string, pinId: string, label: string) {
    const key = `${componentId}:${pinId}`
    if (label.trim()) {
      pinUserLabels.value = { ...pinUserLabels.value, [key]: label.trim() }
    } else {
      const next = { ...pinUserLabels.value }
      delete next[key]
      pinUserLabels.value = next
    }
  }

  function getPinLabel(componentId: string, pinId: string): string {
    return pinUserLabels.value[`${componentId}:${pinId}`] ?? ''
  }

  function setZoom(z: number) {
    zoom.value = Math.max(0.25, Math.min(4, z))
  }

  function pan(dx: number, dy: number) {
    panX.value += dx
    panY.value += dy
  }

  function startDrag(def: ComponentDefinition) {
    isDragging.value = true
    draggingDef.value = def
  }

  function updateDragPreview(gridPos: GridPosition) {
    if (!draggingDef.value) return
    dragGridPos.value = gridPos
    dragPreview.value = {
      x: MARGIN_LEFT + (gridPos.x + CANVAS_PADDING) * HOLE_SPACING,
      y: MARGIN_TOP + (gridPos.y + CANVAS_PADDING) * HOLE_SPACING,
      w: draggingDef.value.widthInHoles * HOLE_SPACING,
      h: draggingDef.value.heightInHoles * HOLE_SPACING,
    }
  }

  function endDrag() {
    isDragging.value = false
    draggingDef.value = null
    dragPreview.value = null
    dragGridPos.value = null
  }

  function pixelToGrid(
    px: number,
    py: number,
    maxCols: number,
    maxRows: number,
  ): GridPosition {
    // Смещение SVG: плата начинается с CANVAS_PADDING ячеек от края холста
    const col = Math.floor((px - MARGIN_LEFT) / HOLE_SPACING) - CANVAS_PADDING
    const row = Math.floor((py - MARGIN_TOP) / HOLE_SPACING) - CANVAS_PADDING
    return {
      x: Math.max(-CANVAS_PADDING, Math.min(col, maxCols - 1 + CANVAS_PADDING)),
      y: Math.max(-CANVAS_PADDING, Math.min(row, maxRows - 1 + CANVAS_PADDING)),
    }
  }

  function gridToPixelCenter(gx: number, gy: number): { x: number; y: number } {
    return {
      x: MARGIN_LEFT + (gx + CANVAS_PADDING) * HOLE_SPACING + HOLE_SPACING / 2,
      y: MARGIN_TOP + (gy + CANVAS_PADDING) * HOLE_SPACING + HOLE_SPACING / 2,
    }
  }

  return {
    zoom, panX, panY, activeTool,
    isDragging, draggingDef, dragPreview, dragGridPos,
    movingElementId, movePreviewPos,
    selectedElementId,
    wireStart, wirePreviewEnd,
    projectComponentIds, addProjectComponent, removeProjectComponent,
    hiddenElementIds, toggleElementVisibility, isElementHidden,
    svgWidth, svgHeight, containerWidth, containerHeight, centerBoard,
    showPinLabels, pinUserLabels, SIGNAL_PRESETS,
    componentDescriptions, setComponentDescription, getComponentDescription,
    componentColors, setComponentColor, getComponentColor,
    segmentCutPoints, segmentCutWireId,
    boardFlipped,
    setZoom, pan, startDrag, updateDragPreview, endDrag,
    pixelToGrid, gridToPixelCenter, setPinLabel, getPinLabel,
  }
})
