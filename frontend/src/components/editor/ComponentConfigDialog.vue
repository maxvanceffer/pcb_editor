<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>{{ comp?.type }}</DialogTitle>
        <DialogDescription>{{ t("editor.pins.configDescription") }}</DialogDescription>
      </DialogHeader>

      <form v-if="comp" @submit.prevent="handleSave">
        <FieldGroup>
          <!-- Description -->
          <Field>
            <FieldLabel>{{ t("editor.pins.description") }}</FieldLabel>
            <FieldContent>
              <Input
                v-model="description"
                :placeholder="t('editor.pins.descriptionPlaceholder')"
              />
              <FieldError :errors="descErrors.map((m) => ({ message: m }))" />
            </FieldContent>
          </Field>

          <!-- Color -->
          <Field>
            <FieldLabel>{{ t("editor.pins.color") }}</FieldLabel>
            <FieldContent>
              <ColorPicker v-model="color" />
            </FieldContent>
          </Field>

          <!-- Pin Labels -->
          <FieldSet v-if="pins.length">
            <FieldLegend variant="label">{{ t("editor.pins.section") }}</FieldLegend>

            <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              <div v-for="pin in pins" :key="pin.id" class="flex items-center gap-2">
                <!-- Pin built-in label -->
                <span class="font-mono text-xs text-muted-foreground w-8">
                  {{ pin.label }}
                </span>

                <!-- Hardware function badges -->
                <div v-if="pin.functions?.length" class="flex flex-wrap gap-0.5">
                  <span
                    v-for="fn in pin.functions"
                    :key="fn"
                    class="text-[9px] leading-tight px-1 py-0.5 rounded font-mono"
                    :class="fnBadgeClass(fn)"
                    >{{ fn }}</span
                  >
                </div>

                <!-- Select for editable pins -->
                <Select
                  v-if="comp.pinLabelsEditable"
                  :model-value="pinValues[pin.id] || ''"
                  @update:model-value="(v) => (pinValues[pin.id] = v)"
                >
                  <SelectTrigger class="h-8 text-xs flex-1">
                    <SelectValue :placeholder="t('editor.pins.notSet')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="p in SIGNAL_PRESETS" :key="p" :value="p">
                      {{ p }}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <!-- Read-only -->
                <span v-else class="flex-1 text-xs text-muted-foreground italic">
                  {{ pin.label }}
                </span>
              </div>
            </div>

            <p v-if="!comp.pinLabelsEditable" class="text-xs text-muted-foreground">
              {{ t("editor.pins.fixedPins") }}
            </p>
          </FieldSet>
        </FieldGroup>

        <!-- Power conflict warnings -->
        <div
          v-if="conflicts.length"
          class="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2"
        >
          <p class="text-xs font-medium text-destructive mb-1">
            {{ t("editor.pins.conflicts") }}
          </p>
          <div v-for="c in conflicts" :key="c" class="text-xs text-destructive">
            {{ c }}
          </div>
        </div>

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
import { computed, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useForm, useField } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";
import { useEditorStore } from "@/stores/editorStore";
import ColorPicker from "@/components/editor/ColorPicker.vue";
import { useProjectStore } from "@/stores/projectStore";
import { WireTrace } from "@/lib/components/WireTrace";
import type { Pin, GridPosition } from "@/lib/components/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ComponentLike {
  id: string;
  type: string;
  pinLabelsEditable: boolean;
  getAbsolutePinPositions(): Array<Pin & GridPosition>;
}

