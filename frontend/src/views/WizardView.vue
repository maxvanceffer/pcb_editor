<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4">
    <Card class="w-[540px]">
      <CardHeader>
        <div class="flex items-center gap-2 mb-1">
          <RouterLink to="/" class="text-muted-foreground hover:text-foreground text-sm">← {{ t('wizard.back') }}</RouterLink>
        </div>
        <CardTitle>{{ t('wizard.title') }}</CardTitle>
        <CardDescription>{{ t('wizard.step', { current: step, total: totalSteps }) }}</CardDescription>
        <Progress :model-value="(step / totalSteps) * 100" class="mt-3" />
      </CardHeader>

      <CardContent>
        <Transition name="slide" mode="out-in">
          <Step1ProjectName
            v-if="step === 1"
            :name="name"
            :description="description"
            @update:name="name = $event"
            @update:description="description = $event"
          />
          <Step2BoardConfig
            v-else-if="step === 2"
            :config="boardConfig"
            @update:config="boardConfig = $event"
          />
        </Transition>
      </CardContent>

      <CardFooter class="flex justify-between">
        <Button variant="outline" :disabled="step === 1" @click="step--">{{ t('wizard.back') }}</Button>
        <div class="flex gap-2">
          <Button v-if="step < totalSteps" :disabled="!canNext" @click="step++">
            {{ t('wizard.next') }}
          </Button>
          <Button v-else :disabled="loading || !canNext" @click="create">
            {{ loading ? t('wizard.creating') : t('wizard.create') }}
          </Button>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProjectStore } from '@/stores/projectStore'
import type { BoardConfig } from '@/lib/components/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Step1ProjectName from '@/components/wizard/Step1ProjectName.vue'
import Step2BoardConfig from '@/components/wizard/Step2BoardConfig.vue'

const { t } = useI18n()
const router = useRouter()
const projectStore = useProjectStore()

const step = ref(1)
const totalSteps = 2

const name = ref('')
const description = ref('')
const boardConfig = ref<BoardConfig>({
  widthMm: 100,
  heightMm: 100,
  holePitchMm: 2.54,
  boardType: 'perfboard',
})
const loading = ref(false)

const canNext = computed(() => {
  if (step.value === 1) return name.value.trim().length > 0
  return true
})

async function create() {
  loading.value = true
  try {
    const id = await projectStore.createProject(name.value.trim(), description.value, boardConfig.value)
    router.push(`/editor/${id}`)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
