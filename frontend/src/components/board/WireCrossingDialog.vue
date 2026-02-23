<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Провода пересекаются</DialogTitle>
      </DialogHeader>

      <p class="text-sm text-muted-foreground">
        Новый провод пересекает существующий. Соединить их в точке пересечения или перепрыгнуть через него?
      </p>

      <DialogFooter class="gap-2 sm:gap-0">
        <Button variant="outline" @click="onJumpOver">Перепрыгнуть</Button>
        <Button @click="onConnect">Соединить</Button>
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
  'connect': []
  'jumpOver': []
}>()

function onConnect() {
  emit('update:open', false)
  emit('connect')
}

function onJumpOver() {
  emit('update:open', false)
  emit('jumpOver')
}
</script>
