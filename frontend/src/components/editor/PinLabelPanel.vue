<template>
  <div
    class="absolute z-30 bg-background border rounded-lg shadow-xl w-72"
    :style="{ left: x + 'px', top: y + 'px' }"
    @mousedown.stop
    @click.stop
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b">
      <span class="text-sm font-medium">{{ comp.type }}</span>
      <button class="text-muted-foreground hover:text-foreground text-lg leading-none" @click="$emit('close')">×</button>
    </div>

    <!-- Description -->
    <div class="px-3 py-2 border-b">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{{ t('editor.pins.description') }}</p>
      <input
        type="text"
        :value="editorStore.getComponentDescription(comp.id)"
        @input="editorStore.setComponentDescription(comp.id, ($event.target as HTMLInputElement).value, false)"
        @blur="editorStore.setComponentDescription(comp.id, ($event.target as HTMLInputElement).value, true)"
        :placeholder="t('editor.pins.descriptionPlaceholder')"
        class="w-full h-7 text-xs border rounded px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>

    <!-- PINS section -->
    <div class="max-h-72 overflow-y-auto">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">{{ t('editor.pins.section') }}</p>
      <div
        v-for="pin in pins"
        :key="pin.id"
        class="flex items-center gap-2 px-3 py-1.5 border-b last:border-0"
      >
        <!-- Built-in label -->
        <span class="text-xs text-muted-foreground w-8 shrink-0 font-mono">{{ pin.label }}</span>

        <!-- Editable input (only when pinLabelsEditable) -->
        <div v-if="comp.pinLabelsEditable" class="flex-1 relative">
          <input
            type="text"
            :list="`presets-${pin.id}`"
            :value="editorStore.getPinLabel(comp.id, pin.id)"
            @change="editorStore.setPinLabel(comp.id, pin.id, ($event.target as HTMLInputElement).value)"
            @input="editorStore.setPinLabel(comp.id, pin.id, ($event.target as HTMLInputElement).value)"
            :placeholder="pin.label || t('editor.pins.notSet')"
            class="w-full h-7 text-xs border rounded px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <datalist :id="`presets-${pin.id}`">
            <option v-for="p in editorStore.SIGNAL_PRESETS" :key="p" :value="p" />
          </datalist>
        </div>

        <!-- Read-only label (fixed component) -->
        <span
          v-else
          class="flex-1 text-xs text-muted-foreground italic px-2"
        >{{ pin.label }}</span>
      </div>

      <!-- Notice for fixed-pin components -->
      <p v-if="!comp.pinLabelsEditable" class="text-xs text-muted-foreground px-3 py-2 border-t">
        {{ t('editor.pins.fixedPins') }}
      </p>
    </div>

    <!-- Power conflict warnings -->
    <div v-if="conflicts.length > 0" class="px-3 py-2 border-t bg-destructive/10">
      <p class="text-xs font-medium text-destructive mb-1">{{ t('editor.pins.conflicts') }}</p>
      <div v-for="c in conflicts" :key="c" class="text-xs text-destructive">{{ c }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '@/stores/editorStore'
import { useProjectStore } from '@/stores/projectStore'
import { WireTrace } from '@/lib/components/WireTrace'
import type { Pin, GridPosition } from '@/lib/components/types'

interface ComponentLike {
  id: string
  type: string
  pinLabelsEditable: boolean
  getAbsolutePinPositions(): Array<Pin & GridPosition>
}

const { t } = useI18n()

const props = defineProps<{
  comp: ComponentLike
  x: number
  y: number
}>()

defineEmits<{ close: [] }>()

const editorStore = useEditorStore()
const projectStore = useProjectStore()

const pins = computed(() => props.comp.getAbsolutePinPositions())

const POWER_POSITIVE = new Set(['VCC', '5V', '3V3', 'PWR'])
const POWER_NEGATIVE = new Set(['GND'])

const conflicts = computed(() => {
  const result: string[] = []
  for (const wire of projectStore.wires) {
    if (!(wire instanceof WireTrace)) continue
    const startPin = findPinAtPos(wire.startPosition.x, wire.startPosition.y)
    const endPin = findPinAtPos(wire.endPosition.x, wire.endPosition.y)
    if (!startPin || !endPin) continue
    const startLabel = (editorStore.getPinLabel(startPin.compId, startPin.pinId) || startPin.builtinLabel).toUpperCase()
    const endLabel = (editorStore.getPinLabel(endPin.compId, endPin.pinId) || endPin.builtinLabel).toUpperCase()
    if (
      (POWER_NEGATIVE.has(startLabel) && POWER_POSITIVE.has(endLabel)) ||
      (POWER_POSITIVE.has(startLabel) && POWER_NEGATIVE.has(endLabel))
    ) {
      result.push(`${startPin.compId.slice(0, 6)}… ${startLabel} → ${endPin.compId.slice(0, 6)}… ${endLabel}`)
    }
  }
  return result
})

function findPinAtPos(x: number, y: number) {
  for (const comp of projectStore.placedComponents) {
    for (const pin of comp.getAbsolutePinPositions()) {
      if (pin.x === x && pin.y === y) {
        return { compId: comp.id, pinId: pin.id, builtinLabel: pin.label }
      }
    }
  }
  return null
}
</script>
