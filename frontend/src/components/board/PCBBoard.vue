<template>
  <div
    ref="canvasWrap"
    class="w-full h-full overflow-hidden relative select-none"
    :style="[{ cursor: canvasCursor }, bgStyle]"
    @wheel.prevent="onWheel"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseLeave"
    @dragover.prevent="onDragOver"
    @drop.prevent="onDrop"
    @click="closeCtxMenu"
    @contextmenu.prevent="closeCtxMenu"
  >
    <!-- Context menu -->
    <div
      v-if="ctxMenu"
      class="absolute z-20 bg-background border rounded-md shadow-lg py-1 min-w-[160px] text-sm"
      :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
      @mousedown.stop
      @click.stop
    >
      <div class="px-2 py-1 text-xs text-muted-foreground border-b mb-1 truncate max-w-[160px]">{{ ctxMenu.label }}</div>
      <template v-if="ctxMenu.isComponent">
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent" @click="ctxRotate(1)">{{ t('editor.board.rotate90cw') }}</button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent" @click="ctxRotate(-1)">{{ t('editor.board.rotate90ccw') }}</button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent" @click="openPinLabels()">{{ t('editor.board.configurePins') }}</button>
        <div class="border-t my-1" />
      </template>
      <button class="w-full text-left px-3 py-1.5 hover:bg-accent text-destructive" @click="ctxDelete()">{{ t('editor.board.delete') }}</button>
    </div>

    <!-- Pin label panel -->
    <PinLabelPanel
      v-if="pinLabelPanel"
      :comp="pinLabelPanel.comp"
      :x="pinLabelPanel.x"
      :y="pinLabelPanel.y"
      @close="pinLabelPanel = null"
    />

    <!-- Wire conflict warning -->
    <Transition name="fade">
      <div
        v-if="wireConflictMsg"
        class="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm shadow-lg"
      >
        <span>⚠</span> {{ wireConflictMsg }}
      </div>
    </Transition>

    <!-- Background toggle -->
    <button
      class="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-background/80 backdrop-blur-sm text-xs text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
      @click.stop="bgMode = bgMode === 'solid' ? 'chess' : 'solid'"
      :title="bgMode === 'solid' ? 'Включить шашки' : 'Выключить шашки'"
    >
      <span class="text-[10px] leading-none">{{ bgMode === 'solid' ? '⬜' : '▪' }}</span>
      {{ bgMode === 'solid' ? t('editor.board.chess') : t('editor.board.solid') }}
    </button>
    <!-- Трансформируемый контейнер -->
    <div
      :style="{
        transform: `translate(${editorStore.panX}px, ${editorStore.panY}px) scale(${editorStore.zoom})`,
        transformOrigin: '0 0',
        position: 'absolute',
      }"
    >
      <svg
        ref="svgEl"
        :width="svgWidth"
        :height="svgHeight"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Фон холста (зона вне платы) -->
        <rect x="0" y="0" :width="svgWidth" :height="svgHeight" fill="transparent" />
        <!-- Фон платы — расширен на BOARD_PAD со всех сторон, чтобы вместить метки и дать отступы -->
        <rect
          :x="boardOffsetX - BOARD_PAD"
          :y="boardOffsetY - BOARD_PAD"
          :width="boardCols * HOLE_SPACING + BOARD_PAD * 2"
          :height="boardRows * HOLE_SPACING + BOARD_PAD * 2"
          fill="#2d5a1b"
          rx="4"
        />

        <!-- Горизонтальные полосы для stripboard -->
        <template v-if="boardConfig.boardType === 'stripboard'">
          <rect
            v-for="row in boardRows"
            :key="row"
            :x="boardOffsetX - 4"
            :y="boardOffsetY + (row - 1) * HOLE_SPACING + HOLE_SPACING / 2 - 3"
            :width="boardCols * HOLE_SPACING + 8"
            height="6"
            fill="#c8962c"
            opacity="0.4"
          />
        </template>

        <!-- Метки колонок (буквы A, B, C...) — внутри платы, в верхнем отступе -->
        <text
          v-for="(label, i) in columnLabels"
          :key="`col-${i}`"
          :x="boardOffsetX + i * HOLE_SPACING + HOLE_SPACING / 2"
          :y="boardOffsetY - BOARD_PAD * 0.3"
          :fill="wireHoverPos && wireHoverPos.x === i ? '#c8f07a' : '#7ab648'"
          :font-size="wireHoverPos && wireHoverPos.x === i ? 11 : 9"
          :font-weight="wireHoverPos && wireHoverPos.x === i ? 'bold' : 'normal'"
          text-anchor="middle"
          dominant-baseline="middle"
          font-family="monospace"
        >{{ label }}</text>

        <!-- Метки строк (цифры 1, 2, 3...) — внутри платы, в левом отступе -->
        <text
          v-for="row in boardRows"
          :key="`row-${row}`"
          :x="boardOffsetX - BOARD_PAD * 0.3"
          :y="boardOffsetY + (row - 1) * HOLE_SPACING + HOLE_SPACING / 2"
          :fill="wireHoverPos && wireHoverPos.y === row - 1 ? '#c8f07a' : '#7ab648'"
          :font-size="wireHoverPos && wireHoverPos.y === row - 1 ? 11 : 9"
          :font-weight="wireHoverPos && wireHoverPos.y === row - 1 ? 'bold' : 'normal'"
          text-anchor="middle"
          dominant-baseline="middle"
          font-family="monospace"
        >{{ row }}</text>

        <!-- Отверстия -->
        <g v-for="row in boardRows" :key="`holes-${row}`">
          <g
            v-for="col in boardCols"
            :key="`h-${col}-${row}`"
            @click="onHoleClick(col - 1, row - 1)"
          >
            <!-- Медное кольцо -->
            <circle
              :cx="holeX(col - 1)"
              :cy="holeY(row - 1)"
              :r="HOLE_RADIUS"
              :fill="holeHighlightColor(col - 1, row - 1)"
              stroke="#8a6010"
              stroke-width="0.5"
            />
            <!-- Отверстие -->
            <circle
              :cx="holeX(col - 1)"
              :cy="holeY(row - 1)"
              :r="DRILL_RADIUS"
              fill="#111"
            />
          </g>
        </g>

        <!-- Wire traces -->
        <polyline
          v-for="wire in wires"
          :key="wire.id"
          :points="wire.toSVGPoints(HOLE_SPACING, MARGIN_LEFT + CANVAS_PADDING * HOLE_SPACING, MARGIN_TOP + CANVAS_PADDING * HOLE_SPACING)"
          :stroke="wire.color"
          stroke-width="2.5"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
          :opacity="selectedId === wire.id ? 1 : 0.85"
          @click.stop="selectElement(wire.id)"
          @contextmenu.prevent.stop="openCtxMenu($event, wire.id, 'Провод', false)"
        />

        <!-- Wire preview (пунктирная линия при рисовании) -->
        <line
          v-if="wireStart && wirePreviewEnd"
          :x1="holeX(wireStart.x)"
          :y1="holeY(wireStart.y)"
          :x2="holeX(wirePreviewEnd.x)"
          :y2="holeY(wirePreviewEnd.y)"
          stroke="#ff4444"
          stroke-width="2"
          stroke-dasharray="4,3"
          stroke-linecap="round"
          pointer-events="none"
        />
        <!-- Точка начала wire -->
        <circle
          v-if="wireStart"
          :cx="holeX(wireStart.x)"
          :cy="holeY(wireStart.y)"
          r="5"
          fill="#ff4444"
          opacity="0.7"
          pointer-events="none"
        />

        <!-- Размещённые компоненты -->
        <g
          v-for="comp in placedComponents"
          v-show="!editorStore.isElementHidden(comp.id)"
          :key="comp.id"
          :style="{ cursor: activeTool === 'select' ? (movingId ? 'grabbing' : 'grab') : 'default' }"
          @click.stop="selectElement(comp.id)"
          @mousedown.stop="onComponentMouseDown($event, comp.id)"
          @contextmenu.prevent.stop="openCtxMenu($event, comp.id, comp.type, true)"
        >
          <!-- Тело компонента -->
          <rect
            :x="gridToSvgX(comp.position.x) + 1"
            :y="gridToSvgY(comp.position.y) + 1"
            :width="comp.effectiveWidth * HOLE_SPACING - 2"
            :height="comp.effectiveHeight * HOLE_SPACING - 2"
            :fill="comp.color"
            fill-opacity="0.7"
            rx="3"
            :stroke="selectedId === comp.id ? '#fff' : 'transparent'"
            stroke-width="2"
          />
          <!-- Хвостик JST (передняя сторона, куда входит кабель) -->
          <template v-if="comp.type.startsWith('jst-')">
            <!-- rotation=0: хвостик снизу -->
            <rect
              v-if="comp.rotation === 0"
              :x="gridToSvgX(comp.position.x) + comp.effectiveWidth * HOLE_SPACING / 2 - 6"
              :y="gridToSvgY(comp.position.y) + comp.effectiveHeight * HOLE_SPACING - 1"
              width="12"
              height="7"
              :fill="comp.color"
              fill-opacity="0.9"
              rx="2"
              pointer-events="none"
            />
            <!-- rotation=180: хвостик сверху -->
            <rect
              v-if="comp.rotation === 180"
              :x="gridToSvgX(comp.position.x) + comp.effectiveWidth * HOLE_SPACING / 2 - 6"
              :y="gridToSvgY(comp.position.y) - 6"
              width="12"
              height="7"
              :fill="comp.color"
              fill-opacity="0.9"
              rx="2"
              pointer-events="none"
            />
            <!-- rotation=90: хвостик слева -->
            <rect
              v-if="comp.rotation === 90"
              :x="gridToSvgX(comp.position.x) - 6"
              :y="gridToSvgY(comp.position.y) + comp.effectiveHeight * HOLE_SPACING / 2 - 6"
              width="7"
              height="12"
              :fill="comp.color"
              fill-opacity="0.9"
              rx="2"
              pointer-events="none"
            />
            <!-- rotation=270: хвостик справа -->
            <rect
              v-if="comp.rotation === 270"
              :x="gridToSvgX(comp.position.x) + comp.effectiveWidth * HOLE_SPACING - 1"
              :y="gridToSvgY(comp.position.y) + comp.effectiveHeight * HOLE_SPACING / 2 - 6"
              width="7"
              height="12"
              :fill="comp.color"
              fill-opacity="0.9"
              rx="2"
              pointer-events="none"
            />
          </template>
          <!-- Название компонента (скрывается в режиме меток пинов) -->
          <text
            v-if="!showPinLabels"
            :x="gridToSvgX(comp.position.x) + comp.effectiveWidth * HOLE_SPACING / 2"
            :y="gridToSvgY(comp.position.y) + comp.effectiveHeight * HOLE_SPACING / 2"
            fill="white"
            font-size="8"
            text-anchor="middle"
            dominant-baseline="middle"
            font-family="monospace"
            font-weight="bold"
            pointer-events="none"
          >{{ comp.type }}</text>
          <!-- Пины компонента -->
          <g v-for="pin in comp.getAbsolutePinPositions()" :key="pin.id">
            <circle
              :cx="holeX(pin.x)"
              :cy="holeY(pin.y)"
              :r="HOLE_RADIUS - 0.5"
              fill="#ffd700"
              stroke="#a07010"
              stroke-width="0.5"
            />
            <!-- Метка пина в режиме showPinLabels -->
            <template v-if="showPinLabels">
              <text
                :x="pinLabelX(comp, pin)"
                :y="holeY(pin.y) + 2"
                :fill="pinLabelColor(comp.id, pin.id, pin.label)"
                :text-anchor="pinLabelAnchor(comp, pin)"
                font-size="6"
                font-family="monospace"
                font-weight="bold"
                pointer-events="none"
              >{{ editorStore.getPinLabel(comp.id, pin.id) || pin.label }}</text>
            </template>
          </g>
        </g>

        <!-- Drag preview ghost -->
        <rect
          v-if="dragPreview"
          :x="dragPreview.x + 1"
          :y="dragPreview.y + 1"
          :width="dragPreview.w - 2"
          :height="dragPreview.h - 2"
          fill="rgba(100,140,255,0.35)"
          stroke="#6688ff"
          stroke-width="1.5"
          stroke-dasharray="5,3"
          rx="3"
          pointer-events="none"
        />

        <!-- Move preview ghost -->
        <rect
          v-if="movePreviewPos && movingId"
          :x="gridToSvgX(movePreviewPos.x) + 1"
          :y="gridToSvgY(movePreviewPos.y) + 1"
          :width="movingWidth - 2"
          :height="movingHeight - 2"
          fill="rgba(100,200,100,0.3)"
          stroke="#44dd44"
          stroke-width="1.5"
          stroke-dasharray="5,3"
          rx="3"
          pointer-events="none"
        />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore, HOLE_SPACING, MARGIN_LEFT, MARGIN_TOP, CANVAS_PADDING } from '@/stores/editorStore'
