<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Конфликты при прокладке провода</DialogTitle>
      </DialogHeader>

      <div class="space-y-3 py-1">
        <div
          v-for="(conflict, i) in conflicts"
          :key="i"
          class="flex items-center justify-between gap-3 rounded-md border p-3"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium leading-tight">{{ conflict.label }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">{{ conflict.description }}</p>
          </div>
          <div class="flex rounded-md border overflow-hidden shrink-0 text-xs">
            <button
              class="px-2.5 py-1.5 transition-colors"
              :class="decisions[i] === conflict.optionA.value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'"
              @click="decisions[i] = conflict.optionA.value"
            >{{ conflict.optionA.label }}</button>
            <button
              class="px-2.5 py-1.5 border-l transition-colors"
              :class="decisions[i] === conflict.optionB.value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'"
              @click="decisions[i] = conflict.optionB.value"
            >{{ conflict.optionB.label }}</button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button @click="onConfirm">Применить</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface ConflictItem {
  label: string
  description: string
  optionA: { label: string; value: string }
  optionB: { label: string; value: string }
  defaultValue: string
}

const props = defineProps<{
  open: boolean
  conflicts: ConflictItem[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': [decisions: string[]]
}>()

const decisions = ref<string[]>([])

watch(() => props.conflicts, (list) => {
  decisions.value = list.map((c) => c.defaultValue)
}, { immediate: true })

function onConfirm() {
  // emit confirm before update:open so the parent resolves the Promise
  // with user choices before the dialog-close event fires
  emit('confirm', [...decisions.value])
  emit('update:open', false)
}
</script>
