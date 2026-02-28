<template>
  <div class="h-screen flex flex-col overflow-hidden bg-background" @keydown="onKeyDown" tabindex="0" @mousedown="($event.currentTarget as HTMLElement).focus()">
    <!-- Top Bar -->
    <header class="h-12 border-b flex items-center px-4 gap-4 shrink-0">
      <RouterLink to="/" class="text-muted-foreground hover:text-foreground text-sm shrink-0 flex items-center gap-2">
        <LogoIcon :size="20" class="text-foreground" />
      </RouterLink>
      <Separator orientation="vertical" class="h-5" />
      <span class="font-semibold text-sm truncate flex-1">{{ projectStore.projectName }}</span>
      <div class="flex items-center gap-2 shrink-0">
        <span v-if="saving" class="text-xs text-muted-foreground">{{ t('editor.saving') }}</span>
        <span v-else-if="projectStore.isDirty" class="text-xs text-amber-400">{{ t('editor.unsaved') }}</span>
        <span v-else-if="savedAt" class="text-xs text-muted-foreground">{{ t('editor.saved', { time: savedAt }) }}</span>
        <button
          class="text-xs border rounded px-3 py-1.5 hover:bg-accent transition-colors"
          @click="save"
        >{{ t('editor.save') }}</button>
        <button
          class="flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          :title="t('editor.settings.title')"
          @click="settingsDialogOpen = true"
        >
          <Settings class="h-4 w-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button class="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent transition-colors outline-none">
              <Avatar class="h-7 w-7">
                <AvatarImage :src="authStore.user?.avatarUrl ?? ''" alt="" />
                <AvatarFallback class="text-xs">{{ userInitials }}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="min-w-56 rounded-lg" side="bottom" align="end" :side-offset="4">
            <DropdownMenuLabel class="p-0 font-normal">
              <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar class="h-8 w-8">
                  <AvatarImage :src="authStore.user?.avatarUrl ?? ''" alt="" />
                  <AvatarFallback class="text-xs">{{ userInitials }}</AvatarFallback>
                </Avatar>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-semibold">{{ authStore.user?.fullName || authStore.user?.email }}</span>
                  <span class="truncate text-xs text-muted-foreground">{{ authStore.user?.email }}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger class="cursor-pointer">
                <Languages class="size-4" />
                {{ t('editor.language') }}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem class="cursor-pointer" :class="locale === 'ru' ? 'font-medium' : ''" @click="setLocale('ru')">
                  <span class="text-sm">🇷🇺</span>
                  {{ t('editor.langRu') }}
                </DropdownMenuItem>
                <DropdownMenuItem class="cursor-pointer" :class="locale === 'en' ? 'font-medium' : ''" @click="setLocale('en')">
                  <span class="text-sm">🇬🇧</span>
                  {{ t('editor.langEn') }}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger class="cursor-pointer">
                <Sun class="size-4" />
                {{ t('editor.theme') }}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem class="cursor-pointer" :class="settingsStore.settings.theme === 'light' ? 'font-medium' : ''" @click="setTheme('light')">
                  <Sun class="size-4" />
                  {{ t('editor.themeLight') }}
                </DropdownMenuItem>
                <DropdownMenuItem class="cursor-pointer" :class="settingsStore.settings.theme === 'dark' ? 'font-medium' : ''" @click="setTheme('dark')">
                  <Moon class="size-4" />
                  {{ t('editor.themeDark') }}
                </DropdownMenuItem>
                <DropdownMenuItem class="cursor-pointer" :class="(!settingsStore.settings.theme || settingsStore.settings.theme === 'auto') ? 'font-medium' : ''" @click="setTheme('auto')">
                  <MonitorCheck class="size-4" />
                  {{ t('editor.themeAuto') }}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem class="cursor-pointer" @click="accountDialogOpen = true">
              <UserRound class="size-4" />
              {{ t('account.menuItem') }}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="cursor-pointer" @click="handleLogout">
              <LogOut class="size-4" />
              {{ t('editor.logout') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    <!-- Main area -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Canvas -->
      <div class="flex-1 overflow-hidden relative">
        <template v-if="projectLoaded">
          <PCBBoard ref="pcbBoardRef" />
          <BottomToolbar @open-shortcuts="shortcutsDialogOpen = true" />
        </template>
        <div v-else class="flex items-center justify-center h-full text-muted-foreground">
          {{ t('editor.loading') }}
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="w-64 border-l flex flex-col shrink-0 overflow-hidden">
        <Tabs default-value="elements" class="flex flex-col h-full">
          <TabsList class="w-full rounded-none border-b h-9 shrink-0">
            <TabsTrigger value="elements" class="flex-1 text-xs">{{ t('editor.tabs.elements') }}</TabsTrigger>
            <TabsTrigger value="history" class="flex-1 text-xs">{{ t('editor.tabs.history') }}</TabsTrigger>
          </TabsList>
          <TabsContent value="elements" class="flex-1 overflow-hidden mt-0">
            <ElementsTab />
          </TabsContent>
          <TabsContent value="history" class="flex-1 overflow-hidden mt-0">
            <HistoryTab />
          </TabsContent>
        </Tabs>
      </aside>
    </div>

  <AccountDialog v-model:open="accountDialogOpen" />
  <EditorSettingsDialog v-model:open="settingsDialogOpen" />
  <ShortcutsDialog v-model:open="shortcutsDialogOpen" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, type ComponentPublicInstance } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useTitle } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { LogOut, Languages, UserRound, Sun, Moon, MonitorCheck, Settings } from 'lucide-vue-next'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { BaseComponent } from '@/lib/components/BaseComponent'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PCBBoard from '@/components/board/PCBBoard.vue'
