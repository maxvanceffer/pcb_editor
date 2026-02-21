<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[560px] h-[600px] flex flex-col gap-0 p-0">
      <DialogHeader class="px-4 pt-4 pb-3 border-b shrink-0">
        <DialogTitle>{{ t('editor.elements.pickerTitle') }}</DialogTitle>
        <div class="relative mt-2">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="search"
            :placeholder="t('editor.elements.pickerSearch')"
            class="pl-8"
            autofocus
          />
        </div>
      </DialogHeader>

      <!-- Фильтр по категориям -->
      <div class="flex gap-1.5 px-4 py-2 border-b shrink-0 flex-wrap">
        <Badge
          v-for="cat in ['all', ...categories]"
          :key="cat"
          :variant="activeCategory === cat ? 'default' : 'outline'"
          class="cursor-pointer select-none"
          @click="activeCategory = cat"
        >
          {{ cat === 'all' ? t('editor.elements.pickerAll') : cat }}
        </Badge>
      </div>

      <!-- Список компонентов -->
      <ScrollArea class="flex-1">
        <div v-if="filtered.length === 0" class="p-6 text-center text-sm text-muted-foreground">
          {{ t('editor.elements.pickerEmpty') }}
        </div>
        <div v-else class="p-2 space-y-0.5">
          <div
            v-for="def in filtered"
            :key="def.id"
            class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
            @click="toggle(def)"
          >
            <img
              v-if="getComponentImage(def.id)"
              :src="getComponentImage(def.id)!"
              class="w-8 h-8 rounded-sm shrink-0 object-cover"
              :alt="def.name"
            />
            <div
              v-else
              class="w-4 h-4 rounded-sm shrink-0"
              :style="{ background: def.color }"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ def.name }}</p>
              <p class="text-xs text-muted-foreground truncate">{{ def.description }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-xs text-muted-foreground">{{ def.widthInHoles }}×{{ def.heightInHoles }}</span>
              <div
                class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                :class="isPinned(def.id) ? 'bg-primary border-primary' : 'border-muted-foreground'"
              >
                <Check v-if="isPinned(def.id)" class="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <div class="px-4 py-3 border-t shrink-0 flex justify-between items-center">
        <span class="text-xs text-muted-foreground">
          {{ t('editor.elements.pickerSelected', { count: pinnedIds.length }) }}
        </span>
        <Button size="sm" @click="$emit('update:open', false)">{{ t('editor.elements.pickerDone') }}</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, Check } from 'lucide-vue-next'
import type { ComponentDefinition } from '@/lib/components/types'
import { getComponentImage } from '@/lib/components/componentImages'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const props = defineProps<{
  open: boolean
  components: ComponentDefinition[]
  pinnedIds: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:pinnedIds': [value: string[]]
}>()

const { t } = useI18n()
const search = ref('')
const activeCategory = ref('all')

const categories = computed(() => [...new Set(props.components.map((c) => c.category))])

const filtered = computed(() => {
  let list = props.components
  if (activeCategory.value !== 'all') {
    list = list.filter((c) => c.category === activeCategory.value)
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    )
  }
  return list
})

function isPinned(id: string) {
  return props.pinnedIds.includes(id)
}

function toggle(def: ComponentDefinition) {
  if (isPinned(def.id)) {
    emit('update:pinnedIds', props.pinnedIds.filter((id) => id !== def.id))
  } else {
    emit('update:pinnedIds', [...props.pinnedIds, def.id])
  }
}
</script>
