<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="p-3 border-b shrink-0 flex items-center justify-between">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {{ t('editor.elements.inProject') }}
      </p>
      <button
        class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        @click="pickerOpen = true"
      >
        <Plus class="h-3.5 w-3.5" />
        {{ t('editor.elements.addComponent') }}
      </button>
    </div>

    <!-- Project component list grouped by category -->
    <ScrollArea class="flex-1">
      <div v-if="loading" class="p-4 text-sm text-muted-foreground">
        {{ t('editor.elements.loading') }}
      </div>
      <div
        v-else-if="projectDefs.length === 0"
        class="p-6 text-sm text-muted-foreground italic text-center"
      >
        {{ t('editor.elements.projectEmpty') }}
      </div>
      <div v-else>
        <div v-for="group in grouped" :key="group.category">
          <!-- Group header -->
          <button
            class="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors border-b"
            @click="toggleGroup(group.category)"
          >
            <span>{{ group.category }}</span>
            <ChevronDown
              class="h-3.5 w-3.5 transition-transform duration-150"
              :class="{ '-rotate-90': collapsedGroups.has(group.category) }"
            />
          </button>

          <!-- Group items -->
          <div v-if="!collapsedGroups.has(group.category)" class="p-2 space-y-1">
            <ComponentCard
              v-for="def in group.items"
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
      :project-ids="editorStore.projectComponentIds"
      @add="onAddComponent"
      @remove="onRemoveComponent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, ChevronDown } from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editorStore'
import api from '@/lib/api'
import type { ComponentDefinition } from '@/lib/components/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import ComponentCard from './ComponentCard.vue'
import ComponentPickerDialog from './ComponentPickerDialog.vue'

const { t } = useI18n()
const editorStore = useEditorStore()
const pickerOpen = ref(false)
const loading = ref(true)
const collapsedGroups = ref<Set<string>>(new Set())

// Cache of fetched definitions (id → definition)
const defsCache = ref<Map<string, ComponentDefinition>>(new Map())

async function fetchMissingDefs(ids: string[]) {
  const missing = ids.filter((id) => !defsCache.value.has(id))
  if (!missing.length) return
  const { data } = await api.get('/api/components', { params: { ids: missing.join(','), limit: 200 } })
  const next = new Map(defsCache.value)
  for (const def of data.components as ComponentDefinition[]) {
    next.set(def.id, def)
  }
  defsCache.value = next
}

onMounted(async () => {
  try {
    await fetchMissingDefs(editorStore.projectComponentIds)
  } finally {
    loading.value = false
  }
})

watch(
  () => editorStore.projectComponentIds,
  (ids) => fetchMissingDefs(ids),
)

const projectDefs = computed(() =>
  editorStore.projectComponentIds
    .map((id) => defsCache.value.get(id))
    .filter((d): d is ComponentDefinition => !!d),
)

const grouped = computed(() => {
  const map = new Map<string, ComponentDefinition[]>()
  for (const def of projectDefs.value) {
    const cat = def.category
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(def)
  }
  return [...map.entries()].map(([category, items]) => ({ category, items }))
})

function toggleGroup(category: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(category)) next.delete(category)
  else next.add(category)
  collapsedGroups.value = next
}

function onAddComponent(def: ComponentDefinition) {
  defsCache.value = new Map(defsCache.value).set(def.id, def)
  editorStore.addProjectComponent(def.id)
}

function onRemoveComponent(id: string) {
  editorStore.removeProjectComponent(id)
}

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
