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
        <!-- Context menu (virtual-trigger DropdownMenu) -->
        <DropdownMenu :open="!!ctxMenu" @update:open="(v) => { if (!v) closeCtxMenu() }">
            <DropdownMenuTrigger as-child>
                <span
                    class="absolute w-0 h-0 overflow-hidden pointer-events-none opacity-0"
                    :style="{ left: (ctxMenu?.x ?? 0) + 'px', top: (ctxMenu?.y ?? 0) + 'px' }"
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" :side-offset="0">
                <DropdownMenuLabel class="text-xs text-muted-foreground font-medium truncate max-w-48">
                    {{ ctxMenu?.label }}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <template v-if="ctxMenu?.isComponent">
                    <DropdownMenuItem @select="ctxRotate(1)">
                        <RotateCw /> {{ t("editor.board.rotate90cw") }}
                    </DropdownMenuItem>
                    <DropdownMenuItem @select="ctxRotate(-1)">
                        <RotateCcw /> {{ t("editor.board.rotate90ccw") }}
                    </DropdownMenuItem>
                    <DropdownMenuItem @select="openPinLabels()">
                        <SlidersHorizontal /> {{ t("editor.board.configure") }}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                </template>
                <template v-else>
                    <DropdownMenuItem @select="openWireConfig()">
                        <SlidersHorizontal /> {{ t("editor.board.configure") }}
                    </DropdownMenuItem>
                    <DropdownMenuItem @select="ctxCheckCrossings()">
                        <Network /> {{ t("editor.board.wireCheckCrossings") }}
                    </DropdownMenuItem>
                    <DropdownMenuItem @select="ctxMergeWires()">
                        <GitMerge /> {{ t("editor.board.wireMerge") }}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                </template>
                <DropdownMenuItem variant="destructive" @select="ctxDelete()">
                    <Trash2 /> {{ t("editor.board.delete") }}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <!-- Component config dialog -->
        <ComponentConfigDialog
            :open="configDialogOpen"
            :comp="configDialogComp"
            @update:open="configDialogOpen = $event"
        />

        <!-- Wire config dialog -->
        <WireConfigDialog
            :open="wireConfigDialogOpen"
            :wire="wireConfigDialogWire"
            @update:open="wireConfigDialogOpen = $event"
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

        <!-- Wire toast (инфо) -->
        <Transition name="fade">
            <div
                v-if="wireToastMsg"
                class="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm shadow-lg"
            >
                {{ wireToastMsg }}
            </div>
        </Transition>

        <!-- Top-right toolbar: board side + background toggle -->
        <div class="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm border rounded-md px-1 py-0.5">
            <!-- Board side indicator -->
            <div
                class="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors"
                :class="editorStore.boardFlipped
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground'"
            >
                <span class="text-[10px] leading-none">{{ editorStore.boardFlipped ? '▼' : '▲' }}</span>
                {{ editorStore.boardFlipped ? t('editor.board.bottomSide') : t('editor.board.topSide') }}
            </div>
            <div class="w-px h-3.5 bg-border" />
            <!-- Background toggle -->
            <button
                class="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                @click.stop="bgMode = bgMode === 'solid' ? 'chess' : 'solid'"
                :title="bgMode === 'solid' ? 'Включить шашки' : 'Выключить шашки'"
            >
                <span class="text-[10px] leading-none">{{
                    bgMode === "solid" ? "⬜" : "▪"
                }}</span>
                {{
                    bgMode === "solid"
                        ? t("editor.board.chess")
                        : t("editor.board.solid")
                }}
            </button>
        </div>
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
                <rect
                    x="0"
                    y="0"
                    :width="svgWidth"
                    :height="svgHeight"
                    fill="transparent"
                />
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
                        :y="
                            boardOffsetY +
                            (row - 1) * HOLE_SPACING +
                            HOLE_SPACING / 2 -
                            3
                        "
                        :width="boardCols * HOLE_SPACING + 8"
                        height="6"
                        fill="#c8962c"
                        opacity="0.4"
                    />
                </template>

                <!-- Метки колонок (буквы A, B, C...) — внутри платы, в верхнем отступе -->
                <text
                    v-for="(label, i) in displayColumnLabels"
                    :key="`col-${i}`"
                    :x="boardOffsetX + i * HOLE_SPACING + HOLE_SPACING / 2"
                    :y="boardOffsetY - BOARD_PAD * 0.3"
                    :fill="
                        wireHoverPos && wireHoverPos.x === gridColForLabelIndex(i)
                            ? '#c8f07a'
                            : '#7ab648'
                    "
                    :font-size="wireHoverPos && wireHoverPos.x === gridColForLabelIndex(i) ? 11 : 9"
                    :font-weight="
                        wireHoverPos && wireHoverPos.x === gridColForLabelIndex(i) ? 'bold' : 'normal'
                    "
                    text-anchor="middle"
                    dominant-baseline="middle"
                    font-family="monospace"
                >
                    {{ label }}
                </text>

                <!-- Back view indicator -->
                <text
                    v-if="editorStore.boardFlipped"
                    :x="boardOffsetX + (boardCols * HOLE_SPACING) / 2"
                    :y="boardOffsetY + boardRows * HOLE_SPACING + BOARD_PAD * 0.6"
                    fill="#7ab648"
                    font-size="9"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    font-family="monospace"
                    opacity="0.7"
                >
                    {{ t('editor.board.backView') }}
                </text>

                <!-- Метки строк (цифры 1, 2, 3...) — внутри платы, в левом отступе -->
                <text
                    v-for="row in boardRows"
                    :key="`row-${row}`"
                    :x="boardOffsetX - BOARD_PAD * 0.3"
                    :y="
                        boardOffsetY +
                        (row - 1) * HOLE_SPACING +
                        HOLE_SPACING / 2
                    "
                    :fill="
                        wireHoverPos && wireHoverPos.y === row - 1
                            ? '#c8f07a'
                            : '#7ab648'
                    "
                    :font-size="
                        wireHoverPos && wireHoverPos.y === row - 1 ? 11 : 9
                    "
                    :font-weight="
                        wireHoverPos && wireHoverPos.y === row - 1
                            ? 'bold'
                            : 'normal'
                    "
                    text-anchor="middle"
                    dominant-baseline="middle"
                    font-family="monospace"
                >
                    {{ row }}
                </text>

                <!-- Отверстия -->
                <g v-for="row in boardRows" :key="`holes-${row}`">
                    <g
                        v-for="col in boardCols"
                        :key="`h-${col}-${row}`"
                        @click="onHoleClick($event, col - 1, row - 1)"
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
                <template v-for="wire in visibleWires" :key="wire.id">
                    <!-- Simple wire (no jump-over crossings) -->
                    <polyline
                        v-if="!wire.crossings.some((c) => c.jumpOver)"
                        :points="wirePoints(wire)"
                        :stroke="wire.color"
                        stroke-width="2.5"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        :opacity="selectedId === wire.id ? 1 : 0.85"
                        @click.stop="selectElement(wire.id)"
                        @contextmenu.prevent.stop="
                            openCtxMenu($event, wire.id, 'Провод', false)
                        "
                        @mousemove="onWireMouseMove($event, wire.id)"
                        @mouseleave="hoveredWireId = null"
                    />
                    <!-- Провод с jump-over арками -->
                    <path
                        v-else
                        :d="buildWirePath(wire)"
                        :stroke="wire.color"
                        stroke-width="2.5"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        :opacity="selectedId === wire.id ? 1 : 0.85"
                        @click.stop="selectElement(wire.id)"
                        @contextmenu.prevent.stop="
                            openCtxMenu($event, wire.id, 'Провод', false)
                        "
                        @mousemove="onWireMouseMove($event, wire.id)"
                        @mouseleave="hoveredWireId = null"
                    />
                </template>

                <!-- Индикаторы нескольких проводов в одной дырке -->
                <g
                    v-for="(junc, i) in junctionHoles"
                    :key="`junc-${i}`"
                    pointer-events="none"
                >
                    <circle
                        :cx="junc.x - 2"
                        :cy="junc.y - 2"
                        r="1.5"
                        fill="white"
                        opacity="0.75"
                    />
                    <circle
                        :cx="junc.x + 2"
                        :cy="junc.y + 2"
                        r="1.5"
                        fill="white"
                        opacity="0.75"
                    />
                </g>

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
                    :style="{
                        cursor:
                            activeTool === 'select'
                                ? movingId
                                    ? 'grabbing'
                                    : 'grab'
                                : 'default',
                    }"
                    @click.stop="selectElement(comp.id)"
                    @mousedown.stop="onComponentMouseDown($event, comp.id)"
                    @contextmenu.prevent.stop="
                        openCtxMenu($event, comp.id, comp.type, true)
                    "
                    @mouseenter="hoveredCompId = comp.id"
                    @mouseleave="hoveredCompId = null"
                >
                    <!-- Тело компонента -->
                    <rect
                        :x="compRectX(comp)"
                        :y="gridToSvgY(comp.position.y) + 1"
                        :width="comp.effectiveWidth * HOLE_SPACING - 2"
                        :height="comp.effectiveHeight * HOLE_SPACING - 2"
                        :fill="compColor(comp.id, comp.color)"
                        :fill-opacity="editorStore.boardFlipped ? 0.35 : 0.7"
                        rx="3"
                        :stroke="
                            selectedId === comp.id ? '#fff' : 'transparent'
                        "
                        stroke-width="2"
                    />
                    <!-- JST front tab (cable entry side, not shown in back view) -->
                    <template v-if="comp.type.startsWith('jst-') && !editorStore.boardFlipped">
                        <!-- rotation=0: pins vertical, tab on the right -->
                        <rect
                            v-if="comp.rotation === 0"
                            :x="
                                gridToSvgX(comp.position.x) +
                                comp.effectiveWidth * HOLE_SPACING -
                                1
                            "
                            :y="
                                gridToSvgY(comp.position.y) +
                                (comp.effectiveHeight * HOLE_SPACING) / 2 -
                                6
                            "
                            width="7"
                            height="12"
                            :fill="compColor(comp.id, comp.color)"
                            fill-opacity="0.9"
                            rx="2"
                            pointer-events="none"
                        />
                        <!-- rotation=180: pins vertical flipped, tab on the left -->
                        <rect
                            v-if="comp.rotation === 180"
                            :x="gridToSvgX(comp.position.x) - 6"
                            :y="
                                gridToSvgY(comp.position.y) +
                                (comp.effectiveHeight * HOLE_SPACING) / 2 -
                                6
                            "
                            width="7"
                            height="12"
                            :fill="compColor(comp.id, comp.color)"
                            fill-opacity="0.9"
                            rx="2"
                            pointer-events="none"
                        />
                        <!-- rotation=90: pins horizontal, tab on the bottom -->
                        <rect
                            v-if="comp.rotation === 90"
                            :x="
                                gridToSvgX(comp.position.x) +
                                (comp.effectiveWidth * HOLE_SPACING) / 2 -
                                6
                            "
                            :y="
                                gridToSvgY(comp.position.y) +
                                comp.effectiveHeight * HOLE_SPACING -
                                1
                            "
                            width="12"
                            height="7"
                            :fill="compColor(comp.id, comp.color)"
                            fill-opacity="0.9"
                            rx="2"
                            pointer-events="none"
                        />
                        <!-- rotation=270: pins horizontal flipped, tab on the top -->
                        <rect
                            v-if="comp.rotation === 270"
                            :x="
                                gridToSvgX(comp.position.x) +
                                (comp.effectiveWidth * HOLE_SPACING) / 2 -
                                6
                            "
                            :y="gridToSvgY(comp.position.y) - 6"
                            width="12"
                            height="7"
                            :fill="compColor(comp.id, comp.color)"
                            fill-opacity="0.9"
                            rx="2"
                            pointer-events="none"
                        />
                    </template>
                    <!-- Название компонента (скрывается в режиме меток пинов) -->
                    <text
                        v-if="!showPinLabels"
                        :x="compCenterX(comp)"
                        :y="
                            gridToSvgY(comp.position.y) +
                            (comp.effectiveHeight * HOLE_SPACING) / 2
                        "
                        fill="white"
                        font-size="8"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="monospace"
                        font-weight="bold"
                        pointer-events="none"
                    >
                        {{ comp.type }}
                    </text>
                    <!-- Пины компонента -->
                    <g
                        v-for="pin in comp.getAbsolutePinPositions()"
                        :key="pin.id"
                    >
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
                                :fill="
                                    pinLabelColor(comp.id, pin.id, pin.label)
                                "
                                :text-anchor="pinLabelAnchor(comp, pin)"
                                font-size="6"
                                font-family="monospace"
                                font-weight="bold"
                                pointer-events="none"
                            >
                                {{
                                    editorStore.getPinLabel(comp.id, pin.id) ||
                                    (pin.functions?.length
                                        ? `${pin.label}, ${pin.functions.join(', ')}`
                                        : pin.label)
                                }}
                            </text>
                        </template>
                    </g>
                </g>

                <!-- Segment cut overlay: dashed yellow line between cut points -->
                <template v-if="segmentCutOverlay">
                    <polyline
                        v-if="segmentCutOverlay.polylinePoints"
                        :points="segmentCutOverlay.polylinePoints"
                        stroke="yellow"
                        stroke-width="3"
                        stroke-dasharray="4,3"
                        fill="none"
                        stroke-linecap="round"
                        opacity="0.85"
                        pointer-events="none"
                    />
                    <circle
                        v-for="(cp, i) in segmentCutOverlay.circles"
                        :key="`cut-${i}`"
                        :cx="cp.x"
                        :cy="cp.y"
                        r="5"
                        fill="yellow"
                        opacity="0.9"
                        pointer-events="none"
                    />
                </template>

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

        <!-- Wire conflict dialog (объединённый) -->
        <WireConflictDialog
            :open="conflictDialogOpen"
            :conflicts="conflictItems"
            @update:open="onConflictDialogOpenChange"
            @confirm="onConflictConfirm"
        />

        <!-- Wire hover tooltip -->
        <Transition name="tooltip-fade">
            <div
                v-if="showWireTooltip && hoveredWireLabel"
                class="absolute z-30 pointer-events-none"
                :style="{
                    left: wireTooltipPos.x + 'px',
                    top: wireTooltipPos.y + 'px',
                    transform: 'translate(-50%, calc(-100% - 10px))',
                }"
            >
                <div
                    class="bg-popover border border-border rounded-lg shadow-xl px-3 py-2 text-xs whitespace-nowrap border-l-[3px]"
                    :style="{ borderLeftColor: hoveredWireLabel.color }"
                >
                    <div class="flex gap-2.5 items-stretch">
                        <!-- Vertical connector track — always neutral color for visibility -->
                        <div class="flex flex-col items-center py-0.5">
                            <template v-for="(_, i) in hoveredWireLabel.stops" :key="i">
                                <div class="w-2 h-2 rounded-full border border-foreground/40 bg-background flex-shrink-0" />
                                <div
                                    v-if="i < hoveredWireLabel.stops.length - 1"
                                    class="w-px flex-1 min-h-[14px] bg-foreground/20"
                                />
                            </template>
                        </div>
                        <!-- Stop labels -->
                        <div class="flex flex-col justify-between">
                            <div v-for="(stop, i) in hoveredWireLabel.stops" :key="i">
                                <template v-if="stop.type === 'pin'">
                                    <span class="font-medium">{{ stop.module }}</span>
                                    <span v-if="stop.description" class="text-muted-foreground"> ⚬ {{ stop.description }}</span>
                                    <span class="text-muted-foreground"> ⚬ {{ stop.pinLabel }}</span>
                                </template>
                                <span v-else class="font-mono text-muted-foreground">{{ stop.coord }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- Component hover tooltip -->
        <Transition name="tooltip-fade">
            <div
                v-if="showTooltip && tooltipStyle && hoveredComp"
                class="absolute z-40 pointer-events-none"
                :style="tooltipStyle"
            >
                <div
                    class="bg-popover border border-border rounded-lg shadow-xl p-3 w-56 text-sm"
                >
                    <!-- Header: image + name -->
                    <div class="flex items-center gap-2.5 mb-2">
                        <img
                            v-if="getComponentImage(hoveredComp.type)"
                            :src="getComponentImage(hoveredComp.type)!"
                            class="h-10 w-10 object-contain rounded bg-muted shrink-0"
                            alt=""
                        />
                        <div class="min-w-0">
                            <div
                                class="font-semibold text-foreground leading-tight truncate"
                            >
                                {{ hoveredComp.name }}
                            </div>
                            <div
                                class="text-xs text-muted-foreground font-mono"
                            >
                                {{ hoveredComp.type }}
                            </div>
                        </div>
                    </div>

                    <!-- User description -->
                    <p
                        v-if="
                            editorStore.getComponentDescription(hoveredComp.id)
                        "
                        class="text-xs text-muted-foreground mb-2 border-t pt-2"
                    >
                        {{
                            editorStore.getComponentDescription(hoveredComp.id)
                        }}
                    </p>

                    <!-- Pins -->
                    <div class="border-t pt-2 space-y-0.5">
                        <div
                            v-for="pin in hoveredComp.getAbsolutePinPositions()"
                            :key="pin.id"
                            class="flex items-center justify-between gap-2 text-xs"
                        >
                            <span
                                class="text-muted-foreground font-mono shrink-0"
                                >{{ pin.id }}</span
                            >
                            <span class="text-foreground truncate text-right">
                                {{
                                    editorStore.getPinLabel(hoveredComp.id, pin.id) ||
                                    (pin.functions?.length
                                        ? `${pin.label}, ${pin.functions.join(', ')}`
                                        : pin.label)
                                }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useProjectStore } from "@/stores/projectStore";
import {
    useEditorStore,
    HOLE_SPACING,
    MARGIN_LEFT,
    MARGIN_TOP,
    CANVAS_PADDING,
} from "@/stores/editorStore";
import { useHistoryStore } from "@/stores/historyStore";
import { ComponentFactory } from "@/lib/components/ComponentFactory";
import { WireTrace } from "@/lib/components/WireTrace";
import { BaseComponent } from "@/lib/components/BaseComponent";
import type { GridPosition } from "@/lib/components/types";
import ComponentConfigDialog from "@/components/editor/ComponentConfigDialog.vue";
import WireConfigDialog from "@/components/editor/WireConfigDialog.vue";
import { useSettingsStore } from "@/stores/settingsStore";
import { getComponentImage } from "@/lib/components/componentImages";
import { useWireEndpointInfo } from "@/composables/useWireEndpointInfo";
import WireConflictDialog from "@/components/board/WireConflictDialog.vue";
import type { ConflictItem } from "@/components/board/WireConflictDialog.vue";
import {
    findJunctions,
    findCrossings,
    findHoleOnWire,
    svgPointOnWireSegments,
    splitWireAtPoints,
} from "@/lib/wireGeometry";
import { RotateCw, RotateCcw, SlidersHorizontal, Network, GitMerge, Trash2 } from "lucide-vue-next";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const { t } = useI18n();
const settingsStore = useSettingsStore();

const HOLE_RADIUS = 4;
const DRILL_RADIUS = 2;
// Внутренний отступ платы: место для меток колонок/строк и пропорциональный отступ с других сторон
const BOARD_PAD = 26;

const bgMode = ref<"solid" | "chess">("chess");
const bgStyle = computed(() => {
    if (bgMode.value === "solid") {
        return { backgroundColor: "hsl(240 5% 14%)" };
    }
    return {
        backgroundColor: "hsl(240 5% 18%)",
        backgroundImage: [
            "linear-gradient(45deg, hsl(240 5% 22%) 25%, transparent 25%)",
            "linear-gradient(-45deg, hsl(240 5% 22%) 25%, transparent 25%)",
            "linear-gradient(45deg, transparent 75%, hsl(240 5% 22%) 75%)",
            "linear-gradient(-45deg, transparent 75%, hsl(240 5% 22%) 75%)",
        ].join(", "),
        backgroundSize: "20px 20px",
        backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
    };
});

const projectStore = useProjectStore();
const editorStore = useEditorStore();
const historyStore = useHistoryStore();

const canvasWrap = ref<HTMLDivElement>();

// ─── Hover tooltip ───────────────────────────────────────────────────────────
const hoveredCompId = ref<string | null>(null);
const mousePos = ref<{ x: number; y: number }>({ x: 0, y: 0 });

const hoveredComp = computed(() => {
    if (!hoveredCompId.value) return null;
    const el = projectStore.getElementById(hoveredCompId.value);
    return el instanceof BaseComponent ? el : null;
});

const tooltipPosition = computed(
    () => settingsStore.settings.tooltipPosition ?? "component",
);

// Returns tooltip CSS position based on user setting
const tooltipStyle = computed(() => {
    const pos = tooltipPosition.value;
    if (pos === "off" || !hoveredComp.value) return null;
    if (pos === "component") {
        const wrap = canvasWrap.value;
        const w = wrap?.clientWidth ?? 800;
        const h = wrap?.clientHeight ?? 600;
        const mx = mousePos.value.x;
        const my = mousePos.value.y;
        // Flip horizontally if too close to right edge (tooltip is 224px wide + 16px gap)
        const flipX = mx + 240 > w;
        // Flip vertically if too close to bottom edge (tooltip ~280px tall)
        const flipY = my + 300 > h;
        return {
            left: flipX ? undefined : `${mx + 16}px`,
            right: flipX ? `${w - mx + 8}px` : undefined,
            top: flipY ? undefined : `${my + 16}px`,
            bottom: flipY ? `${h - my + 8}px` : undefined,
        };
    }
    if (pos === "top-left") return { left: "12px", top: "12px" };
    if (pos === "top-right") return { right: "12px", top: "12px" };
    if (pos === "bottom-left") return { left: "12px", bottom: "12px" };
    if (pos === "bottom-right") return { right: "12px", bottom: "12px" };
    return null;
});

const showTooltip = computed(
    () =>
        tooltipPosition.value !== "off" &&
        !!hoveredComp.value &&
        !movingId.value &&
        !ctxMenu.value,
);

// ─── Wire hover tooltip ───────────────────────────────────────────────────────
const { getWireLabel } = useWireEndpointInfo();
const hoveredWireId = ref<string | null>(null);
const wireTooltipPos = ref({ x: 0, y: 0 });

const hoveredWireLabel = computed(() => {
    if (!hoveredWireId.value) return null;
    const wire = projectStore.getElementById(hoveredWireId.value);
    if (!(wire instanceof WireTrace)) return null;
    return getWireLabel(wire);
});

const showWireTooltip = computed(
    () =>
        !!hoveredWireLabel.value &&
        !movingId.value &&
        !ctxMenu.value &&
        editorStore.activeTool !== "wire",
);

function onWireMouseMove(e: MouseEvent, wireId: string) {
    hoveredWireId.value = wireId;
    const wrap = canvasWrap.value!.getBoundingClientRect();
    wireTooltipPos.value = {
        x: e.clientX - wrap.left,
        y: e.clientY - wrap.top,
    };
}

const boardConfig = computed(() => projectStore.boardConfig);
const boardCols = computed(() =>
    Math.max(
        1,
        Math.floor(boardConfig.value.widthMm / boardConfig.value.holePitchMm),
    ),
);
const boardRows = computed(() =>
    Math.max(
        1,
        Math.floor(boardConfig.value.heightMm / boardConfig.value.holePitchMm),
    ),
);

// SVG расширен на CANVAS_PADDING ячеек с каждой стороны для размещения вне платы
const svgWidth = computed(
    () =>
        MARGIN_LEFT +
        (boardCols.value + CANVAS_PADDING * 2) * HOLE_SPACING +
        16,
);
const svgHeight = computed(
    () =>
        MARGIN_TOP + (boardRows.value + CANVAS_PADDING * 2) * HOLE_SPACING + 16,
);

// Смещение платы внутри холста (из-за CANVAS_PADDING)
const boardOffsetX = computed(
    () => MARGIN_LEFT + CANVAS_PADDING * HOLE_SPACING,
);
const boardOffsetY = computed(() => MARGIN_TOP + CANVAS_PADDING * HOLE_SPACING);

// Перевод grid-координаты (может быть отрицательной) в pixel
function gridToSvgX(col: number): number {
    const c = editorStore.boardFlipped ? boardCols.value - 1 - col : col;
    return MARGIN_LEFT + (c + CANVAS_PADDING) * HOLE_SPACING;
}
function gridToSvgY(row: number): number {
    return MARGIN_TOP + (row + CANVAS_PADDING) * HOLE_SPACING;
}

const placedComponents = computed(() => projectStore.placedComponents);
const wires = computed(() => projectStore.wires);
// Show only wires from the currently viewed side
const visibleWires = computed(() =>
    projectStore.wires.filter(
        (w) => w.side === (editorStore.boardFlipped ? "back" : "front"),
    ),
);

const activeTool = computed(() => editorStore.activeTool);
const selectedId = computed(() => editorStore.selectedElementId);
const showPinLabels = computed(() => editorStore.showPinLabels);

// Determines which side the pin is on after rotation using actual rotated x position
function pinIsOnRightSide(
    comp: BaseComponent,
    pin: { x: number },
): boolean {
    return (pin.x - comp.position.x) >= comp.effectiveWidth / 2;
}

// X-координата текста метки: наружу от компонента
function pinLabelX(
    comp: BaseComponent,
    pin: { x: number },
): number {
    const cx = holeX(pin.x);
    // Single-column component (e.g. JST): label goes to the left, outside the body
    if (comp.effectiveWidth === 1) return cx - 7;
    if (pinIsOnRightSide(comp, pin)) {
        return cx - 7; // right column → label to the left (inward)
    }
    return cx + 7; // left column → label to the right (inward)
}

// text-anchor для метки
function pinLabelAnchor(comp: BaseComponent, pin: { x: number }): string {
    if (comp.effectiveWidth === 1) return "end";
    return pinIsOnRightSide(comp, pin) ? "end" : "start";
}

// Цвет метки: пользовательская — белая, встроенная — зеленоватая
function pinLabelColor(
    compId: string,
    pinId: string,
    builtinLabel: string,
): string {
    if (editorStore.getPinLabel(compId, pinId)) return "#ffffff";
    if (builtinLabel && builtinLabel !== "+" && builtinLabel !== "-") return "#a8e6a0";
    return "#ffd09e";
}
const wireStart = computed(() => editorStore.wireStart);
const wirePreviewEnd = computed(() => editorStore.wirePreviewEnd);
const dragPreview = computed(() => editorStore.dragPreview);

// Позиция дырки под курсором в режиме wire (для подсветки меток строк/колонок)
const wireHoverPos = ref<GridPosition | null>(null);
const movePreviewPos = computed(() => editorStore.movePreviewPos);
const movingId = computed(() => editorStore.movingElementId);

const movingWidth = computed(() => {
    if (!movingId.value) return 0;
    const el = projectStore.getElementById(movingId.value);
    if (!el || !(el instanceof BaseComponent)) return 0;
    return el.effectiveWidth * HOLE_SPACING;
});
const movingHeight = computed(() => {
    if (!movingId.value) return 0;
    const el = projectStore.getElementById(movingId.value);
    if (!el || !(el instanceof BaseComponent)) return 0;
    return el.effectiveHeight * HOLE_SPACING;
});

const columnLabels = computed(() => {
    return Array.from({ length: boardCols.value }, (_, i) => {
        if (i < 26) return String.fromCharCode(65 + i);
        return (
            String.fromCharCode(64 + Math.floor(i / 26)) +
            String.fromCharCode(65 + (i % 26))
        );
    });
});

// When flipped, reverse labels so column A appears on the right (correct for back view)
const displayColumnLabels = computed(() =>
    editorStore.boardFlipped ? [...columnLabels.value].reverse() : columnLabels.value,
);

// Returns the grid column that corresponds to visual label position i
function gridColForLabelIndex(i: number): number {
    return editorStore.boardFlipped ? boardCols.value - 1 - i : i;
}

function holeX(col: number): number {
    const c = editorStore.boardFlipped ? boardCols.value - 1 - col : col;
    return MARGIN_LEFT + (c + CANVAS_PADDING) * HOLE_SPACING + HOLE_SPACING / 2;
}
function holeY(row: number): number {
    return (
        MARGIN_TOP + (row + CANVAS_PADDING) * HOLE_SPACING + HOLE_SPACING / 2
    );
}

// Left edge of a component rect, accounting for flip mirroring the component width
function compRectX(comp: BaseComponent): number {
    const base = gridToSvgX(comp.position.x);
    return editorStore.boardFlipped
        ? base - (comp.effectiveWidth - 1) * HOLE_SPACING + 1
        : base + 1;
}

// Horizontal center of a component body
function compCenterX(comp: BaseComponent): number {
    return compRectX(comp) - 1 + (comp.effectiveWidth * HOLE_SPACING) / 2;
}

// Builds SVG points string using flip-aware holeX
function wirePoints(wire: WireTrace): string {
    return wire
        .getAllPoints()
        .map((p) => `${holeX(p.x)},${holeY(p.y)}`)
        .join(" ");
}

function holeHighlightColor(col: number, row: number): string {
    const key = `${col},${row}`;
    if (projectStore.occupiedHoles.has(key)) return "#c8962c";
    if (
        wireStart.value &&
        wireStart.value.x === col &&
        wireStart.value.y === row
    )
        return "#ff4444";
    return "#c8962c";
}

// ─── Context menu ────────────────────────────────────────────────────────────
const ctxMenu = ref<{
    x: number;
    y: number;
    id: string;
    label: string;
    isComponent: boolean;
} | null>(null);
const configDialogOpen = ref(false);
const configDialogComp = ref<BaseComponent | null>(null);
const wireConfigDialogOpen = ref(false);
const wireConfigDialogWire = ref<WireTrace | null>(null);

function openCtxMenu(
    e: MouseEvent,
    id: string,
    label: string,
    isComponent: boolean,
) {
    editorStore.selectedElementId = id;
    editorStore.movingElementId = null;
    editorStore.movePreviewPos = null;
    const wrap = canvasWrap.value!.getBoundingClientRect();
    let x = e.clientX - wrap.left;
    let y = e.clientY - wrap.top;
    // Не выходить за правый/нижний край
    if (x + 170 > wrap.width) x = wrap.width - 175;
    if (y + 140 > wrap.height) y = wrap.height - 145;
    ctxMenu.value = { x, y, id, label, isComponent };
}

function closeCtxMenu() {
    ctxMenu.value = null;
}

function ctxRotate(dir: 1 | -1) {
    const id = ctxMenu.value?.id;
    closeCtxMenu();
    if (!id) return;
    const el = projectStore.getElementById(id);
    if (!(el instanceof BaseComponent)) return;
    const from = el.rotation;
    const to = ((((el.rotation + dir * 90) % 360) + 360) % 360) as
        | 0
        | 90
        | 180
        | 270;
    el.rotation = to;
    historyStore.push({ type: "rotate", id, from, to });
    projectStore.notifyElementChanged();
}

function openPinLabels() {
    const id = ctxMenu.value?.id;
    closeCtxMenu();
    if (!id) return;
    const el = projectStore.getElementById(id);
    if (!(el instanceof BaseComponent)) return;
    configDialogComp.value = el;
    configDialogOpen.value = true;
}

function openWireConfig() {
    const id = ctxMenu.value?.id;
    closeCtxMenu();
    if (!id) return;
    const el = projectStore.getElementById(id);
    if (!(el instanceof WireTrace)) return;
    wireConfigDialogWire.value = el;
    wireConfigDialogOpen.value = true;
}

function ctxDelete() {
    const id = ctxMenu.value?.id;
    closeCtxMenu();
    if (!id) return;
    const el = projectStore.getElementById(id);
    if (!el) return;
    historyStore.push({ type: "remove", element: el.serialize() });
    projectStore.removeElement(id);
    editorStore.selectedElementId = null;
}

function compColor(id: string, fallback: string): string {
    return editorStore.getComponentColor(id) ?? fallback;
}

// ─── Wire toast ──────────────────────────────────────────────────────────────
const wireToastMsg = ref<string | null>(null);
let wireToastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(msg: string) {
    if (wireToastTimer) clearTimeout(wireToastTimer);
    wireToastMsg.value = msg;
    wireToastTimer = setTimeout(() => {
        wireToastMsg.value = null;
    }, 3000);
}

async function ctxCheckCrossings() {
    const id = ctxMenu.value?.id;
    closeCtxMenu();
    if (!id) return;
    const el = projectStore.getElementById(id);
    if (!(el instanceof WireTrace)) return;

    // Only check wires on the same board side
    const otherWires = wires.value.filter((w) => w.id !== id && w.side === el.side);
    const crossings = findCrossings(el, otherWires, GEOMETRY_CONSTANTS);

    // Фильтруем уже известные jump-over пересечения
    const knownIds = new Set(el.crossings.map((c) => c.withWireId));
    const newCrossings = crossings.filter((c) => !knownIds.has(c.wire.id));

    if (newCrossings.length === 0) {
        showToast("Пересечений не найдено");
        return;
    }

    const items: ConflictItem[] = newCrossings.map((c) => {
        const gx =
            Math.round(
                (c.point.x - MARGIN_LEFT - HOLE_SPACING / 2) / HOLE_SPACING,
            ) - CANVAS_PADDING;
        const gy =
            Math.round(
                (c.point.y - MARGIN_TOP - HOLE_SPACING / 2) / HOLE_SPACING,
            ) - CANVAS_PADDING;
        return {
            label: `Пересечение в ${formatGridPos(gx, gy)}`,
            description: "Провод пересекает другой провод",
            optionA: { label: "Перепрыгнуть", value: "jumpOver" },
            optionB: { label: "Соединить", value: "connect" },
            defaultValue: "jumpOver",
        };
    });

    const decisions = await askConflicts(items);

    for (let i = 0; i < newCrossings.length; i++) {
        if (decisions[i] === "jumpOver") {
            el.crossings.push({
                withWireId: newCrossings[i].wire.id,
                point: { ...newCrossings[i].point },
                jumpOver: true,
            });
        }
    }
    projectStore.notifyElementChanged();
}

async function ctxMergeWires() {
    const id = ctxMenu.value?.id;
    closeCtxMenu();
    if (!id) return;
    const el = projectStore.getElementById(id);
    if (!(el instanceof WireTrace)) return;

    // Only merge wires on the same board side
    const otherWires = wires.value.filter((w) => w.id !== id && w.side === el.side);
    const junctions = findJunctions(el, otherWires, GEOMETRY_CONSTANTS);

    if (junctions.length === 0) {
        showToast("Нет соседних проводов для объединения");
        return;
    }

    const items: ConflictItem[] = junctions.map((j) => {
        const pt = j.sharedEndpoint;
        const gx =
            Math.round((pt.x - MARGIN_LEFT - HOLE_SPACING / 2) / HOLE_SPACING) -
            CANVAS_PADDING;
        const gy =
            Math.round((pt.y - MARGIN_TOP - HOLE_SPACING / 2) / HOLE_SPACING) -
            CANVAS_PADDING;
        return {
            label: `Дырка ${formatGridPos(gx, gy)}`,
            description: "Объединить провода в этой точке?",
            optionA: { label: "Раздельно", value: "keep" },
            optionB: { label: "Объединить", value: "merge" },
            defaultValue: "merge",
        };
    });

    const decisions = await askConflicts(items);

    // Обрабатываем по одному: каждый merge заменяет текущий el + other на новый WireTrace
    // Используем актуальную ссылку на el, т.к. после первого merge el заменяется в store
    let currentEl = el;
    for (let i = 0; i < junctions.length; i++) {
        if (decisions[i] !== "merge") continue;
        const other = junctions[i].wire;
        const sharedPt = junctions[i].sharedEndpoint;

        const elStartSvgX =
            MARGIN_LEFT +
            (currentEl.startPosition.x + CANVAS_PADDING) * HOLE_SPACING +
            HOLE_SPACING / 2;
        const elStartSvgY =
            MARGIN_TOP +
            (currentEl.startPosition.y + CANVAS_PADDING) * HOLE_SPACING +
            HOLE_SPACING / 2;
        const elSharedIsStart =
            Math.abs(elStartSvgX - sharedPt.x) < 1 &&
            Math.abs(elStartSvgY - sharedPt.y) < 1;

        const otherStartSvgX =
            MARGIN_LEFT +
            (other.startPosition.x + CANVAS_PADDING) * HOLE_SPACING +
            HOLE_SPACING / 2;
        const otherStartSvgY =
            MARGIN_TOP +
            (other.startPosition.y + CANVAS_PADDING) * HOLE_SPACING +
            HOLE_SPACING / 2;
        const otherSharedIsStart =
            Math.abs(otherStartSvgX - sharedPt.x) < 1 &&
            Math.abs(otherStartSvgY - sharedPt.y) < 1;

        const elFreeEnd = elSharedIsStart
            ? currentEl.endPosition
            : currentEl.startPosition;
        const otherFreeEnd = otherSharedIsStart
            ? other.endPosition
            : other.startPosition;

        const merged = new WireTrace(
            elFreeEnd,
            otherFreeEnd,
            currentEl.color,
            [],
            currentEl.id,
            currentEl.crossings,
            currentEl.sharedHoles,
            currentEl.side,
        );
        historyStore.push({ type: "remove", element: currentEl.serialize() });
        historyStore.push({ type: "remove", element: other.serialize() });
        historyStore.push({ type: "add", element: merged.serialize() });
        projectStore.removeElement(currentEl.id);
        projectStore.removeElement(other.id);
        projectStore.addElement(merged);
        currentEl = merged;
    }
}

// ─── Wire conflict validation ────────────────────────────────────────────────
const wireConflictMsg = ref<string | null>(null);
const POWER_POS = new Set(["VCC", "5V", "3V3", "PWR", "3.3V"]);
const POWER_NEG = new Set(["GND", "GND1", "GND2"]);

function getPinAtPos(x: number, y: number) {
    for (const comp of projectStore.placedComponents) {
        for (const pin of comp.getAbsolutePinPositions()) {
            if (pin.x === x && pin.y === y) {
                const label = (
                    editorStore.getPinLabel(comp.id, pin.id) || pin.label
                ).toUpperCase();
                return label;
            }
        }
    }
    return null;
}

function checkWireConflict(
    start: GridPosition,
    end: GridPosition,
): string | null {
    const a = getPinAtPos(start.x, start.y);
    const b = getPinAtPos(end.x, end.y);
    if (!a || !b) return null;
    if (
        (POWER_NEG.has(a) && POWER_POS.has(b)) ||
        (POWER_POS.has(a) && POWER_NEG.has(b))
    ) {
        return `Внимание: соединение ${a} → ${b} может повредить схему!`;
    }
    return null;
}

// ─── Wire geometry constants ─────────────────────────────────────────────────
const GEOMETRY_CONSTANTS = {
    HOLE_SPACING,
    MARGIN_LEFT,
    MARGIN_TOP,
    CANVAS_PADDING,
} as const;

// Форматирует grid-координату в "A3", "B5" и т.д.
function formatGridPos(x: number, y: number): string {
    const col =
        x < 26
            ? String.fromCharCode(65 + x)
            : String.fromCharCode(64 + Math.floor(x / 26)) +
              String.fromCharCode(65 + (x % 26));
    return `${col}${y + 1}`;
}

// ─── Unified conflict dialog ──────────────────────────────────────────────────
const conflictDialogOpen = ref(false);
const conflictItems = ref<ConflictItem[]>([]);
let resolveConflict: ((decisions: string[]) => void) | null = null;

function askConflicts(items: ConflictItem[]): Promise<string[]> {
    conflictItems.value = items;
    conflictDialogOpen.value = true;
    return new Promise((r) => {
        resolveConflict = r;
    });
}

function onConflictConfirm(decisions: string[]) {
    const resolve = resolveConflict;
    resolveConflict = null;
    conflictDialogOpen.value = false;
    resolve?.(decisions);
}

function onConflictDialogOpenChange(val: boolean) {
    if (!val && resolveConflict) {
        // Escape — применяем дефолтные решения
        const resolve = resolveConflict;
        resolveConflict = null;
        conflictDialogOpen.value = false;
        resolve?.(conflictItems.value.map((c) => c.defaultValue));
    } else {
        conflictDialogOpen.value = val;
    }
}

// ─── Junction holes indicator ────────────────────────────────────────────────
// Показываем точки только там где пользователь явно выбрал "оставить раздельно"
const junctionHoles = computed(() => {
    const seen = new Set<string>();
    const result: { x: number; y: number }[] = [];
    for (const wire of wires.value) {
        for (const pt of wire.sharedHoles) {
            const key = `${pt.x},${pt.y}`;
            if (!seen.has(key)) {
                seen.add(key);
                result.push({ x: holeX(pt.x), y: holeY(pt.y) });
            }
        }
    }
    return result;
});

// ─── Wire path builder (для проводов с jump-over арками) ─────────────────────
function buildWirePath(wire: WireTrace): string {
    // Logical (non-flip) coords — same formula as toSvgPoint in wireGeometry.ts.
    // Crossing points were stored using toSvgPoint, so matching must use the same space.
    const ptsLogical = wire.getAllPoints().map((p) => ({
        x: MARGIN_LEFT + (p.x + CANVAS_PADDING) * HOLE_SPACING + HOLE_SPACING / 2,
        y: MARGIN_TOP + (p.y + CANVAS_PADDING) * HOLE_SPACING + HOLE_SPACING / 2,
    }));
    // Display coords (flip-aware) for actual SVG path generation
    const ptsDisplay = wire.getAllPoints().map((p) => ({ x: holeX(p.x), y: holeY(p.y) }));

    const jumpOvers = wire.crossings.filter((c) => c.jumpOver);
    if (jumpOvers.length === 0) return "";

    const ARC_HALF = 10;
    const ARC_HEIGHT = 18;

    let d = `M ${ptsDisplay[0].x},${ptsDisplay[0].y}`;

    for (let i = 0; i < ptsLogical.length - 1; i++) {
        const segStartL = ptsLogical[i];
        const segEndL = ptsLogical[i + 1];
        const segStartD = ptsDisplay[i];
        const segEndD = ptsDisplay[i + 1];

        // Logical deltas — used for crossing detection (coordinate-system-invariant)
        const dxL = segEndL.x - segStartL.x;
        const dyL = segEndL.y - segStartL.y;
        const len2L = dxL * dxL + dyL * dyL;

        // Display deltas — used for arc placement in screen space
        const dxD = segEndD.x - segStartD.x;
        const dyD = segEndD.y - segStartD.y;
        const len2D = dxD * dxD + dyD * dyD;

        // Find crossings on this segment using logical coords (matches stored jo.point space)
        const segJumps = jumpOvers
            .filter((jo) => {
                if (len2L < 1) return false;
                const t = ((jo.point.x - segStartL.x) * dxL + (jo.point.y - segStartL.y) * dyL) / len2L;
                if (t < 0.05 || t > 0.95) return false;
                const projX = segStartL.x + t * dxL;
                const projY = segStartL.y + t * dyL;
                const dist2 = (jo.point.x - projX) ** 2 + (jo.point.y - projY) ** 2;
                return dist2 < 4;
            })
            .map((jo) => ({
                t: ((jo.point.x - segStartL.x) * dxL + (jo.point.y - segStartL.y) * dyL) / len2L,
            }))
            .sort((a, b) => a.t - b.t);

        for (const { t } of segJumps) {
            // Arc center in display coords (same parametric t works for both spaces)
            const arcX = segStartD.x + t * dxD;
            const arcY = segStartD.y + t * dyD;

            // Direction unit vector in display space (accounts for board flip)
            const dlen = len2D > 0 ? Math.sqrt(len2D) : 1;
            const ux = len2D > 0 ? dxD / dlen : 1;
            const uy = len2D > 0 ? dyD / dlen : 0;
            let px = -uy;
            let py = ux;
            // Always arc upward (negative screen Y); for vertical wires — leftward
            if (py > 0 || (py === 0 && px > 0)) { px = -px; py = -py; }

            const arcStartX = arcX - ux * ARC_HALF;
            const arcStartY = arcY - uy * ARC_HALF;
            const arcEndX = arcX + ux * ARC_HALF;
            const arcEndY = arcY + uy * ARC_HALF;
            const ctrlX = arcX + px * ARC_HEIGHT;
            const ctrlY = arcY + py * ARC_HEIGHT;

            d += ` L ${arcStartX},${arcStartY}`;
            d += ` Q ${ctrlX},${ctrlY} ${arcEndX},${arcEndY}`;
        }

        d += ` L ${segEndD.x},${segEndD.y}`;
    }

    return d;
}

// ─── Segment cut overlay ─────────────────────────────────────────────────────
const segmentCutOverlay = computed(() => {
    const cutPoints = editorStore.segmentCutPoints;
    const wireId = editorStore.segmentCutWireId;
    if (!wireId || cutPoints.length === 0) return null;

    const wire = wires.value.find((w) => w.id === wireId);
    if (!wire) return null;

    const circles = cutPoints.map((p) => ({ x: holeX(p.x), y: holeY(p.y) }));

    if (cutPoints.length < 2) {
        return { polylinePoints: "", circles };
    }

    const [ptA, ptB] = cutPoints;
    const hitA = findHoleOnWire(ptA, wire);
    const hitB = findHoleOnWire(ptB, wire);
    if (!hitA || !hitB) return { polylinePoints: "", circles };

    const paramA = hitA.segmentIndex + hitA.t;
    const paramB = hitB.segmentIndex + hitB.t;

    let earlyPos = ptA,
        latePos = ptB;
    let earlyHit = hitA,
        lateHit = hitB;
    if (paramA > paramB) {
        earlyPos = ptB;
        latePos = ptA;
        earlyHit = hitB;
        lateHit = hitA;
    }

    const allWirePoints = wire.getAllPoints();
    const sub: { x: number; y: number }[] = [];
    sub.push({ x: holeX(earlyPos.x), y: holeY(earlyPos.y) });

    // Add intermediate wire points strictly between the two cut points
    if (earlyHit.segmentIndex < lateHit.segmentIndex) {
        for (
            let i = earlyHit.segmentIndex + 1;
            i <= lateHit.segmentIndex;
            i++
        ) {
            if (i >= allWirePoints.length) break;
            const pt = allWirePoints[i];
            if (
                (pt.x === earlyPos.x && pt.y === earlyPos.y) ||
                (pt.x === latePos.x && pt.y === latePos.y)
            )
                continue;
            sub.push({ x: holeX(pt.x), y: holeY(pt.y) });
        }
    }

    // Add latePos if not already the last point
    const last = sub[sub.length - 1];
    const lateSvgX = holeX(latePos.x);
    const lateSvgY = holeY(latePos.y);
    if (last.x !== lateSvgX || last.y !== lateSvgY) {
        sub.push({ x: lateSvgX, y: lateSvgY });
    }

    const polylinePoints = sub.map((p) => `${p.x},${p.y}`).join(" ");
    return { polylinePoints, circles };
});

// ─── Wire segment cut ─────────────────────────────────────────────────────────
function cutWireSegment() {
    const wireId = editorStore.segmentCutWireId;
    const cutPoints = editorStore.segmentCutPoints;
    if (!wireId || cutPoints.length !== 2) return;

    const [ptA, ptB] = cutPoints;
    if (ptA.x === ptB.x && ptA.y === ptB.y) {
        editorStore.segmentCutPoints = [];
        editorStore.segmentCutWireId = null;
        return;
    }

    const wire = projectStore.getElementById(wireId);
    if (!(wire instanceof WireTrace)) return;

    const { wire1, wire2 } = splitWireAtPoints(
        wire,
        ptA,
        ptB,
        GEOMETRY_CONSTANTS,
    );

    // Update other wires' crossing references that pointed at the original wire
    for (const w of wires.value) {
        if (w.id === wire.id) continue;
        for (const crossing of w.crossings) {
            if (crossing.withWireId !== wire.id) continue;
            const inW1 =
                wire1 &&
                svgPointOnWireSegments(
                    crossing.point,
                    wire1,
                    GEOMETRY_CONSTANTS,
                );
            crossing.withWireId = inW1 ? wire1!.id : (wire2?.id ?? wire.id);
        }
    }

    historyStore.push({ type: "remove", element: wire.serialize() });
    projectStore.removeElement(wire.id);
    if (wire1) {
        projectStore.addElement(wire1);
        historyStore.push({ type: "add", element: wire1.serialize() });
    }
    if (wire2) {
        projectStore.addElement(wire2);
        historyStore.push({ type: "add", element: wire2.serialize() });
    }

    editorStore.segmentCutPoints = [];
    editorStore.segmentCutWireId = null;
}

// ─── Center board on mount ───────────────────────────────────────────────────
onMounted(() => {
    const wrap = canvasWrap.value;
    if (!wrap) return;
    const { width, height } = wrap.getBoundingClientRect();
    editorStore.containerWidth = width;
    editorStore.containerHeight = height;
    editorStore.svgWidth = svgWidth.value;
    editorStore.svgHeight = svgHeight.value;
    editorStore.centerBoard();
});

// ─── Cursor ─────────────────────────────────────────────────────────────────
const isPanning = ref(false);
const canvasCursor = computed(() => {
    if (movingId.value) return "grabbing";
    if (activeTool.value === "hand")
        return isPanning.value ? "grabbing" : "grab";
    if (activeTool.value === "wire") return "crosshair";
    if (activeTool.value === "select") return "default";
    return "default";
});

// ─── Pan ─────────────────────────────────────────────────────────────────────
let panStart: { mx: number; my: number; px: number; py: number } | null = null;

function onMouseDown(e: MouseEvent) {
    if (activeTool.value === "hand") {
        isPanning.value = true;
        panStart = {
            mx: e.clientX,
            my: e.clientY,
            px: editorStore.panX,
            py: editorStore.panY,
        };
    }
}

function onMouseMove(e: MouseEvent) {
    // Track cursor position for tooltip
    if (canvasWrap.value) {
        const rect = canvasWrap.value.getBoundingClientRect();
        mousePos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    // Pan
    if (isPanning.value && panStart) {
        editorStore.panX = panStart.px + (e.clientX - panStart.mx);
        editorStore.panY = panStart.py + (e.clientY - panStart.my);
    }

    // Wire preview + hover highlight
    if (activeTool.value === "wire") {
        const grid = svgCoordsToGrid(e);
        wireHoverPos.value = grid;
        if (grid && wireStart.value) editorStore.wirePreviewEnd = grid;
    } else {
        wireHoverPos.value = null;
    }

    // Move component
    if (movingId.value && activeTool.value === "select" && !ctxMenu.value) {
        const grid = svgCoordsToGrid(e);
        if (grid) editorStore.movePreviewPos = grid;
    }
}

function onMouseLeave() {
    wireHoverPos.value = null;
    hoveredCompId.value = null;
    onMouseUp();
}

function onMouseUp(_e?: MouseEvent) {
    if (isPanning.value) {
        isPanning.value = false;
        panStart = null;
    }
    // Commit move
    if (
        movingId.value &&
        activeTool.value === "select" &&
        movePreviewPos.value
    ) {
        const el = projectStore.getElementById(movingId.value);
        if (el && el instanceof BaseComponent) {
            const from = { ...el.position };
            el.position = { ...movePreviewPos.value };
            historyStore.push({
                type: "move",
                id: el.id,
                from,
                to: { ...movePreviewPos.value },
            });
            projectStore.notifyElementChanged();
        }
        editorStore.movingElementId = null;
        editorStore.movePreviewPos = null;
    }
}

function onComponentMouseDown(e: MouseEvent, id: string) {
    if (activeTool.value !== "select") return;
    if (ctxMenu.value) return;
    if (editorStore.boardFlipped) return; // component moving not available in back view
    e.preventDefault();
    editorStore.movingElementId = id;
    editorStore.selectedElementId = id;
}

// ─── Zoom ────────────────────────────────────────────────────────────────────
function onWheel(e: WheelEvent) {
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = canvasWrap.value!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const newZoom = Math.max(0.25, Math.min(4, editorStore.zoom * factor));
    const ratio = newZoom / editorStore.zoom;
    editorStore.panX = mx - (mx - editorStore.panX) * ratio;
    editorStore.panY = my - (my - editorStore.panY) * ratio;
    editorStore.setZoom(newZoom);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function svgCoordsToGrid(e: MouseEvent): GridPosition | null {
    if (!canvasWrap.value) return null;
    const rect = canvasWrap.value.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - editorStore.panX) / editorStore.zoom;
    const rawY = (e.clientY - rect.top - editorStore.panY) / editorStore.zoom;
    const grid = editorStore.pixelToGrid(
        rawX,
        rawY,
        boardCols.value,
        boardRows.value,
    );
    // When board is flipped, mirror the X axis to get the correct board grid column
    if (editorStore.boardFlipped) return { x: boardCols.value - 1 - grid.x, y: grid.y };
    return grid;
}

// ─── Click на плату/отверстие ────────────────────────────────────────────────
async function onHoleClick(e: MouseEvent, col: number, row: number) {
    if (conflictDialogOpen.value) return;

    // Ctrl+click in select mode: set segment cut points
    if (activeTool.value === "select" && (e.ctrlKey || e.metaKey)) {
        const hit = wires.value.find(
            (w) => findHoleOnWire({ x: col, y: row }, w) !== null,
        );
        if (!hit) return;

        if (!editorStore.segmentCutWireId) {
            editorStore.segmentCutWireId = hit.id;
            editorStore.segmentCutPoints = [{ x: col, y: row }];
        } else if (editorStore.segmentCutWireId === hit.id) {
            editorStore.segmentCutPoints = [
                editorStore.segmentCutPoints[0],
                { x: col, y: row },
            ];
        } else {
            // Different wire — reset and start fresh
            editorStore.segmentCutWireId = hit.id;
            editorStore.segmentCutPoints = [{ x: col, y: row }];
        }
        return;
    }

    if (activeTool.value === "wire") {
        const pos: GridPosition = { x: col, y: row };
        if (!wireStart.value) {
            editorStore.wireStart = pos;
            return;
        }

        if (wireStart.value.x === col && wireStart.value.y === row) {
            editorStore.wireStart = null;
            editorStore.wirePreviewEnd = null;
            return;
        }

        const newWire = new WireTrace(
            wireStart.value,
            pos,
            '#ff0000',
            [],
            undefined,
            [],
            [],
            editorStore.boardFlipped ? 'back' : 'front',
        );

        // Only consider wires on the same board side — opposite-side wires are separated by the PCB
        const sameSideWires = wires.value.filter((w) => w.side === newWire.side);

        const junctions = findJunctions(
            newWire,
            sameSideWires,
            GEOMETRY_CONSTANTS,
        );
        const crossings = findCrossings(
            newWire,
            sameSideWires,
            GEOMETRY_CONSTANTS,
        );

        // Исключаем провода из crossings, которые уже есть в junctions (один провод — один вопрос)
        const junctionWireIds = new Set(junctions.map((j) => j.wire.id));
        const uniqueCrossings = crossings.filter(
            (c) => !junctionWireIds.has(c.wire.id),
        );

        if (junctions.length > 0 || uniqueCrossings.length > 0) {
            const items: ConflictItem[] = [
                ...junctions.map((j) => ({
                    label: `Дырка ${formatGridPos(j.sharedEndpoint.x > 0 ? Math.round((j.sharedEndpoint.x - MARGIN_LEFT - HOLE_SPACING / 2) / HOLE_SPACING) - CANVAS_PADDING : 0, 0)}`,
                    description: "Два провода заканчиваются в одной точке",
                    optionA: { label: "Раздельно", value: "keep" },
                    optionB: { label: "Объединить", value: "merge" },
                    defaultValue: "keep",
                })),
                ...uniqueCrossings.map((c) => ({
                    label: `Пересечение`,
                    description: "Новый провод пересекает существующий",
                    optionA: { label: "Перепрыгнуть", value: "jumpOver" },
                    optionB: { label: "Соединить", value: "connect" },
                    defaultValue: "jumpOver",
                })),
            ];

            // Строим читаемые метки с координатами
            for (let i = 0; i < junctions.length; i++) {
                const pt = junctions[i].sharedEndpoint;
                const gx =
                    Math.round(
                        (pt.x - MARGIN_LEFT - HOLE_SPACING / 2) / HOLE_SPACING,
                    ) - CANVAS_PADDING;
                const gy =
                    Math.round(
                        (pt.y - MARGIN_TOP - HOLE_SPACING / 2) / HOLE_SPACING,
                    ) - CANVAS_PADDING;
                items[i].label = `Дырка ${formatGridPos(gx, gy)}`;
            }
            for (let i = 0; i < uniqueCrossings.length; i++) {
                const pt = uniqueCrossings[i].point;
                const gx =
                    Math.round(
                        (pt.x - MARGIN_LEFT - HOLE_SPACING / 2) / HOLE_SPACING,
                    ) - CANVAS_PADDING;
                const gy =
                    Math.round(
                        (pt.y - MARGIN_TOP - HOLE_SPACING / 2) / HOLE_SPACING,
                    ) - CANVAS_PADDING;
                items[junctions.length + i].label =
                    `Пересечение в ${formatGridPos(gx, gy)}`;
            }

            const decisions = await askConflicts(items);

            // Собираем все junctions с решением 'merge'
            const mergeJunctions = junctions.filter(
                (_, i) => decisions[i] === "merge",
            );

            if (mergeJunctions.length === 2) {
                // Оба конца нового провода объединяются с существующими:
                // Строим: aFree → sharedA → [new internal] → sharedB → bFree
                const wireA = mergeJunctions[0].wire;
                const wireB = mergeJunctions[1].wire;

                // sharedA = grid координаты точки соединения нового провода с wireA
                const sharedAGx =
                    Math.round(
                        (mergeJunctions[0].sharedEndpoint.x -
                            MARGIN_LEFT -
                            HOLE_SPACING / 2) /
                            HOLE_SPACING,
                    ) - CANVAS_PADDING;
                const sharedAGy =
                    Math.round(
                        (mergeJunctions[0].sharedEndpoint.y -
                            MARGIN_TOP -
                            HOLE_SPACING / 2) /
                            HOLE_SPACING,
                    ) - CANVAS_PADDING;
                const sharedBGx =
                    Math.round(
                        (mergeJunctions[1].sharedEndpoint.x -
                            MARGIN_LEFT -
                            HOLE_SPACING / 2) /
                            HOLE_SPACING,
                    ) - CANVAS_PADDING;
                const sharedBGy =
                    Math.round(
                        (mergeJunctions[1].sharedEndpoint.y -
                            MARGIN_TOP -
                            HOLE_SPACING / 2) /
                            HOLE_SPACING,
                    ) - CANVAS_PADDING;

                // Свободный конец wireA (противоположный sharedA)
                const aStartIsShared =
                    wireA.startPosition.x === sharedAGx &&
                    wireA.startPosition.y === sharedAGy;
                const aFreeEnd = aStartIsShared
                    ? wireA.endPosition
                    : wireA.startPosition;
                // Waypoints wireA в порядке aFree→sharedA
                const aWpts = aStartIsShared
                    ? [...wireA.waypoints].reverse()
                    : [...wireA.waypoints];

                // Свободный конец wireB (противоположный sharedB)
                const bStartIsShared =
                    wireB.startPosition.x === sharedBGx &&
                    wireB.startPosition.y === sharedBGy;
                const bFreeEnd = bStartIsShared
                    ? wireB.endPosition
                    : wireB.startPosition;
                // Waypoints wireB в порядке sharedB→bFree
                const bWpts = bStartIsShared
                    ? [...wireB.waypoints]
                    : [...wireB.waypoints].reverse();

                // Waypoints нового провода в порядке sharedA→sharedB
                const newStartIsSharedA =
                    newWire.startPosition.x === sharedAGx &&
                    newWire.startPosition.y === sharedAGy;
                const newInternalWpts = newStartIsSharedA
                    ? [...newWire.waypoints]
                    : [...newWire.waypoints].reverse();

                const allWaypoints = [
                    ...aWpts,
                    { x: sharedAGx, y: sharedAGy },
                    ...newInternalWpts,
                    { x: sharedBGx, y: sharedBGy },
                    ...bWpts,
                ];

                // Создаём новый объект вместо мутации (shallowRef требует замены ссылки)
                const mergedCrossings = [
                    ...wireA.crossings,
                    ...wireB.crossings,
                ]
                const merged = new WireTrace(
                    aFreeEnd,
                    bFreeEnd,
                    wireA.color,
                    allWaypoints,
                    wireA.id,
                    mergedCrossings,
                    [...wireA.sharedHoles, ...wireB.sharedHoles],
                    wireA.side,
                );
                // Add crossings from the new wire portion (skipped by early return below)
                for (let ci = 0; ci < uniqueCrossings.length; ci++) {
                    if (decisions[junctions.length + ci] === 'jumpOver') {
                        merged.crossings.push({
                            withWireId: uniqueCrossings[ci].wire.id,
                            point: { ...uniqueCrossings[ci].point },
                            jumpOver: true,
                        })
                    }
                }
                historyStore.push({
                    type: "remove",
                    element: wireA.serialize(),
                });
                historyStore.push({
                    type: "remove",
                    element: wireB.serialize(),
                });
                historyStore.push({ type: "add", element: merged.serialize() });
                projectStore.removeElement(wireA.id);
                projectStore.removeElement(wireB.id);
                projectStore.addElement(merged);
                editorStore.wireStart = null;
                editorStore.wirePreviewEnd = null;
                return;
            } else if (mergeJunctions.length === 1) {
                // Один конец нового провода объединяется с существующим.
                // Строим merged: newFree → sharedPoint → existingFree
                const existing = mergeJunctions[0].wire;

                // Определяем свободный конец нового провода (не совпадающий с shared)
                const sharedGx =
                    Math.round(
                        (mergeJunctions[0].sharedEndpoint.x -
                            MARGIN_LEFT -
                            HOLE_SPACING / 2) /
                            HOLE_SPACING,
                    ) - CANVAS_PADDING;
                const sharedGy =
                    Math.round(
                        (mergeJunctions[0].sharedEndpoint.y -
                            MARGIN_TOP -
                            HOLE_SPACING / 2) /
                            HOLE_SPACING,
                    ) - CANVAS_PADDING;
                const newStartIsShared =
                    newWire.startPosition.x === sharedGx &&
                    newWire.startPosition.y === sharedGy;
                const newFree = newStartIsShared
                    ? newWire.endPosition
                    : newWire.startPosition;
                // Waypoints нового провода в порядке newFree→shared
                const newWpts = newStartIsShared
                    ? [...newWire.waypoints].reverse()
                    : [...newWire.waypoints];

                // Определяем свободный конец существующего (не совпадающий с shared)
                const exStartIsShared =
                    existing.startPosition.x === sharedGx &&
                    existing.startPosition.y === sharedGy;
                const existingFree = exStartIsShared
                    ? existing.endPosition
                    : existing.startPosition;
                // Waypoints существующего в порядке shared→existingFree
                const exWpts = exStartIsShared
                    ? [...existing.waypoints]
                    : [...existing.waypoints].reverse();

                const mergedWaypoints = [
                    ...newWpts,
                    { x: sharedGx, y: sharedGy },
                    ...exWpts,
                ];
                // Создаём новый объект вместо мутации (shallowRef требует замены ссылки)
                const merged = new WireTrace(
                    newFree,
                    existingFree,
                    existing.color,
                    mergedWaypoints,
                    existing.id,
                    existing.crossings,
                    existing.sharedHoles,
                    existing.side,
                );
                // Add crossings from the new wire portion (skipped by early return below)
                for (let ci = 0; ci < uniqueCrossings.length; ci++) {
                    if (decisions[junctions.length + ci] === 'jumpOver') {
                        merged.crossings.push({
                            withWireId: uniqueCrossings[ci].wire.id,
                            point: { ...uniqueCrossings[ci].point },
                            jumpOver: true,
                        })
                    }
                }
                historyStore.push({
                    type: "remove",
                    element: existing.serialize(),
                });
                historyStore.push({ type: "add", element: merged.serialize() });
                projectStore.removeElement(existing.id);
                projectStore.addElement(merged);
                editorStore.wireStart = null;
                editorStore.wirePreviewEnd = null;
                return;
            }
            // 'keep' junctions — записываем sharedHoles для визуальных индикаторов
            for (let i = 0; i < junctions.length; i++) {
                if (decisions[i] === "keep") {
                    const pt = junctions[i].sharedEndpoint;
                    const gx =
                        Math.round(
                            (pt.x - MARGIN_LEFT - HOLE_SPACING / 2) /
                                HOLE_SPACING,
                        ) - CANVAS_PADDING;
                    const gy =
                        Math.round(
                            (pt.y - MARGIN_TOP - HOLE_SPACING / 2) /
                                HOLE_SPACING,
                        ) - CANVAS_PADDING;
                    const gridPt = { x: gx, y: gy };
                    // Добавляем в новый провод
                    newWire.sharedHoles.push(gridPt);
                    // Добавляем в существующий провод (если ещё нет)
                    const existing = junctions[i].wire;
                    if (
                        !existing.sharedHoles.some(
                            (h) => h.x === gx && h.y === gy,
                        )
                    ) {
                        existing.sharedHoles.push(gridPt);
                    }
                }
            }

            // Обрабатываем решения по crossings
            for (let i = 0; i < uniqueCrossings.length; i++) {
                if (decisions[junctions.length + i] === "jumpOver") {
                    newWire.crossings.push({
                        withWireId: uniqueCrossings[i].wire.id,
                        point: { ...uniqueCrossings[i].point },
                        jumpOver: true,
                    });
                }
                // 'connect' — ничего, провода электрически соединены
            }
        }

        // Проверка совместимости пинов (существующая логика)
        const conflict = checkWireConflict(wireStart.value, pos);
        if (conflict) {
            wireConflictMsg.value = conflict;
            setTimeout(() => {
                wireConflictMsg.value = null;
            }, 4000);
        }

        projectStore.addElement(newWire);
        historyStore.push({ type: "add", element: newWire.serialize() });
        editorStore.wireStart = null;
        editorStore.wirePreviewEnd = null;
    } else if (activeTool.value === "select") {
        editorStore.selectedElementId = null;
    }
}

function selectElement(id: string) {
    if (activeTool.value === "select") {
        editorStore.selectedElementId = id;
    }
}

// ─── Drag & Drop ─────────────────────────────────────────────────────────────
function onDragOver(e: DragEvent) {
    if (!editorStore.isDragging || !canvasWrap.value) return;
    if (editorStore.boardFlipped) return; // component placement not available in back view
    const rect = canvasWrap.value.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - editorStore.panX) / editorStore.zoom;
    const rawY = (e.clientY - rect.top - editorStore.panY) / editorStore.zoom;
    const grid = editorStore.pixelToGrid(
        rawX,
        rawY,
        boardCols.value,
        boardRows.value,
    );
    editorStore.updateDragPreview(grid);
}

function onDrop(e: DragEvent) {
    const typeId = e.dataTransfer?.getData("componentType");
    try {
        if (!typeId || !editorStore.dragGridPos || !canvasWrap.value) return;

        const pos = editorStore.dragGridPos;
        const def = editorStore.draggingDef;

        const newEl = ComponentFactory.fromDefinition(def!, pos);
        if (newEl instanceof BaseComponent) {
            // Check collisions only for holes that land on the board
            const occupied = projectStore.occupiedHoles;
            const pinsOnBoard = newEl
                .getOccupiedHoles()
                .filter(
                    (h) =>
                        h.x >= 0 &&
                        h.y >= 0 &&
                        h.x < boardCols.value &&
                        h.y < boardRows.value,
                );
            const hasCollision = pinsOnBoard.some((h) =>
                occupied.has(`${h.x},${h.y}`),
            );
            if (!hasCollision) {
                projectStore.addElement(newEl);
                historyStore.push({ type: "add", element: newEl.serialize() });
                editorStore.addProjectComponent(typeId);
                editorStore.selectedElementId = newEl.id;
            }
        }
    } finally {
        editorStore.endDrag();
    }
}

defineExpose({ cutWireSegment });
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
.tooltip-fade-enter-active {
    transition:
        opacity 0.15s ease,
        transform 0.15s ease;
}
.tooltip-fade-leave-active {
    transition: opacity 0.1s ease;
}
.tooltip-fade-enter-from {
    opacity: 0;
    transform: translateY(4px);
}
.tooltip-fade-leave-to {
    opacity: 0;
}
</style>