import { useHistoryStore } from '@/stores/historyStore'
import { ComponentFactory } from '@/lib/components/ComponentFactory'
import { WireTrace } from '@/lib/components/WireTrace'
import { BaseComponent } from '@/lib/components/BaseComponent'
import type { GridPosition } from '@/lib/components/types'
import PinLabelPanel from '@/components/editor/PinLabelPanel.vue'

const { t } = useI18n()

const HOLE_RADIUS = 4
const DRILL_RADIUS = 2
// Внутренний отступ платы: место для меток колонок/строк и пропорциональный отступ с других сторон
const BOARD_PAD = 26

const bgMode = ref<'solid' | 'chess'>('chess')
const bgStyle = computed(() => {
  if (bgMode.value === 'solid') {
    return { backgroundColor: 'hsl(240 5% 14%)' }
  }
  return {
    backgroundColor: 'hsl(240 5% 18%)',
    backgroundImage: [
      'linear-gradient(45deg, hsl(240 5% 22%) 25%, transparent 25%)',
      'linear-gradient(-45deg, hsl(240 5% 22%) 25%, transparent 25%)',
      'linear-gradient(45deg, transparent 75%, hsl(240 5% 22%) 75%)',
      'linear-gradient(-45deg, transparent 75%, hsl(240 5% 22%) 75%)',
    ].join(', '),
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
  }
})

