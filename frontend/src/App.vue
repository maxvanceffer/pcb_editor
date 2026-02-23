<template>
  <div>
    <Transition name="slide-down">
      <div
        v-if="updateAvailable"
        class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500 text-white text-sm shadow-lg"
      >
        <span>{{ $t('update.banner') }}</span>
        <button
          class="rounded border border-white/40 px-3 py-1 text-xs font-medium hover:bg-white/20 transition-colors"
          @click="reload()"
        >
          {{ $t('update.reloadBtn') }}
        </button>
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
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
