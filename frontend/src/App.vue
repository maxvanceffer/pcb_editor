<template>
  <div>
    <Transition name="slide-up">
      <div
        v-if="updateAvailable"
        class="fixed bottom-4 left-4 z-50 flex items-start gap-3 px-4 py-3 rounded-lg bg-secondary text-secondary-foreground text-sm shadow-lg max-w-xs"
      >
        <span class="text-base leading-none mt-0.5">🔄</span>
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
import { useAppUpdate } from '@/lib/useAppUpdate'
const { updateAvailable, reload } = useAppUpdate()
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
