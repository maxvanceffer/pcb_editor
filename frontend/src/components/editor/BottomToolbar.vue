<template>
    <!-- Панель списка элементов -->
    <Transition name="slide-up">
        <div
            v-if="showLayerPanel"
            class="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 w-72 rounded-xl border bg-background/95 backdrop-blur-sm shadow-xl"
            @mousedown.stop
            @click.stop
        >
            <div class="flex items-center justify-between px-3 py-2 border-b">
                <span class="text-xs font-medium">{{
                    t("editor.toolbar.placed")
                }}</span>
                <span class="text-xs text-muted-foreground"
                    >{{ visibleCount }} / {{ allComponents.length }}</span
                >
            </div>
            <div class="max-h-60 overflow-y-auto">
                <div
                    v-if="allComponents.length === 0"
                    class="px-3 py-4 text-xs text-muted-foreground text-center"
                >
                    {{ t("editor.toolbar.noElements") }}
                </div>
                <div
                    v-for="comp in allComponents"
                    :key="comp.id"
                    class="flex items-center gap-2 px-3 py-1.5 border-b last:border-0 hover:bg-accent/50 transition-colors"
                    :class="{
                        'opacity-40': editorStore.isElementHidden(comp.id),
                    }"
                >
                    <div
                        class="w-2.5 h-2.5 rounded-sm shrink-0"
                        :style="{ background: comp.color }"
                    />
                    <span class="flex-1 text-xs font-mono truncate">{{
                        comp.type
                    }}</span>
                    <span
                        class="text-[10px] text-muted-foreground font-mono shrink-0"
                    >
                        {{ comp.position.x }},{{ comp.position.y }}
                    </span>
                    <button
                        class="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                        :title="
                            editorStore.isElementHidden(comp.id)
                                ? t('editor.toolbar.show')
                                : t('editor.toolbar.hide')
                        "
                        @click="editorStore.toggleElementVisibility(comp.id)"
                    >
                        <EyeOff
                            v-if="editorStore.isElementHidden(comp.id)"
                            class="w-3.5 h-3.5"
                        />
                        <Eye v-else class="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    </Transition>

    <!-- Инструменты по центру снизу -->
    <div
        class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-xl border bg-background/90 backdrop-blur-sm shadow-lg z-10"
    >
        <template v-for="tool in tools" :key="tool.id">
            <button
                class="relative group flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
                :class="
                    activeTool === tool.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                "
                @click="editorStore.activeTool = tool.id as Tool"
            >
                <component :is="tool.icon" class="w-4 h-4" />
                <div
                    class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover border px-2 py-1 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    {{ tool.label }}
                    <kbd class="ml-1.5 text-muted-foreground">{{
                        tool.key
                    }}</kbd>
                </div>
            </button>
            <div v-if="tool.id === 'hand'" class="w-px h-5 bg-border mx-0.5" />
        </template>

        <div class="w-px h-5 bg-border mx-0.5" />

        <!-- Toggle меток пинов -->
        <button
            class="relative group flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            :class="
                editorStore.showPinLabels
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            "
            @click="editorStore.showPinLabels = !editorStore.showPinLabels"
        >
            <Tag class="w-4 h-4" />
            <div
                class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover border px-2 py-1 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {{
                    editorStore.showPinLabels
                        ? t("editor.toolbar.hidePinLabels")
                        : t("editor.toolbar.showPinLabels")
                }}
            </div>
        </button>

        <!-- Toggle списка элементов -->
        <button
            class="relative group flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            :class="
                showLayerPanel
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            "
            @click="showLayerPanel = !showLayerPanel"
        >
            <ListTree class="w-4 h-4" />
            <div
                class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover border px-2 py-1 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {{ t("editor.toolbar.elementsList") }}
            </div>
        </button>
    </div>

    <!-- Масштаб справа снизу -->
    <div
        class="absolute bottom-4 right-4 flex items-center gap-1 px-2 py-1.5 rounded-xl border bg-background/90 backdrop-blur-sm shadow-lg z-10"
    >
        <button
            class="group relative flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            @click="editorStore.centerBoard()"
        >
            <Crosshair class="w-3.5 h-3.5" />
            <div
                class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover border px-2 py-1 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {{ t("editor.toolbar.center") }}
            </div>
        </button>

        <div class="w-px h-5 bg-border mx-0.5" />

        <button
            class="group relative flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            @click="editorStore.setZoom(editorStore.zoom * 0.8)"
        >
            <Minus class="w-3.5 h-3.5" />
            <div
                class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover border px-2 py-1 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {{ t("editor.toolbar.zoomOut") }}
            </div>
        </button>

        <button
            class="group relative px-2 h-8 rounded-lg text-xs font-mono text-muted-foreground hover:bg-accent hover:text-foreground transition-colors min-w-13 text-center"
            @click="resetZoom"
        >
            {{ Math.round(editorStore.zoom * 100) }}%
            <div
                class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover border px-2 py-1 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {{ t("editor.toolbar.zoomReset") }}
            </div>
        </button>

        <button
            class="group relative flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            @click="editorStore.setZoom(editorStore.zoom * 1.25)"
        >
            <Plus class="w-3.5 h-3.5" />
            <div
                class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover border px-2 py-1 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {{ t("editor.toolbar.zoomIn") }}
            </div>
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import {
    MousePointer2,
    Hand,
    Spline,
    Minus,
    Plus,
    Tag,
    Crosshair,
    ListTree,
    Eye,
    EyeOff,
} from "lucide-vue-next";
import { useEditorStore, type Tool } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";

const { t } = useI18n();
const editorStore = useEditorStore();
const projectStore = useProjectStore();

const activeTool = computed(() => editorStore.activeTool);
const showLayerPanel = ref(false);

const allComponents = computed(() => projectStore.placedComponents);
const visibleCount = computed(
    () =>
        allComponents.value.filter((c) => !editorStore.isElementHidden(c.id))
            .length,
);

const tools = computed(() => [
    {
        id: "select",
        icon: MousePointer2,
        label: t("editor.tools.select"),
        key: "S",
    },
    { id: "hand", icon: Hand, label: t("editor.tools.hand"), key: "H" },
    { id: "wire", icon: Spline, label: t("editor.tools.wire"), key: "W" },
]);

function resetZoom() {
    editorStore.setZoom(1);
    editorStore.centerBoard();
}
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition:
        opacity 0.15s,
        transform 0.15s;
}
.slide-up-enter-from,
.slide-up-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(6px);
}
</style>
