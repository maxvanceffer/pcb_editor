<template>
  <svg :width="size" :height="size" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Tracify">
    <rect x="8" y="8" width="240" height="240" rx="32" stroke="currentColor" stroke-width="16" fill="none"/>
    <rect x="88" y="88" width="80" height="80" stroke="currentColor" stroke-width="14" fill="none"/>
    <circle cx="128" cy="128" r="18" stroke="currentColor" stroke-width="12" fill="none"/>
    <line x1="128" y1="88" x2="128" y2="48" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
    <line x1="128" y1="168" x2="128" y2="208" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
    <line x1="88" y1="128" x2="48" y2="128" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
    <line x1="168" y1="128" x2="208" y2="128" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
    <line x1="88" y1="88" x2="48" y2="48" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
    <line x1="168" y1="88" x2="208" y2="48" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
    <line x1="88" y1="168" x2="48" y2="208" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
    <line x1="168" y1="168" x2="208" y2="208" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
    <circle cx="128" cy="40" r="10" fill="currentColor"/>
    <circle cx="128" cy="216" r="10" fill="currentColor"/>
    <circle cx="40" cy="128" r="10" fill="currentColor"/>
    <circle cx="216" cy="128" r="10" fill="currentColor"/>
    <circle cx="40" cy="40" r="10" fill="currentColor"/>
    <circle cx="216" cy="40" r="10" fill="currentColor"/>
    <circle cx="40" cy="216" r="10" fill="currentColor"/>
    <circle cx="216" cy="216" r="10" fill="currentColor"/>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ size?: number | string }>()
</script>