const projectStore = useProjectStore()
const editorStore = useEditorStore()
const historyStore = useHistoryStore()

const canvasWrap = ref<HTMLDivElement>()

const boardConfig = computed(() => projectStore.boardConfig)
const boardCols = computed(() => Math.max(1, Math.floor(boardConfig.value.widthMm / boardConfig.value.holePitchMm)))
const boardRows = computed(() => Math.max(1, Math.floor(boardConfig.value.heightMm / boardConfig.value.holePitchMm)))

// SVG расширен на CANVAS_PADDING ячеек с каждой стороны для размещения вне платы
const svgWidth = computed(() => MARGIN_LEFT + (boardCols.value + CANVAS_PADDING * 2) * HOLE_SPACING + 16)
const svgHeight = computed(() => MARGIN_TOP + (boardRows.value + CANVAS_PADDING * 2) * HOLE_SPACING + 16)

// Смещение платы внутри холста (из-за CANVAS_PADDING)
const boardOffsetX = computed(() => MARGIN_LEFT + CANVAS_PADDING * HOLE_SPACING)
const boardOffsetY = computed(() => MARGIN_TOP + CANVAS_PADDING * HOLE_SPACING)

// Перевод grid-координаты (может быть отрицательной) в pixel
function gridToSvgX(col: number): number {
  return MARGIN_LEFT + (col + CANVAS_PADDING) * HOLE_SPACING
}
function gridToSvgY(row: number): number {
  return MARGIN_TOP + (row + CANVAS_PADDING) * HOLE_SPACING
}

