<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent
            class="gap-0 p-0 sm:max-w-md overflow-hidden"
            :show-close-button="false"
        >
            <!-- Header -->
            <div class="flex h-12 items-center justify-between border-b px-4">
                <div class="flex items-center gap-2">
                    <Keyboard class="h-4 w-4 text-muted-foreground" />
                    <span class="text-sm font-medium">{{
                        t("editor.tools.shortcuts")
                    }}</span>
                </div>
                <button
                    class="flex items-center"
                    @click="$emit('update:open', false)"
                >
                    <Kbd>Esc</Kbd>
                </button>
            </div>

            <!-- List -->
            <div class="max-h-115 overflow-y-auto py-2">
                <template v-for="group in grouped" :key="group.id">
                    <!-- Group heading -->
                    <p
                        class="px-4 pb-1 pt-3 text-xs font-medium text-muted-foreground first:pt-1"
                    >
                        {{ t(`editor.shortcuts.categories.${group.id}`) }}
                    </p>

                    <!-- Items -->
                    <div
                        v-for="shortcut in group.items"
                        :key="shortcut.id"
                        class="mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent transition-colors"
                    >
                        <!-- Icon -->
                        <component
                            :is="iconMap[shortcut.id]"
                            class="h-4 w-4 shrink-0 text-muted-foreground"
                        />

                        <!-- Label + description -->
                        <div class="min-w-0 flex-1">
                            <div class="text-sm font-medium leading-tight">
                                {{ t(shortcut.label) }}
                            </div>
                            <div class="mt-0.5 text-xs text-muted-foreground">
                                {{ t(shortcut.description) }}
                            </div>
                        </div>

                        <!-- Kbd badges -->
                        <KbdGroup class="ml-auto">
                            <Kbd
                                v-for="key in shortcut.keystrokes"
                                :key="key"
                                :class="{
                                    'text-md': [
                                        'Ctrl',
                                        'Shift',
                                        'Alt',
                                    ].includes(key),
                                }"
                                >{{ displayKey(key) }}</Kbd
                            >
                        </KbdGroup>
                    </div>
                </template>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
    MousePointer2,
    Hand,
    Spline,
    Save,
    Undo2,
    Redo2,
    Trash2,
    RotateCw,
    Scissors,
    X,
    Keyboard,
    type LucideComponent,
} from "lucide-vue-next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import shortcutsData from "@/data/shortcuts.json";

defineProps<{ open: boolean }>();
defineEmits<{ "update:open": [value: boolean] }>();

const { t } = useI18n();

interface Shortcut {
    id: string;
    category: string;
    label: string;
    description: string;
    keystrokes: string[];
}

const iconMap: Record<string, LucideComponent> = {
    "tool-select": MousePointer2,
    "tool-hand": Hand,
    "tool-wire": Spline,
    save: Save,
    undo: Undo2,
    redo: Redo2,
    delete: Trash2,
    rotate: RotateCw,
    "wire-cut": Scissors,
    cancel: X,
};

const CATEGORY_ORDER = ["tools", "actions"];

const grouped = computed(() =>
    CATEGORY_ORDER.map((id) => ({
        id,
        items: (shortcutsData as Shortcut[]).filter((s) => s.category === id),
    })).filter((g) => g.items.length > 0),
);

// Show Mac symbols when running on macOS
const isMac = navigator.platform.toUpperCase().includes("MAC");

function displayKey(key: string): string {
    if (isMac) {
        if (key === "Ctrl") return "⌘";
        if (key === "Shift") return "⇧";
        if (key === "Alt") return "⌥";
    }
    return key;
}
</script>
