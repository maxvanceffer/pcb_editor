<template>
  <div
    class="relative group flex items-center gap-2 px-2 py-1.5 rounded-md border bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
    :draggable="draggable"
    @dragstart="$emit('dragstart', $event)"
  >
    <img
      v-if="getComponentImage(definition.id)"
      :src="getComponentImage(definition.id)!"
      class="w-8 h-8 rounded-sm shrink-0 object-cover"
      :alt="definition.name"
    />
    <div
      v-else
      class="w-3 h-3 rounded-sm shrink-0"
      :style="{ background: definition.color }"
    />
    <div class="flex-1 min-w-0">
      <p class="text-xs font-medium truncate">{{ definition.name }}</p>
      <p class="text-xs text-muted-foreground">{{ definition.widthInHoles }}×{{ definition.heightInHoles }}</p>
    </div>

    <!-- Тултип со specs -->
    <div
      v-if="definition.specs"
      class="pointer-events-none absolute left-full ml-2 top-0 z-50 min-w-[140px] rounded-md bg-popover border px-2.5 py-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-xs"
    >
      <p class="font-medium mb-1.5">{{ definition.name }}</p>
      <div v-for="(val, key) in definition.specs" :key="key" class="flex justify-between gap-3">
        <span class="text-muted-foreground">{{ key }}</span>
        <span class="font-mono font-medium">{{ val }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ComponentDefinition } from '@/lib/components/types'
import { getComponentImage } from '@/lib/components/componentImages'

defineProps<{ definition: ComponentDefinition; draggable?: boolean }>()
defineEmits<{ dragstart: [e: DragEvent] }>()
</script>
