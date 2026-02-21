<template>
  <div class="flex flex-col h-full">
    <div class="p-3 border-b">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{{ t('editor.elements.recent') }}</p>
      <div v-if="recentDefs.length === 0" class="text-xs text-muted-foreground italic">{{ t('editor.elements.recentEmpty') }}</div>
      <div class="space-y-1">
        <ComponentCard
          v-for="def in recentDefs"
          :key="def.id"
          :definition="def"
          :draggable="true"
          @dragstart="onDragStart($event, def)"
        />
      </div>
    </div>

    <ScrollArea class="flex-1">
      <div v-if="loading" class="p-4 text-sm text-muted-foreground">{{ t('editor.elements.loading') }}</div>
      <div v-else>
        <div v-for="(group, category) in grouped" :key="category" class="p-3">
          <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{{ category }}</p>
          <div class="space-y-1">
            <ComponentCard
              v-for="def in group"
              :key="def.id"
              :definition="def"
              :draggable="true"
              @dragstart="onDragStart($event, def)"
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '@/stores/editorStore'
import api from '@/lib/api'
import type { ComponentDefinition } from '@/lib/components/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import ComponentCard from './ComponentCard.vue'

const { t } = useI18n()
const editorStore = useEditorStore()
const allComponents = ref<ComponentDefinition[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get('/api/components')
    allComponents.value = data.components
  } finally {
    loading.value = false
  }
})

const recentDefs = computed(() =>
  editorStore.recentlyUsed
    .map((id) => allComponents.value.find((c) => c.id === id))
    .filter((c): c is ComponentDefinition => !!c),
)

const grouped = computed(() => {
  const result: Record<string, ComponentDefinition[]> = {}
  for (const comp of allComponents.value) {
    if (!result[comp.category]) result[comp.category] = []
    result[comp.category]!.push(comp)
  }
  return result
})

function onDragStart(e: DragEvent, def: ComponentDefinition) {
  e.dataTransfer!.effectAllowed = 'copy'
  e.dataTransfer!.setData('componentType', def.id)
  // Прозрачный ghost image
  const ghost = document.createElement('div')
  ghost.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0'
  document.body.appendChild(ghost)
  e.dataTransfer!.setDragImage(ghost, 0, 0)
  setTimeout(() => document.body.removeChild(ghost), 0)
  editorStore.startDrag(def)
}
</script>