const placedComponents = computed(() => projectStore.placedComponents)
const wires = computed(() => projectStore.wires)

const activeTool = computed(() => editorStore.activeTool)
const selectedId = computed(() => editorStore.selectedElementId)
const showPinLabels = computed(() => editorStore.showPinLabels)

// Определяем, с какой стороны пин относительно центра компонента
function pinIsOnRightSide(comp: BaseComponent, pin: { offsetX: number }): boolean {
  return pin.offsetX >= comp.widthInHoles / 2
}

// X-координата текста метки: внутрь от дырки
function pinLabelX(comp: BaseComponent, pin: { x: number; offsetX: number }): number {
  const cx = holeX(pin.x)
  if (pinIsOnRightSide(comp, pin)) {
    return cx - 7  // правая колонка → текст левее (внутрь)
  }
  return cx + 7   // левая колонка → текст правее (внутрь)
}

// text-anchor для метки
function pinLabelAnchor(comp: BaseComponent, pin: { offsetX: number }): string {
  return pinIsOnRightSide(comp, pin) ? 'end' : 'start'
}

// Цвет метки: пользовательская — белая, встроенная — зеленоватая, пустая у JST — оранжевая
function pinLabelColor(compId: string, pinId: string, builtinLabel: string): string {
  if (editorStore.getPinLabel(compId, pinId)) return '#ffffff'
  if (builtinLabel && builtinLabel !== '+' && builtinLabel !== '-' && !builtinLabel.startsWith('P')) return '#a8e6a0'
  return '#ffd09e'
}
const wireStart = computed(() => editorStore.wireStart)
const wirePreviewEnd = computed(() => editorStore.wirePreviewEnd)
const dragPreview = computed(() => editorStore.dragPreview)

