<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Провода в одной дырке</DialogTitle>
      </DialogHeader>

      <p class="text-sm text-muted-foreground">
        Два провода заканчиваются в одной точке. Объединить их в один провод или оставить как два отдельных?
      </p>

      <DialogFooter class="gap-2 sm:gap-0">
        <Button variant="outline" @click="onKeep">Оставить раздельно</Button>
        <Button @click="onMerge">Объединить</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'merge': []
  'keep': []
}>()

function onMerge() {
  emit('update:open', false)
  emit('merge')
}

function onKeep() {
  emit('update:open', false)
  emit('keep')
}
</script>