const props = defineProps<{
  open: boolean;
  comp: ComponentLike | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const { t } = useI18n();
const editorStore = useEditorStore();
const projectStore = useProjectStore();

const SIGNAL_PRESETS = editorStore.SIGNAL_PRESETS;

const formSchema = toTypedSchema(
  z.object({
    description: z.string().max(200, t("editor.pins.descriptionTooLong")).optional().default(""),
    color: z.string().nullable().default(null),
  }),
);

const { handleSubmit, resetForm } = useForm({
  validationSchema: formSchema,
});

const { value: description, errors: descErrors } = useField<string>("description");
const { value: color } = useField<string | null>("color");

// Pin label values are stored separately from vee-validate to avoid
// issues with schema-stripping unknown fields during handleSubmit.
const pinValues = reactive<Record<string, string>>({});

watch(
  () => [props.open, props.comp?.id] as const,
  ([open]) => {
    if (!open || !props.comp) return;
    resetForm({
      values: {
        description: editorStore.getComponentDescription(props.comp.id),
        color: editorStore.getComponentColor(props.comp.id),
      },
    });
    for (const key of Object.keys(pinValues)) delete pinValues[key];
    for (const pin of props.comp.getAbsolutePinPositions()) {
      pinValues[pin.id] = editorStore.getPinLabel(props.comp.id, pin.id);
    }
  },
  { immediate: true },
);

const pins = computed(() => props.comp?.getAbsolutePinPositions() ?? []);

const POWER_POSITIVE = new Set(["VCC", "5V", "3V3", "PWR"]);
const POWER_NEGATIVE = new Set(["GND"]);

const conflicts = computed(() => {
  if (!props.comp) return [];
  const result: string[] = [];
  for (const wire of projectStore.wires) {
    if (!(wire instanceof WireTrace)) continue;
    const startPin = findPinAtPos(wire.startPosition.x, wire.startPosition.y);
    const endPin = findPinAtPos(wire.endPosition.x, wire.endPosition.y);
    if (!startPin || !endPin) continue;
    const startLabel = (
      editorStore.getPinLabel(startPin.compId, startPin.pinId) || startPin.builtinLabel
    ).toUpperCase();
    const endLabel = (
      editorStore.getPinLabel(endPin.compId, endPin.pinId) || endPin.builtinLabel
    ).toUpperCase();
    if (
      (POWER_NEGATIVE.has(startLabel) && POWER_POSITIVE.has(endLabel)) ||
      (POWER_POSITIVE.has(startLabel) && POWER_NEGATIVE.has(endLabel))
    ) {
      result.push(
        `${describeComp(startPin.compId)} · ${startLabel} → ${describeComp(endPin.compId)} · ${endLabel}`,
      );
    }
  }
  return result;
});

function describeComp(compId: string): string {
  const comp = projectStore.placedComponents.find((c) => c.id === compId);
  if (!comp) return compId.slice(0, 8) + "…";
  const desc = editorStore.getComponentDescription(compId);
  return desc ? `${comp.name} (${desc})` : comp.name;
}

function findPinAtPos(x: number, y: number) {
  for (const comp of projectStore.placedComponents) {
    for (const pin of comp.getAbsolutePinPositions()) {
      if (pin.x === x && pin.y === y) {
        return {
          compId: comp.id,
          pinId: pin.id,
          builtinLabel: pin.label,
        };
      }
    }
  }
  return null;
}

function fnBadgeClass(fn: string): string {
  if (fn === "SDA" || fn === "SCL") return "bg-blue-500/20 text-blue-400";
  if (fn === "UART0" || fn === "TX" || fn === "RX") return "bg-green-500/20 text-green-400";
  if (fn.startsWith("ADC")) return "bg-orange-500/20 text-orange-400";
  if (fn === "TOUCH") return "bg-purple-500/20 text-purple-400";
  if (fn === "JTAG") return "bg-yellow-500/20 text-yellow-500";
  if (fn === "BOOT" || fn === "STRAP") return "bg-red-500/20 text-red-400";
  if (fn === "RGB LED") return "bg-pink-500/20 text-pink-400";
  if (fn.startsWith("USB")) return "bg-cyan-500/20 text-cyan-400";
  return "bg-muted text-muted-foreground";
}

const handleSave = handleSubmit((formValues) => {
  if (!props.comp) return;
  const id = props.comp.id;

  editorStore.setComponentDescription(id, formValues.description ?? "", true);
  editorStore.setComponentColor(id, formValues.color ?? null);

  if (props.comp.pinLabelsEditable) {
    for (const pin of props.comp.getAbsolutePinPositions()) {
      editorStore.setPinLabel(id, pin.id, pinValues[pin.id] ?? "");
    }
  }

  projectStore.saveProject();
  emit("update:open", false);
});

function onOpenChange(val: boolean) {
  emit("update:open", val);
}
</script>
