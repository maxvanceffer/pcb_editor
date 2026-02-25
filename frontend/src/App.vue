<template>
  <div>
    <Transition name="slide-up">
      <div
        v-if="updateAvailable && !isDev"
        class="fixed bottom-4 left-4 z-50 flex items-start gap-3 px-4 py-3 rounded-lg bg-secondary text-secondary-foreground text-sm shadow-lg max-w-xs"
      >
        <RefreshCcw class="h-4 w-4 shrink-0 mt-0.5" />
        <div class="flex flex-col gap-2">
          <p class="font-medium leading-snug">{{ $t('update.banner') }}</p>
          <button
            class="self-start rounded bg-primary text-primary-foreground px-3 py-1 text-xs font-medium hover:opacity-90 transition-opacity"
            @click="reload()"
          >
            {{ $t('update.reloadBtn') }}
          </button>
        </div>
      </div>
    </Transition>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RefreshCcw } from 'lucide-vue-next'
import { useAppUpdate } from '@/lib/useAppUpdate'

const { updateAvailable, reload } = useAppUpdate()
const isDev = import.meta.env.DEV
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(1rem);
  opacity: 0;
}
</style>
