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
            class="absolute z-20 bg-background border rounded-md shadow-lg py-1 min-w-40 text-sm"
            :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
            @mousedown.stop
            @click.stop
        >
            <div
                class="px-2 py-1 text-xs text-muted-foreground border-b mb-1 truncate max-w-40"
            >
                {{ ctxMenu.label }}
            </div>
            <template v-if="ctxMenu.isComponent">
                <button
                    class="w-full text-left px-3 py-1.5 hover:bg-accent"
                    @click="ctxRotate(1)"
                >
                    {{ t("editor.board.rotate90cw") }}
                </button>
                <button
                    class="w-full text-left px-3 py-1.5 hover:bg-accent"
                    @click="ctxRotate(-1)"
                >
                    {{ t("editor.board.rotate90ccw") }}
                </button>
                <button
                    class="w-full text-left px-3 py-1.5 hover:bg-accent"
                    @click="openPinLabels()"
                >
                    {{ t("editor.board.configurePins") }}
                </button>
                <div class="border-t my-1" />
            </template>
            <template v-if="!ctxMenu.isComponent">
                <button
                    class="w-full text-left px-3 py-1.5 hover:bg-accent"
                    @click="ctxCheckCrossings()"
                >
                    Проверить пересечения
                </button>
                <button
                    class="w-full text-left px-3 py-1.5 hover:bg-accent"
                    @click="ctxMergeWires()"
                >
                    Объединить провода
                </button>
                <div class="border-t my-1" />
            </template>
            <button
                class="w-full text-left px-3 py-1.5 hover:bg-accent text-destructive"
                @click="ctxDelete()"
            >
                {{ t("editor.board.delete") }}
            </button>
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

        <!-- Wire toast (инфо) -->
        <Transition name="fade">
            <div
                v-if="wireToastMsg"
                class="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm shadow-lg"
            >
                {{ wireToastMsg }}
            </div>
        </Transition>

        <!-- Background toggle -->
        <button
            class="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-background/80 backdrop-blur-sm text-xs text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
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
                    v-for="(label, i) in columnLabels"
                    :key="`col-${i}`"
                    :x="boardOffsetX + i * HOLE_SPACING + HOLE_SPACING / 2"
                    :y="boardOffsetY - BOARD_PAD * 0.3"
                    :fill="
                        wireHoverPos && wireHoverPos.x === i
                            ? '#c8f07a'
                            : '#7ab648'
                    "
                    :font-size="wireHoverPos && wireHoverPos.x === i ? 11 : 9"
                    :font-weight="
                        wireHoverPos && wireHoverPos.x === i ? 'bold' : 'normal'
                    "
                    text-anchor="middle"
                    dominant-baseline="middle"
                    font-family="monospace"
                >
                    {{ label }}
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
                <template v-for="wire in wires" :key="wire.id">
                    <!-- Обычный провод без jump-over арок -->
                    <polyline
                        v-if="!wire.crossings.some((c) => c.jumpOver)"
                        :points="
                            wire.toSVGPoints(
                                HOLE_SPACING,
                                MARGIN_LEFT + CANVAS_PADDING * HOLE_SPACING,
                                MARGIN_TOP + CANVAS_PADDING * HOLE_SPACING,
                            )
                        "
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
                        :x="gridToSvgX(comp.position.x) + 1"
                        :y="gridToSvgY(comp.position.y) + 1"
                        :width="comp.effectiveWidth * HOLE_SPACING - 2"
                        :height="comp.effectiveHeight * HOLE_SPACING - 2"
                        :fill="comp.color"
                        fill-opacity="0.7"
                        rx="3"
                        :stroke="
                            selectedId === comp.id ? '#fff' : 'transparent'
                        "
                        stroke-width="2"
                    />
                    <!-- JST front tab (cable entry side, perpendicular to pin row) -->
                    <template v-if="comp.type.startsWith('jst-')">
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
                            :fill="comp.color"
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
                            :fill="comp.color"
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
                            :fill="comp.color"
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
                            :fill="comp.color"
                            fill-opacity="0.9"
                            rx="2"
                            pointer-events="none"
                        />
                    </template>
                    <!-- Название компонента (скрывается в режиме меток пинов) -->
                    <text
                        v-if="!showPinLabels"
                        :x="
                            gridToSvgX(comp.position.x) +
                            (comp.effectiveWidth * HOLE_SPACING) / 2
                        "
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
                                    pin.label
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
                                    editorStore.getPinLabel(
                                        hoveredComp.id,
                                        pin.id,
                                    ) || pin.label
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
import PinLabelPanel from "@/components/editor/PinLabelPanel.vue";
import { useSettingsStore } from "@/stores/settingsStore";
import { getComponentImage } from "@/lib/components/componentImages";
import WireConflictDialog from "@/components/board/WireConflictDialog.vue";
import type { ConflictItem } from "@/components/board/WireConflictDialog.vue";
import {
    findJunctions,
    findCrossings,
    findHoleOnWire,
    svgPointOnWireSegments,
    splitWireAtPoints,
} from "@/lib/wireGeometry";

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
    return MARGIN_LEFT + (col + CANVAS_PADDING) * HOLE_SPACING;
}
function gridToSvgY(row: number): number {
    return MARGIN_TOP + (row + CANVAS_PADDING) * HOLE_SPACING;
}

const placedComponents = computed(() => projectStore.placedComponents);
const wires = computed(() => projectStore.wires);

const activeTool = computed(() => editorStore.activeTool);
const selectedId = computed(() => editorStore.selectedElementId);
const showPinLabels = computed(() => editorStore.showPinLabels);

// Определяем, с какой стороны пин относительно центра компонента
function pinIsOnRightSide(
    comp: BaseComponent,
    pin: { offsetX: number },
): boolean {
    return pin.offsetX >= comp.widthInHoles / 2;
}

