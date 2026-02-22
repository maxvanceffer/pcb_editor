import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useColorMode } from '@vueuse/core'
import api from '@/lib/api'
import { i18n } from '@/main'

export type TooltipPosition = 'component' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'off'

export interface UserSettings {
  theme?: 'light' | 'dark' | 'auto'
  locale?: 'ru' | 'en'
  tooltipPosition?: TooltipPosition
  [key: string]: unknown
}

const colorMode = useColorMode({ attribute: 'class', selector: 'html' })

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings>({})
  const loaded = ref(false)

  async function load() {
    const { data } = await api.get<UserSettings>('/api/settings')
    settings.value = data
    loaded.value = true
    if (data.locale) {
      applyLocale(data.locale)
    }
    if (data.theme) {
      applyTheme(data.theme)
    }
  }

  async function patch(updates: Partial<UserSettings>) {
    const { data } = await api.patch<UserSettings>('/api/settings', updates)
    settings.value = data
    if (updates.locale) {
      applyLocale(updates.locale)
    }
    if (updates.theme) {
      applyTheme(updates.theme)
    }
  }

  function applyLocale(locale: string) {
    i18n.global.locale.value = locale as 'ru' | 'en'
    localStorage.setItem('locale', locale)
  }

  function applyTheme(theme: 'light' | 'dark' | 'auto') {
    colorMode.value = theme === 'auto' ? 'auto' : theme
  }

  return { settings, loaded, load, patch }
})
