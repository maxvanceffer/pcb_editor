<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <kbd
    data-slot="kbd"
    :class="
      cn(
        'inline-flex items-center justify-center',
        'h-[1.375rem] min-w-[1.375rem] px-1.5',
        'rounded border border-border border-b-2',
        'bg-muted text-muted-foreground',
        'font-mono text-[0.6875rem] font-medium leading-none',
        'select-none',
        props.class,
      )
    "
  >
    <slot />
  </kbd>
</template>
