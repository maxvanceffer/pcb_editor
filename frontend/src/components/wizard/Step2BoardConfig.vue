<template>
  <div class="space-y-5">
    <!-- Переключатель режима -->
    <div class="flex rounded-md border overflow-hidden text-xs">
      <button
        class="flex-1 py-1.5 transition-colors"
        :class="mode === 'mm' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
        @click="mode = 'mm'"
      >{{ t('wizard.step2.mm') }}</button>
      <button
        class="flex-1 py-1.5 transition-colors"
        :class="mode === 'holes' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
        @click="mode = 'holes'"
      >{{ t('wizard.step2.holes') }}</button>
    </div>

    <!-- Ввод в мм -->
    <div v-if="mode === 'mm'" class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label>{{ t('wizard.step2.widthMm') }}</Label>
        <input
          type="number"
          :value="config.widthMm"
          @change="update('widthMm', +($event.target as HTMLInputElement).value)"
          min="10"
          max="500"
          class="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
      </div>
      <div class="space-y-2">
        <Label>{{ t('wizard.step2.heightMm') }}</Label>
        <input
          type="number"
          :value="config.heightMm"
          @change="update('heightMm', +($event.target as HTMLInputElement).value)"
          min="10"
          max="500"
          class="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
      </div>
    </div>

    <!-- Ввод в отверстиях -->
    <div v-else class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label>{{ t('wizard.step2.cols', { last: lastCol }) }}</Label>
        <input
          type="number"
          :value="cols"
          @change="updateCols(+($event.target as HTMLInputElement).value)"
          min="2"
          max="200"
          class="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
      </div>
      <div class="space-y-2">
        <Label>{{ t('wizard.step2.rows', { rows: rows }) }}</Label>
        <input
          type="number"
          :value="rows"
          @change="updateRows(+($event.target as HTMLInputElement).value)"
          min="2"
          max="200"
          class="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
      </div>
    </div>

    <div class="space-y-2">
      <Label>{{ t('wizard.step2.pitch') }}</Label>
      <Select :default-value="String(config.holePitchMm)" @update:model-value="(v) => update('holePitchMm', parseFloat(String(v ?? '2.54')))">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="2.54">{{ t('wizard.step2.pitch254') }}</SelectItem>
          <SelectItem value="2.0">{{ t('wizard.step2.pitch200') }}</SelectItem>
          <SelectItem value="2.5">{{ t('wizard.step2.pitch250') }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <Label>{{ t('wizard.step2.boardType') }}</Label>
      <RadioGroup :default-value="config.boardType" @update:model-value="(v) => update('boardType', (v as 'perfboard' | 'stripboard') ?? 'perfboard')">
        <div class="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
          <RadioGroupItem value="perfboard" id="bt-perf" class="mt-0.5" />
          <div>
            <label for="bt-perf" class="font-medium cursor-pointer">{{ t('wizard.step2.perfboard') }}</label>
            <p class="text-xs text-muted-foreground">{{ t('wizard.step2.perfboardDesc') }}</p>
          </div>
        </div>
        <div class="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
          <RadioGroupItem value="stripboard" id="bt-strip" class="mt-0.5" />
          <div>
            <label for="bt-strip" class="font-medium cursor-pointer">{{ t('wizard.step2.stripboard') }}</label>
            <p class="text-xs text-muted-foreground">{{ t('wizard.step2.stripboardDesc') }}</p>
          </div>
        </div>
      </RadioGroup>
    </div>

    <!-- Preview -->
    <div class="p-3 bg-muted rounded-md text-sm text-muted-foreground">
      <strong class="text-foreground">{{ cols }}×{{ rows }}</strong> {{ t('wizard.step2.holes_count') }}
      (A→{{ lastCol }}, 1→{{ rows }})
      — {{ config.widthMm.toFixed(1) }}×{{ config.heightMm.toFixed(1) }} мм
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BoardConfig } from '@/lib/components/types'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const { t } = useI18n()
const props = defineProps<{ config: BoardConfig }>()
const emit = defineEmits<{ 'update:config': [value: BoardConfig] }>()

const mode = ref<'mm' | 'holes'>('mm')

function update<K extends keyof BoardConfig>(key: K, value: BoardConfig[K]) {
  emit('update:config', { ...props.config, [key]: value })
}

const cols = computed(() => Math.floor(props.config.widthMm / props.config.holePitchMm))
const rows = computed(() => Math.floor(props.config.heightMm / props.config.holePitchMm))

function colLabel(n: number): string {
  if (n < 1) return 'A'
  let label = ''
  let i = n - 1
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label
    i = Math.floor(i / 26) - 1
  }
  return label
}

const lastCol = computed(() => colLabel(cols.value))

function updateCols(n: number) {
  if (!n || n < 2) return
  emit('update:config', { ...props.config, widthMm: +(n * props.config.holePitchMm).toFixed(2) })
}

function updateRows(n: number) {
  if (!n || n < 2) return
  emit('update:config', { ...props.config, heightMm: +(n * props.config.holePitchMm).toFixed(2) })
}
</script>
