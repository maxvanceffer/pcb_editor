<template>
    <Dialog :open="open" @update:open="onOpenChange">
        <DialogContent class="max-w-sm">
            <DialogHeader>
                <DialogTitle>{{ comp?.type }}</DialogTitle>
                <DialogDescription>{{
                    t("editor.pins.configDescription")
                }}</DialogDescription>
            </DialogHeader>

            <form v-if="comp" class="space-y-4">
                <!-- Description -->
                <FormField v-slot="{ componentField }" name="description">
                    <FormItem>
                        <FormLabel>{{
                            t("editor.pins.description")
                        }}</FormLabel>
                        <FormControl>
                            <Input
                                v-bind="componentField"
                                :placeholder="
                                    t('editor.pins.descriptionPlaceholder')
                                "
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                </FormField>

                <!-- Color -->
                <div class="space-y-1.5">
                    <Label>{{ t("editor.pins.color") }}</Label>
                    <div class="flex items-center gap-2">
                        <button
                            v-for="color in PASTEL_COLORS"
                            :key="color"
                            type="button"
                            class="size-5 rounded-full ring-offset-background transition-all focus:outline-none cursor-pointer"
                            :style="{ backgroundColor: color }"
                            :class="
                                selectedColor === color
                                    ? 'ring-2 ring-offset-1 ring-foreground'
                                    : 'ring-1 ring-border/50 hover:ring-border'
                            "
                            @click="selectedColor = color"
                        />
                        <button
                            type="button"
                            class="w-5 h-5 rounded-full border border-dashed border-muted-foreground flex items-center justify-center ring-offset-background transition-all focus:outline-none"
                            :class="
                                !selectedColor
                                    ? 'ring-2 ring-offset-1 ring-foreground'
                                    : 'hover:ring-1 hover:ring-border'
                            "
                            :title="t('editor.pins.colorDefault')"
                            @click="selectedColor = null"
                        >
                            <X class="w-2.5 h-2.5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                <!-- Pin Labels -->
                <template v-if="pins.length">
                    <div class="space-y-2">
                        <Label>{{ t("editor.pins.section") }}</Label>

                        <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            <div
                                v-for="pin in pins"
                                :key="pin.id"
                                class="flex items-center gap-2"
                            >
                                <!-- Pin built-in label -->
                                <span
                                    class="font-mono text-xs text-muted-foreground w-8 shrink-0 text-right"
                                >
                                    {{ pin.label }}
                                </span>

                                <!-- Hardware function badges -->
                                <div
                                    v-if="pin.functions?.length"
                                    class="flex flex-wrap gap-0.5 shrink-0"
                                >
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
                                    :model-value="
                                        (values[`pin_${pin.id}`] as string) ||
                                        ''
                                    "
                                    @update:model-value="
                                        (v) => setFieldValue(`pin_${pin.id}`, v)
                                    "
                                >
                                    <SelectTrigger class="h-8 text-xs flex-1">
                                        <SelectValue
                                            :placeholder="
                                                t('editor.pins.notSet')
                                            "
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            v-for="p in SIGNAL_PRESETS"
                                            :key="p"
                                            :value="p"
                                        >
                                            {{ p }}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                <!-- Read-only -->
                                <span
                                    v-else
                                    class="flex-1 text-xs text-muted-foreground italic"
                                >
                                    {{ pin.label }}
                                </span>
                            </div>
                        </div>

                        <p
                            v-if="!comp.pinLabelsEditable"
                            class="text-xs text-muted-foreground"
                        >
                            {{ t("editor.pins.fixedPins") }}
                        </p>
                    </div>
                </template>

                <!-- Power conflict warnings -->
                <div
                    v-if="conflicts.length"
                    class="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2"
                >
                    <p class="text-xs font-medium text-destructive mb-1">
                        {{ t("editor.pins.conflicts") }}
                    </p>
                    <div
                        v-for="c in conflicts"
                        :key="c"
                        class="text-xs text-destructive"
                    >
                        {{ c }}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        @click="onOpenChange(false)"
                    >
                        {{ t("editor.pins.cancel") }}
                    </Button>
                    <Button type="submit" @click.prevent="handleSave">
                        {{ t("editor.pins.save") }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";
import { X } from "lucide-vue-next";
import { useEditorStore } from "@/stores/editorStore";
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
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

const PASTEL_COLORS = [
    "#A8D8C8",
    "#A8C4E8",
    "#D4A8E8",
    "#E8A8C4",
    "#E8D4A8",
] as const;
const SIGNAL_PRESETS = editorStore.SIGNAL_PRESETS;

const formSchema = toTypedSchema(
    z.object({
        description: z
            .string()
            .max(200, t("editor.pins.descriptionTooLong"))
            .optional()
            .default(""),
    }),
);

const { handleSubmit, resetForm, values, setFieldValue } = useForm({
    validationSchema: formSchema,
});

const selectedColor = ref<string | null>(null);

watch(
    () => [props.open, props.comp?.id] as const,
    ([open]) => {
        if (!open || !props.comp) return;
        const initial: Record<string, string> = {
            description: editorStore.getComponentDescription(props.comp.id),
        };
        for (const pin of props.comp.getAbsolutePinPositions()) {
            initial[`pin_${pin.id}`] = editorStore.getPinLabel(
                props.comp.id,
                pin.id,
            );
        }
        resetForm({ values: initial });
        selectedColor.value = editorStore.getComponentColor(props.comp.id);
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
        const startPin = findPinAtPos(
            wire.startPosition.x,
            wire.startPosition.y,
        );
        const endPin = findPinAtPos(wire.endPosition.x, wire.endPosition.y);
        if (!startPin || !endPin) continue;
        const startLabel = (
            editorStore.getPinLabel(startPin.compId, startPin.pinId) ||
            startPin.builtinLabel
        ).toUpperCase();
        const endLabel = (
            editorStore.getPinLabel(endPin.compId, endPin.pinId) ||
            endPin.builtinLabel
        ).toUpperCase();
        if (
            (POWER_NEGATIVE.has(startLabel) && POWER_POSITIVE.has(endLabel)) ||
            (POWER_POSITIVE.has(startLabel) && POWER_NEGATIVE.has(endLabel))
        ) {
            result.push(
                `${startPin.compId.slice(0, 6)}… ${startLabel} → ${endPin.compId.slice(0, 6)}… ${endLabel}`,
            );
        }
    }
    return result;
});

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
    if (fn === "UART0" || fn === "TX" || fn === "RX")
        return "bg-green-500/20 text-green-400";
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
    editorStore.setComponentColor(id, selectedColor.value);

    if (props.comp.pinLabelsEditable) {
        for (const pin of props.comp.getAbsolutePinPositions()) {
            const label = (values[`pin_${pin.id}`] as string | undefined) ?? "";
            editorStore.setPinLabel(id, pin.id, label);
        }
    }

    projectStore.saveProject();
    emit("update:open", false);
});

function onOpenChange(val: boolean) {
    emit("update:open", val);
}
</script>
