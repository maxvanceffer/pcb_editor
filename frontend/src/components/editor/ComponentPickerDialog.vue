<template>
  <Dialog :open="open" @update:open="onDialogClose">
    <DialogContent class="sm:max-w-140 flex flex-col gap-0 p-0 h-150 max-h-150">
      <!-- Header -->
      <DialogHeader class="px-4 pt-4 pb-3 border-b shrink-0">
        <DialogTitle>{{ t("editor.elements.pickerTitle") }}</DialogTitle>
        <div class="relative mt-2">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="search"
            :placeholder="t('editor.elements.pickerSearch')"
            class="pl-8"
            @input="onSearchInput"
          />
        </div>
      </DialogHeader>

      <!-- Category tabs -->
      <div class="flex gap-1.5 px-4 py-2 border-b shrink-0 flex-wrap">
        <Badge
          v-for="cat in categories"
          :key="cat"
          :variant="activeCategory === cat ? 'default' : 'outline'"
          class="cursor-pointer select-none capitalize"
          @click="selectCategory(cat)"
        >
          {{ cat }}
        </Badge>
      </div>

      <!-- Component list -->
      <div class="flex-1 min-h-0 overflow-y-auto">
        <div
          v-if="loadingItems"
          class="flex items-center justify-center h-32 text-sm text-muted-foreground"
        >
          {{ t("editor.elements.loading") }}
        </div>
        <div
          v-else-if="items.length === 0"
          class="flex items-center justify-center h-32 text-sm text-muted-foreground"
        >
          {{ t("editor.elements.pickerEmpty") }}
        </div>
        <div v-else class="p-2 space-y-0.5">
          <div
            v-for="def in items"
            :key="def.id"
            class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
            @click="toggleStaged(def)"
          >
            <img
              v-if="getComponentImage(def.id)"
              :src="getComponentImage(def.id)!"
              class="w-8 h-8 rounded-sm shrink-0 object-cover"
              :alt="def.name"
            />
            <div v-else class="w-8 h-8 rounded-sm shrink-0" :style="{ background: def.color }" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">
                {{ def.name }}
              </p>
              <p class="text-xs text-muted-foreground truncate">
                {{ def.description }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-xs text-muted-foreground"
                >{{ def.widthInHoles }}×{{ def.heightInHoles }}</span
              >
              <div
                class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                :class="
                  staged.has(def.id) ? 'bg-primary border-primary' : 'border-muted-foreground'
                "
              >
                <Check v-if="staged.has(def.id)" class="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
          </div>

          <!-- Load more -->
          <div v-if="hasMore" class="pt-1 pb-1 flex justify-center">
            <button
              class="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              :disabled="loadingMore"
              @click="loadMore"
            >
              {{ loadingMore ? t("editor.elements.loading") : t("editor.elements.loadMore") }}
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-4 py-3 border-t shrink-0 flex items-center justify-between gap-3">
        <span class="text-xs text-muted-foreground">
          {{
            t("editor.elements.showing", {
              shown: items.length,
              total,
            })
          }}
        </span>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="cancel">
            {{ t("editor.elements.pickerCancel") }}
          </Button>
          <Button size="sm" @click="confirm">
            {{ t("editor.elements.pickerAdd") }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { Search, Check } from "lucide-vue-next";
import type { ComponentDefinition } from "@/lib/components/types";
import { getComponentImage } from "@/lib/components/componentImages";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api from "@/lib/api";

const PAGE_SIZE = 10;

const props = defineProps<{
  open: boolean;
  projectIds: string[];
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  add: [def: ComponentDefinition];
  remove: [id: string];
}>();

const { t } = useI18n();

const categories = ref<string[]>([]);
const activeCategory = ref("");
const search = ref("");
const searchDebounce = ref<ReturnType<typeof setTimeout> | null>(null);

const items = ref<ComponentDefinition[]>([]);
const total = ref(0);
const loadingItems = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);

// Staged selection — local copy, not committed until "Add" is clicked
const staged = ref<Set<string>>(new Set());
// Cache fetched definitions to emit on confirm
const defsById = ref<Map<string, ComponentDefinition>>(new Map());

// Per-session page cache: key = `${category}||${search}` → { items, total }
const pageCache = ref<Map<string, { items: ComponentDefinition[]; total: number }>>(new Map());

function cacheKey() {
  return `${activeCategory.value}||${search.value.trim()}`;
}

function initStaged() {
  staged.value = new Set(props.projectIds);
}

async function fetchCategories() {
  const { data } = await api.get("/api/components/categories");
  categories.value = data.categories as string[];
  if (categories.value.length && !activeCategory.value) {
    activeCategory.value = categories.value[0]!;
  }
}

async function fetchPage(offset: number, append = false) {
  const key = cacheKey();

  // Cache hit: use stored data (only for fresh loads, not "load more")
  if (!append && pageCache.value.has(key)) {
    const cached = pageCache.value.get(key)!;
    items.value = cached.items;
    total.value = cached.total;
    hasMore.value = cached.items.length < cached.total;
    return;
  }

  if (append) loadingMore.value = true;
  else loadingItems.value = true;

  try {
    const params: Record<string, string | number> = {
      limit: PAGE_SIZE,
      offset,
    };
    if (activeCategory.value) params.category = activeCategory.value;
    if (search.value.trim()) params.search = search.value.trim();

    const { data } = await api.get("/api/components", { params });
    const fetched = data.components as ComponentDefinition[];
    total.value = data.total as number;

    // Keep a local cache so we can emit full definitions on confirm
    for (const def of fetched) defsById.value.set(def.id, def);

    const allItems = append ? [...items.value, ...fetched] : fetched;
    items.value = allItems;
    hasMore.value = allItems.length < total.value;

    // Store in page cache
    pageCache.value.set(key, { items: allItems, total: total.value });
  } finally {
    loadingItems.value = false;
    loadingMore.value = false;
  }
}

async function loadMore() {
  await fetchPage(items.value.length, true);
}

function selectCategory(cat: string) {
  activeCategory.value = cat;
  fetchPage(0);
}

function onSearchInput() {
  if (searchDebounce.value) clearTimeout(searchDebounce.value);
  searchDebounce.value = setTimeout(() => fetchPage(0), 300);
}

function toggleStaged(def: ComponentDefinition) {
  const next = new Set(staged.value);
  if (next.has(def.id)) next.delete(def.id);
  else next.add(def.id);
  staged.value = next;
}

function confirm() {
  const prev = new Set(props.projectIds);

  // Emit adds for newly staged items
  for (const id of staged.value) {
    if (!prev.has(id)) {
      const def = defsById.value.get(id);
      if (def) emit("add", def);
    }
  }

  // Emit removes for unstaged items that were previously in project
  for (const id of prev) {
    if (!staged.value.has(id)) {
      emit("remove", id);
    }
  }

  emit("update:open", false);
}

function cancel() {
  emit("update:open", false);
}

function onDialogClose(val: boolean) {
  if (!val) cancel();
}

onMounted(async () => {
  await fetchCategories();
  await fetchPage(0);
});

watch(
  () => props.open,
  (val) => {
    if (val) {
      search.value = "";
      pageCache.value = new Map(); // reset cache on each open
      initStaged();
      fetchPage(0);
    }
  },
);
</script>
