<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('editor.settings.title') }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-6 py-2">
        <!-- Group: Tooltip -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <MessageSquare class="h-4 w-4 text-muted-foreground" />
            <h3 class="text-sm font-semibold">{{ t('editor.settings.groupTooltip') }}</h3>
          </div>
          <Separator />

          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground">{{ t('editor.settings.tooltipPosition') }}</Label>
            <RadioGroup
              :model-value="currentTooltipPosition"
              class="grid grid-cols-2 gap-2"
              @update:model-value="setTooltipPosition"
            >
              <label
                v-for="opt in tooltipOptions"
                :key="opt.value"
                class="flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors"
                :class="currentTooltipPosition === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent'"
              >
                <RadioGroupItem :value="opt.value" class="shrink-0" />
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span class="text-sm leading-tight">{{ opt.label }}</span>
                  <span class="text-[10px] text-muted-foreground leading-tight">{{ opt.hint }}</span>
                </div>
              </label>
            </RadioGroup>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageSquare } from 'lucide-vue-next'
import { useSettingsStore, type TooltipPosition } from '@/stores/settingsStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

defineProps<{ open: boolean }>()
defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useI18n()
const settingsStore = useSettingsStore()

const currentTooltipPosition = computed<TooltipPosition>(
  () => (settingsStore.settings.tooltipPosition as TooltipPosition) ?? 'component',
)

interface TooltipOption {
  value: TooltipPosition
  label: string
  hint: string
}

const tooltipOptions = computed<TooltipOption[]>(() => [
  { value: 'off',          label: t('editor.settings.tooltipOff'),         hint: '' },
  { value: 'component',    label: t('editor.settings.tooltipComponent'),   hint: '' },
  { value: 'top-left',     label: t('editor.settings.tooltipTopLeft'),     hint: '' },
  { value: 'top-right',    label: t('editor.settings.tooltipTopRight'),    hint: '' },
  { value: 'bottom-left',  label: t('editor.settings.tooltipBottomLeft'),  hint: '' },
  { value: 'bottom-right', label: t('editor.settings.tooltipBottomRight'), hint: '' },
])

async function setTooltipPosition(value: string | undefined) {
  if (!value) return
  await settingsStore.patch({ tooltipPosition: value as TooltipPosition })
}
</script>
