<template>
  <div class="flex flex-col h-full">
    <!-- Недавно использованные -->
    <div class="p-3 border-b shrink-0">
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

    <!-- Закреплённые компоненты -->
    <div class="p-3 border-b shrink-0">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ t('editor.elements.pinned') }}</p>
        <button
          class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          @click="pickerOpen = true"
        >
          <Plus class="h-3.5 w-3.5" />
          {{ t('editor.elements.manage') }}
        </button>
      </div>
      <div v-if="pinnedDefs.length === 0" class="text-xs text-muted-foreground italic">{{ t('editor.elements.pinnedEmpty') }}</div>
      <div class="space-y-1">
        <ComponentCard
          v-for="def in pinnedDefs"
          :key="def.id"
          :definition="def"
          :draggable="true"
          @dragstart="onDragStart($event, def)"
        />
      </div>
    </div>

    <!-- Все компоненты по группам -->
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

    <ComponentPickerDialog
      v-model:open="pickerOpen"
      :components="allComponents"
      :pinned-ids="editorStore.pinnedComponents"
      @update:pinned-ids="editorStore.setPinnedComponents($event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus } from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editorStore'
import api from '@/lib/api'
import type { ComponentDefinition } from '@/lib/components/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import ComponentCard from './ComponentCard.vue'
import ComponentPickerDialog from './ComponentPickerDialog.vue'

const { t } = useI18n()
const editorStore = useEditorStore()
const allComponents = ref<ComponentDefinition[]>([])
const loading = ref(true)
const pickerOpen = ref(false)

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

const pinnedDefs = computed(() =>
  editorStore.pinnedComponents
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
  const ghost = document.createElement('div')
  ghost.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0'
  document.body.appendChild(ghost)
  e.dataTransfer!.setDragImage(ghost, 0, 0)
  setTimeout(() => document.body.removeChild(ghost), 0)
  editorStore.startDrag(def)
}
</script>
