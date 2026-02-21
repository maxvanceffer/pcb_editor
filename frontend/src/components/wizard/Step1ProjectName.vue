<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <Label for="project-name">{{ t('wizard.step1.nameLabel') }}</Label>
      <Input
        id="project-name"
        :model-value="name"
        @update:model-value="emit('update:name', String($event))"
        :placeholder="t('wizard.step1.namePlaceholder')"
        autofocus
      />
    </div>
    <div class="space-y-2">
      <Label for="description">
        {{ t('wizard.step1.descLabel') }}
        <span class="text-muted-foreground text-xs ml-1">{{ t('auth.register.optional') }}</span>
      </Label>
      <Textarea
        id="description"
        :model-value="description"
        @update:model-value="emit('update:description', String($event))"
        :placeholder="t('wizard.step1.descPlaceholder')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const { t } = useI18n()
defineProps<{ name: string; description: string }>()
const emit = defineEmits<{
  'update:name': [value: string]
  'update:description': [value: string]
}>()
</script>
