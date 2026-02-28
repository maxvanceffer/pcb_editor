<template>
  <div class="flex items-center gap-2">
    <button
      v-for="color in props.colors"
      :key="color"
      type="button"
      class="size-5 rounded-full ring-offset-background transition-all focus:outline-none cursor-pointer"
      :style="{ backgroundColor: color }"
      :class="
        model === color
          ? 'ring-2 ring-offset-1 ring-foreground'
          : 'ring-1 ring-border/50 hover:ring-border'
      "
      @click="model = color"
    />
    <button
      type="button"
      class="w-5 h-5 rounded-full border border-dashed border-muted-foreground flex items-center justify-center ring-offset-background transition-all focus:outline-none"
      :class="!model ? 'ring-2 ring-offset-1 ring-foreground' : 'hover:ring-1 hover:ring-border'"
      :title="t('editor.pins.colorDefault')"
      @click="model = null"
    >
      <X class="w-2.5 h-2.5 text-muted-foreground" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { X } from "lucide-vue-next";
import { useI18n } from "vue-i18n";

const props = withDefaults(
  defineProps<{
    colors?: string[];
  }>(),
  {
    colors: () => [
      "#A8D8C8",
      "#A8C4E8",
      "#D4A8E8",
      "#E8A8C4",
      "#E8D4A8",
      "#C00707",
      "#134E8E",
      "#280905",
      "#FFEF5F",
      "#FFF8DE",
    ],
  },
);

const model = defineModel<string | null>({ default: null });

const { t } = useI18n();
</script>