import ElementsTab from '@/components/editor/ElementsTab.vue'
import HistoryTab from '@/components/editor/HistoryTab.vue'
import BottomToolbar from '@/components/editor/BottomToolbar.vue'
import AccountDialog from '@/components/AccountDialog.vue'
import LogoIcon from '@/components/LogoIcon.vue'
import EditorSettingsDialog from '@/components/EditorSettingsDialog.vue'
import ShortcutsDialog from '@/components/editor/ShortcutsDialog.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const editorStore = useEditorStore()
const historyStore = useHistoryStore()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const accountDialogOpen = ref(false)
const settingsDialogOpen = ref(false)
const shortcutsDialogOpen = ref(false)
const pcbBoardRef = ref<ComponentPublicInstance & { cutWireSegment: () => void } | null>(null)

async function setLocale(lang: 'ru' | 'en') {
  await settingsStore.patch({ locale: lang })
}

async function setTheme(theme: 'light' | 'dark' | 'auto') {
  await settingsStore.patch({ theme })
}

const projectLoaded = ref(false)
const saving = ref(false)
const savedAt = ref('')

const pageTitle = computed(() =>
  projectStore.projectName ? `Tracify - ${projectStore.projectName}` : 'Tracify',
)
useTitle(pageTitle)

const userInitials = computed(() => {
  const name = authStore.user?.fullName || authStore.user?.email || ''
  return name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
})

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (projectStore.isDirty) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onBeforeRouteLeave(() => {
  if (projectStore.isDirty) {
    return window.confirm(t('editor.unsavedConfirm'))
  }
})

onMounted(async () => {
  const id = Number(route.params.projectId)
  projectStore.reset()
  historyStore.clear()
  await projectStore.loadProject(id)
  projectLoaded.value = true
  editorStore.zoom = 1
  editorStore.panX = 0
  editorStore.panY = 0
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  editorStore.selectedElementId = null
  editorStore.wireStart = null
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

async function save() {
  saving.value = true
  await projectStore.saveProject()
  saving.value = false
  savedAt.value = new Date().toLocaleTimeString(locale.value === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

function onKeyDown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  if (e.key === '?') {
    shortcutsDialogOpen.value = true
    return
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault()
    editorStore.activeTool = 'select'
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
    e.preventDefault()
    editorStore.activeTool = 'hand'
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
    e.preventDefault()
    editorStore.activeTool = 'wire'
  } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    save()
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    historyStore.undo()
  } else if (
    (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z' ||
    (e.ctrlKey || e.metaKey) && e.key === 'y'
  ) {
    e.preventDefault()
    historyStore.redo()
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    // Priority: segment cut if two points are selected
    if (editorStore.segmentCutPoints.length === 2) {
      pcbBoardRef.value?.cutWireSegment()
      return
    }
    const id = editorStore.selectedElementId
    if (!id) return
    const el = projectStore.getElementById(id)
    if (!el) return
    historyStore.push({ type: 'remove', element: el.serialize() })
    projectStore.removeElement(id)
    editorStore.selectedElementId = null
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
    e.preventDefault()
    const id = editorStore.selectedElementId
    if (!id) return
    const el = projectStore.getElementById(id)
    if (el instanceof BaseComponent) {
      const from = el.rotation
      const to = ((el.rotation + 90) % 360) as 0 | 90 | 180 | 270
      el.rotation = to
      historyStore.push({ type: 'rotate', id, from, to })
      projectStore.notifyElementChanged()
    }
  } else if (e.key === 'Escape') {
    editorStore.segmentCutPoints = []
    editorStore.segmentCutWireId = null
    editorStore.wireStart = null
    editorStore.wirePreviewEnd = null
    editorStore.selectedElementId = null
  }
}
</script>