// Позиция дырки под курсором в режиме wire (для подсветки меток строк/колонок)
const wireHoverPos = ref<GridPosition | null>(null)
const movePreviewPos = computed(() => editorStore.movePreviewPos)
const movingId = computed(() => editorStore.movingElementId)

const movingWidth = computed(() => {
  if (!movingId.value) return 0
  const el = projectStore.getElementById(movingId.value)
  if (!el || !(el instanceof BaseComponent)) return 0
  return el.effectiveWidth * HOLE_SPACING
})
const movingHeight = computed(() => {
  if (!movingId.value) return 0
  const el = projectStore.getElementById(movingId.value)
  if (!el || !(el instanceof BaseComponent)) return 0
  return el.effectiveHeight * HOLE_SPACING
})

const columnLabels = computed(() => {
  return Array.from({ length: boardCols.value }, (_, i) => {
    if (i < 26) return String.fromCharCode(65 + i)
    return String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26))
  })
})

function holeX(col: number): number {
  return MARGIN_LEFT + (col + CANVAS_PADDING) * HOLE_SPACING + HOLE_SPACING / 2
}
function holeY(row: number): number {
  return MARGIN_TOP + (row + CANVAS_PADDING) * HOLE_SPACING + HOLE_SPACING / 2
}

function holeHighlightColor(col: number, row: number): string {
  const key = `${col},${row}`
  if (projectStore.occupiedHoles.has(key)) return '#c8962c'
  if (wireStart.value && wireStart.value.x === col && wireStart.value.y === row) return '#ff4444'
  return '#c8962c'
}

// ─── Context menu ────────────────────────────────────────────────────────────
const ctxMenu = ref<{ x: number; y: number; id: string; label: string; isComponent: boolean } | null>(null)
const pinLabelPanel = ref<{ comp: BaseComponent; x: number; y: number } | null>(null)

function openCtxMenu(e: MouseEvent, id: string, label: string, isComponent: boolean) {
  editorStore.selectedElementId = id
  editorStore.movingElementId = null
  editorStore.movePreviewPos = null
  const wrap = canvasWrap.value!.getBoundingClientRect()
  let x = e.clientX - wrap.left
  let y = e.clientY - wrap.top
  // Не выходить за правый/нижний край
  if (x + 170 > wrap.width) x = wrap.width - 175
  if (y + 140 > wrap.height) y = wrap.height - 145
  ctxMenu.value = { x, y, id, label, isComponent }
}

function closeCtxMenu() {
  ctxMenu.value = null
}

function ctxRotate(dir: 1 | -1) {
  const id = ctxMenu.value?.id
  closeCtxMenu()
  if (!id) return
  const el = projectStore.getElementById(id)
  if (!(el instanceof BaseComponent)) return
  const from = el.rotation
  const to = (((el.rotation + dir * 90) % 360 + 360) % 360) as 0 | 90 | 180 | 270
  el.rotation = to
  historyStore.push({ type: 'rotate', id, from, to })
  projectStore.notifyElementChanged()
}

function openPinLabels() {
  const id = ctxMenu.value?.id
  const x = ctxMenu.value?.x ?? 0
  const y = ctxMenu.value?.y ?? 0
  closeCtxMenu()
  if (!id) return
  const el = projectStore.getElementById(id)
  if (!(el instanceof BaseComponent)) return
  const wrap = canvasWrap.value!.getBoundingClientRect()
  // Не выйти за правый/нижний край
  pinLabelPanel.value = {
    comp: el,
    x: Math.min(x, wrap.width - 295),
    y: Math.min(y, wrap.height - 340),
  }
}

