<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b px-6 py-4 flex items-center justify-between">
      <LogoIcon :size="24" class="text-foreground" />
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button class="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent transition-colors outline-none">
            <Avatar class="h-7 w-7">
              <AvatarImage :src="auth.user?.avatarUrl ?? ''" alt="" />
              <AvatarFallback class="text-xs">{{ userInitials }}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="min-w-56 rounded-lg" side="bottom" align="end" :side-offset="4">
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="h-8 w-8">
                <AvatarImage :src="auth.user?.avatarUrl ?? ''" alt="" />
                <AvatarFallback class="text-xs">{{ userInitials }}</AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">{{ auth.user?.fullName || auth.user?.email }}</span>
                <span class="truncate text-xs text-muted-foreground">{{ auth.user?.email }}</span>
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
          <DropdownMenuItem class="cursor-pointer" @click="logout">
            <LogOut class="size-4" />
            {{ t('editor.logout') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>

    <main class="max-w-4xl mx-auto px-6 py-8">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">{{ t('home.myProjects') }}</h2>
        <Button @click="router.push('/wizard')">{{ t('home.newProject') }}</Button>
      </div>

      <div v-if="loading" class="text-muted-foreground">{{ t('home.loading') }}</div>

      <div v-else-if="projects.length === 0" class="text-center py-16">
        <p class="text-muted-foreground text-lg mb-4">{{ t('home.empty') }}</p>
        <Button @click="router.push('/wizard')">{{ t('home.createFirst') }}</Button>
      </div>

      <div v-else class="grid gap-4">
        <Card
          v-for="project in projects"
          :key="project.id"
          class="cursor-pointer hover:shadow-md transition-shadow"
          @click="openProject(project.id)"
        >
          <CardHeader class="pb-2">
            <CardTitle>{{ project.name }}</CardTitle>
            <CardDescription v-if="project.description">{{ project.description }}</CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-xs text-muted-foreground">
              {{ t('home.modified', { date: formatDate(project.updatedAt) }) }}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>

    <AccountDialog v-model:open="accountDialogOpen" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { LogOut, Languages, UserRound, Sun, Moon, MonitorCheck } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import api from '@/lib/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import AccountDialog from '@/components/AccountDialog.vue'
import LogoIcon from '@/components/LogoIcon.vue'
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

interface Project {
  id: number
  name: string
  description: string | null
  updatedAt: string
}

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const settingsStore = useSettingsStore()

const accountDialogOpen = ref(false)

async function setLocale(lang: 'ru' | 'en') {
  await settingsStore.patch({ locale: lang })
}

async function setTheme(theme: 'light' | 'dark' | 'auto') {
  await settingsStore.patch({ theme })
}

const userInitials = computed(() => {
  const name = auth.user?.fullName || auth.user?.email || ''
  return name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
})

const projects = ref<Project[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get('/api/projects')
    projects.value = data.projects
  } finally {
    loading.value = false
  }
})

function openProject(id: number) {
  router.push(`/editor/${id}`)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>
