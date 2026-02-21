<template>
  <div class="p-3 space-y-5">
    <div>
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{{ t('editor.tools.title') }}</p>
      <div class="grid grid-cols-3 gap-1">
        <button
          v-for="tool in tools"
          :key="tool.id"
          class="flex flex-col items-center gap-1 px-2 py-2 rounded-md border text-xs transition-colors"
          :class="activeTool === tool.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'"
          @click="editorStore.activeTool = tool.id as Tool"
        >
          <span class="text-base">{{ tool.icon }}</span>
          <span>{{ tool.label }}</span>
        </button>
      </div>
    </div>

    <Separator />

    <div>
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {{ t('editor.tools.zoom', { value: Math.round(editorStore.zoom * 100) }) }}
      </p>
      <Slider
        :min="25"
        :max="400"
        :step="5"
        :model-value="[Math.round(editorStore.zoom * 100)]"
        @update:model-value="(v) => editorStore.setZoom(((v ?? [100])[0] ?? 100) / 100)"
        class="mb-2"
      />
      <div class="flex gap-2">
        <button class="flex-1 text-xs border rounded py-1 hover:bg-accent" @click="editorStore.setZoom(editorStore.zoom * 0.8)">−</button>
        <button class="flex-1 text-xs border rounded py-1 hover:bg-accent" @click="editorStore.setZoom(1); editorStore.panX = 0; editorStore.panY = 0">100%</button>
        <button class="flex-1 text-xs border rounded py-1 hover:bg-accent" @click="editorStore.setZoom(editorStore.zoom * 1.25)">+</button>
      </div>
    </div>

    <Separator />

    <div>
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{{ t('editor.tools.shortcuts') }}</p>
      <div class="space-y-1 text-xs text-muted-foreground">
        <div class="flex justify-between"><span>{{ t('editor.tools.select') }}</span><kbd class="bg-muted px-1 rounded">S</kbd></div>
        <div class="flex justify-between"><span>{{ t('editor.tools.hand') }}</span><kbd class="bg-muted px-1 rounded">H</kbd></div>
        <div class="flex justify-between"><span>{{ t('editor.tools.wire') }}</span><kbd class="bg-muted px-1 rounded">W</kbd></div>
        <div class="flex justify-between"><span>{{ t('editor.tools.rotate') }}</span><kbd class="bg-muted px-1 rounded">R</kbd></div>
        <div class="flex justify-between"><span>{{ t('editor.tools.delete') }}</span><kbd class="bg-muted px-1 rounded">Del</kbd></div>
        <div class="flex justify-between"><span>{{ t('editor.tools.undo') }}</span><kbd class="bg-muted px-1 rounded">Ctrl+Z</kbd></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditorStore, type Tool } from '@/stores/editorStore'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'

const { t } = useI18n()
const editorStore = useEditorStore()
const activeTool = computed(() => editorStore.activeTool)

const tools = computed(() => [
  { id: 'select', icon: '↖', label: t('editor.tools.select') },
  { id: 'hand',   icon: '✋', label: t('editor.tools.hand') },
  { id: 'wire',   icon: '⚡', label: t('editor.tools.wire') },
])
</script>
