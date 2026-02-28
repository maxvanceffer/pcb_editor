<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent class="max-w-xs">
      <DialogHeader>
        <DialogTitle>{{ t("editor.board.configure") }}</DialogTitle>
        <DialogDescription>{{ t("editor.wire.configDescription") }}</DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSave">
        <FieldGroup>
          <Field>
            <FieldLabel>{{ t("editor.pins.color") }}</FieldLabel>
            <FieldContent>
              <ColorPicker v-model="selectedColor" />
            </FieldContent>
          </Field>
        </FieldGroup>

        <DialogFooter class="mt-4">
          <Button type="button" variant="outline" @click="onOpenChange(false)">
            {{ t("editor.pins.cancel") }}
          </Button>
          <Button type="submit">
            {{ t("editor.pins.save") }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useProjectStore } from "@/stores/projectStore";
import { WireTrace } from "@/lib/components/WireTrace";
import type { WireColor } from "@/lib/components/types";
import ColorPicker from "@/components/editor/ColorPicker.vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const DEFAULT_WIRE_COLOR: WireColor = "#ff0000";

const props = defineProps<{
  open: boolean;
  wire: WireTrace | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const { t } = useI18n();
const projectStore = useProjectStore();

const selectedColor = ref<string | null>(null);

watch(
  () => [props.open, props.wire?.id] as const,
  ([open]) => {
    if (!open || !props.wire) return;
    selectedColor.value = props.wire.color;
  },
  { immediate: true },
);

function handleSave() {
  if (!props.wire) return;
  props.wire.color = (selectedColor.value ?? DEFAULT_WIRE_COLOR) as WireColor;
  projectStore.notifyElementChanged();
  projectStore.saveProject();
  emit("update:open", false);
}

function onOpenChange(val: boolean) {
  emit("update:open", val);
}
</script>
