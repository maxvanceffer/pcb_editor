<template>
  <div class="flex flex-col h-full">
    <div class="flex gap-2 p-3 border-b">
      <button
        class="flex-1 text-xs border rounded py-1.5 transition-colors"
        :class="historyStore.canUndo ? 'hover:bg-accent' : 'opacity-40 cursor-not-allowed'"
        :disabled="!historyStore.canUndo"
        @click="historyStore.undo()"
      >{{ t('editor.history.undo') }}</button>
      <button
        class="flex-1 text-xs border rounded py-1.5 transition-colors"
        :class="historyStore.canRedo ? 'hover:bg-accent' : 'opacity-40 cursor-not-allowed'"
        :disabled="!historyStore.canRedo"
        @click="historyStore.redo()"
      >{{ t('editor.history.redo') }}</button>
    </div>

    <ScrollArea class="flex-1">
      <div class="p-2 space-y-0.5">
        <div
          v-for="(action, i) in [...historyStore.past].reverse()"
          :key="i"
          class="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
          :class="i === 0 ? 'bg-accent font-medium' : 'text-muted-foreground'"
        >
          <span>{{ actionIcon(action) }}</span>
          <span>{{ historyStore.describeAction(action) }}</span>
        </div>
        <div v-if="historyStore.past.length === 0" class="text-xs text-muted-foreground italic px-2 py-2">
          {{ t('editor.history.empty') }}
        </div>
      </div>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useHistoryStore, type HistoryAction } from '@/stores/historyStore'
import { ScrollArea } from '@/components/ui/scroll-area'

const { t } = useI18n()
const historyStore = useHistoryStore()

function actionIcon(action: HistoryAction): string {
  switch (action.type) {
    case 'add': return '+'
    case 'remove': return '−'
    case 'move': return '↔'
    case 'rotate': return '↻'
  }
}
</script>