function ctxDelete() {
  const id = ctxMenu.value?.id
  closeCtxMenu()
  if (!id) return
  const el = projectStore.getElementById(id)
  if (!el) return
  historyStore.push({ type: 'remove', element: el.serialize() })
  projectStore.removeElement(id)
  editorStore.selectedElementId = null
}

// ─── Wire conflict validation ────────────────────────────────────────────────
const wireConflictMsg = ref<string | null>(null)
const POWER_POS = new Set(['VCC', '5V', '3V3', 'PWR', '3.3V'])
const POWER_NEG = new Set(['GND', 'GND1', 'GND2'])

function getPinAtPos(x: number, y: number) {
  for (const comp of projectStore.placedComponents) {
    for (const pin of comp.getAbsolutePinPositions()) {
      if (pin.x === x && pin.y === y) {
        const label = (editorStore.getPinLabel(comp.id, pin.id) || pin.label).toUpperCase()
        return label
      }
    }
  }
  return null
}

function checkWireConflict(start: GridPosition, end: GridPosition): string | null {
  const a = getPinAtPos(start.x, start.y)
  const b = getPinAtPos(end.x, end.y)
  if (!a || !b) return null
  if ((POWER_NEG.has(a) && POWER_POS.has(b)) || (POWER_POS.has(a) && POWER_NEG.has(b))) {
    return `Внимание: соединение ${a} → ${b} может повредить схему!`
  }
  return null
}

// ─── Center board on mount ───────────────────────────────────────────────────
onMounted(() => {
  const wrap = canvasWrap.value
  if (!wrap) return
  const { width, height } = wrap.getBoundingClientRect()
  editorStore.containerWidth = width
  editorStore.containerHeight = height
  editorStore.svgWidth = svgWidth.value
  editorStore.svgHeight = svgHeight.value
  editorStore.centerBoard()
})

// ─── Cursor ─────────────────────────────────────────────────────────────────
const isPanning = ref(false)
const canvasCursor = computed(() => {
  if (movingId.value) return 'grabbing'
  if (activeTool.value === 'hand') return isPanning.value ? 'grabbing' : 'grab'
  if (activeTool.value === 'wire') return 'crosshair'
  if (activeTool.value === 'select') return 'default'
  return 'default'
})

// ─── Pan ─────────────────────────────────────────────────────────────────────
let panStart: { mx: number; my: number; px: number; py: number } | null = null

function onMouseDown(e: MouseEvent) {
  if (activeTool.value === 'hand') {
    isPanning.value = true
    panStart = { mx: e.clientX, my: e.clientY, px: editorStore.panX, py: editorStore.panY }
  }
}

function onMouseMove(e: MouseEvent) {
  // Pan
  if (isPanning.value && panStart) {
    editorStore.panX = panStart.px + (e.clientX - panStart.mx)
    editorStore.panY = panStart.py + (e.clientY - panStart.my)
  }

  // Wire preview + hover highlight
  if (activeTool.value === 'wire') {
    const grid = svgCoordsToGrid(e)
    wireHoverPos.value = grid
    if (grid && wireStart.value) editorStore.wirePreviewEnd = grid
  } else {
    wireHoverPos.value = null
  }

  // Move component
  if (movingId.value && activeTool.value === 'select' && !ctxMenu.value) {
    const grid = svgCoordsToGrid(e)
    if (grid) editorStore.movePreviewPos = grid
  }
}

function onMouseLeave() {
  wireHoverPos.value = null
  onMouseUp()
}

function onMouseUp(_e?: MouseEvent) {
  if (isPanning.value) {
    isPanning.value = false
    panStart = null
  }
  // Commit move
  if (movingId.value && activeTool.value === 'select' && movePreviewPos.value) {
    const el = projectStore.getElementById(movingId.value)
    if (el && el instanceof BaseComponent) {
      const from = { ...el.position }
      el.position = { ...movePreviewPos.value }
      historyStore.push({ type: 'move', id: el.id, from, to: { ...movePreviewPos.value } })
      projectStore.notifyElementChanged()
    }
    editorStore.movingElementId = null
    editorStore.movePreviewPos = null
  }
}