// X-координата текста метки: внутрь от дырки
function pinLabelX(
    comp: BaseComponent,
    pin: { x: number; offsetX: number },
): number {
    const cx = holeX(pin.x);
    if (pinIsOnRightSide(comp, pin)) {
        return cx - 7; // правая колонка → текст левее (внутрь)
    }
    return cx + 7; // левая колонка → текст правее (внутрь)
}

// text-anchor для метки
function pinLabelAnchor(comp: BaseComponent, pin: { offsetX: number }): string {
    return pinIsOnRightSide(comp, pin) ? "end" : "start";
}

// Цвет метки: пользовательская — белая, встроенная — зеленоватая, пустая у JST — оранжевая
function pinLabelColor(
    compId: string,
    pinId: string,
    builtinLabel: string,
): string {
    if (editorStore.getPinLabel(compId, pinId)) return "#ffffff";
    if (
        builtinLabel &&
        builtinLabel !== "+" &&
        builtinLabel !== "-" &&
        !builtinLabel.startsWith("P")
    )
        return "#a8e6a0";
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

function holeX(col: number): number {
    return (
        MARGIN_LEFT + (col + CANVAS_PADDING) * HOLE_SPACING + HOLE_SPACING / 2
    );
}
function holeY(row: number): number {
    return (
        MARGIN_TOP + (row + CANVAS_PADDING) * HOLE_SPACING + HOLE_SPACING / 2
    );
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
const pinLabelPanel = ref<{ comp: BaseComponent; x: number; y: number } | null>(
    null,
);

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
    const x = ctxMenu.value?.x ?? 0;
    const y = ctxMenu.value?.y ?? 0;
    closeCtxMenu();
    if (!id) return;
    const el = projectStore.getElementById(id);
    if (!(el instanceof BaseComponent)) return;
    const wrap = canvasWrap.value!.getBoundingClientRect();
    // Не выйти за правый/нижний край
    pinLabelPanel.value = {
        comp: el,
        x: Math.min(x, wrap.width - 295),
        y: Math.min(y, wrap.height - 340),
    };
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

    const otherWires = wires.value.filter((w) => w.id !== id);
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

    const otherWires = wires.value.filter((w) => w.id !== id);
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
    const pts = wire
        .getAllPoints()
        .map((p) => ({ x: holeX(p.x), y: holeY(p.y) }));
    const jumpOvers = wire.crossings.filter((c) => c.jumpOver);
    if (jumpOvers.length === 0) return "";

    const ARC_HALF = 10;
    const ARC_HEIGHT = 18;

    let d = `M ${pts[0].x},${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
        const segStart = pts[i];
        const segEnd = pts[i + 1];
        const dx = segEnd.x - segStart.x;
        const dy = segEnd.y - segStart.y;
        const len2 = dx * dx + dy * dy;

        const segJumps = jumpOvers
            .filter((jo) => {
                if (len2 < 1) return false;
                const t =
                    ((jo.point.x - segStart.x) * dx +
                        (jo.point.y - segStart.y) * dy) /
                    len2;
                if (t < 0.05 || t > 0.95) return false;
                // Check the crossing is actually on this segment (perpendicular distance < 2px)
                const projX = segStart.x + t * dx;
                const projY = segStart.y + t * dy;
                const dist2 =
                    (jo.point.x - projX) ** 2 + (jo.point.y - projY) ** 2;
                return dist2 < 4;
            })
            .sort((a, b) => {
                const tA =
                    ((a.point.x - segStart.x) * dx +
                        (a.point.y - segStart.y) * dy) /
                    len2;
                const tB =
                    ((b.point.x - segStart.x) * dx +
                        (b.point.y - segStart.y) * dy) /
                    len2;
                return tA - tB;
            });

        for (const jo of segJumps) {
            const len = Math.sqrt(len2);
            const ux = dx / len;
            const uy = dy / len;
            let px = -uy;
            let py = ux;
            // Always arc upward (negative y = toward screen top); for vertical wires — leftward
            if (py > 0 || (py === 0 && px > 0)) { px = -px; py = -py; }

            const arcStartX = jo.point.x - ux * ARC_HALF;
            const arcStartY = jo.point.y - uy * ARC_HALF;
            const arcEndX = jo.point.x + ux * ARC_HALF;
            const arcEndY = jo.point.y + uy * ARC_HALF;
            const ctrlX = jo.point.x + px * ARC_HEIGHT;
            const ctrlY = jo.point.y + py * ARC_HEIGHT;

            d += ` L ${arcStartX},${arcStartY}`;
            d += ` Q ${ctrlX},${ctrlY} ${arcEndX},${arcEndY}`;
        }

        d += ` L ${segEnd.x},${segEnd.y}`;
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
    return editorStore.pixelToGrid(
        rawX,
        rawY,
        boardCols.value,
        boardRows.value,
    );
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

        const newWire = new WireTrace(wireStart.value, pos);

        const junctions = findJunctions(
            newWire,
            wires.value,
            GEOMETRY_CONSTANTS,
        );
        const crossings = findCrossings(
            newWire,
            wires.value,
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
    if (!typeId || !editorStore.dragGridPos || !canvasWrap.value) {
        editorStore.endDrag();
        return;
    }

    const pos = editorStore.dragGridPos;
    const def = editorStore.draggingDef;

    const newEl = ComponentFactory.fromDefinition(def!, pos);
    if (newEl instanceof BaseComponent) {
        // Проверка коллизий только если хоть один пин попадает на плату
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
            editorStore.addToRecentlyUsed(typeId);
            editorStore.selectedElementId = newEl.id;
        }
    }

    editorStore.endDrag();
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