function onComponentMouseDown(e: MouseEvent, id: string) {
  if (activeTool.value !== 'select') return
  if (ctxMenu.value) return
  e.preventDefault()
  editorStore.movingElementId = id
  editorStore.selectedElementId = id
}

// ─── Zoom ────────────────────────────────────────────────────────────────────
function onWheel(e: WheelEvent) {
  const factor = e.deltaY > 0 ? 0.9 : 1.1
  const rect = canvasWrap.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const newZoom = Math.max(0.25, Math.min(4, editorStore.zoom * factor))
  const ratio = newZoom / editorStore.zoom
  editorStore.panX = mx - (mx - editorStore.panX) * ratio
  editorStore.panY = my - (my - editorStore.panY) * ratio
  editorStore.setZoom(newZoom)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function svgCoordsToGrid(e: MouseEvent): GridPosition | null {
  if (!canvasWrap.value) return null
  const rect = canvasWrap.value.getBoundingClientRect()
  const rawX = (e.clientX - rect.left - editorStore.panX) / editorStore.zoom
  const rawY = (e.clientY - rect.top - editorStore.panY) / editorStore.zoom
  return editorStore.pixelToGrid(rawX, rawY, boardCols.value, boardRows.value)
}

// ─── Click на плату/отверстие ────────────────────────────────────────────────
function onHoleClick(col: number, row: number) {
  if (activeTool.value === 'wire') {
    const pos: GridPosition = { x: col, y: row }
    if (!wireStart.value) {
      editorStore.wireStart = pos
    } else {
      if (wireStart.value.x === col && wireStart.value.y === row) {
        editorStore.wireStart = null
        editorStore.wirePreviewEnd = null
        return
      }
      const wire = new WireTrace(wireStart.value, pos)
      // Проверка совместимости пинов
      const conflict = checkWireConflict(wireStart.value, pos)
      if (conflict) {
        wireConflictMsg.value = conflict
        setTimeout(() => { wireConflictMsg.value = null }, 4000)
      }
      projectStore.addElement(wire)
      historyStore.push({ type: 'add', element: wire.serialize() })
      editorStore.wireStart = null
      editorStore.wirePreviewEnd = null
    }
  } else if (activeTool.value === 'select') {
    editorStore.selectedElementId = null
  }
}

function selectElement(id: string) {
  if (activeTool.value === 'select') {
    editorStore.selectedElementId = id
  }
}

// ─── Drag & Drop ─────────────────────────────────────────────────────────────
function onDragOver(e: DragEvent) {
  if (!editorStore.isDragging || !canvasWrap.value) return
  const rect = canvasWrap.value.getBoundingClientRect()
  const rawX = (e.clientX - rect.left - editorStore.panX) / editorStore.zoom
  const rawY = (e.clientY - rect.top - editorStore.panY) / editorStore.zoom
  const grid = editorStore.pixelToGrid(rawX, rawY, boardCols.value, boardRows.value)
  editorStore.updateDragPreview(grid)
}

function onDrop(e: DragEvent) {
  const typeId = e.dataTransfer?.getData('componentType')
  if (!typeId || !editorStore.dragGridPos || !canvasWrap.value) {
    editorStore.endDrag()
    return
  }

  const pos = editorStore.dragGridPos
  const def = editorStore.draggingDef

  const newEl = ComponentFactory.fromDefinition(def!, pos)
  if (newEl instanceof BaseComponent) {
    // Проверка коллизий только если хоть один пин попадает на плату
    const occupied = projectStore.occupiedHoles
    const pinsOnBoard = newEl.getOccupiedHoles().filter(
      (h) => h.x >= 0 && h.y >= 0 && h.x < boardCols.value && h.y < boardRows.value
    )
    const hasCollision = pinsOnBoard.some((h) => occupied.has(`${h.x},${h.y}`))
    if (!hasCollision) {
      projectStore.addElement(newEl)
      historyStore.push({ type: 'add', element: newEl.serialize() })
      editorStore.addToRecentlyUsed(typeId)
      editorStore.selectedElementId = newEl.id
    }
  }

  editorStore.endDrag()
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
