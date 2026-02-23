import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import router from './router'
import './style.css'
import App from './App.vue'
import ru from './locales/ru.json'
import en from './locales/en.json'
import { useAppUpdate } from '@/lib/useAppUpdate'

window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event.reason?.message ?? event.reason ?? '')
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  ) {
    useAppUpdate().markUpdateAvailable()
  }
})

const SUPPORTED_LOCALES = ['ru', 'en'] as const
type SupportedLocale = typeof SUPPORTED_LOCALES[number]

function detectLocale(): SupportedLocale {
  const saved = localStorage.getItem('locale')
  if (saved && SUPPORTED_LOCALES.includes(saved as SupportedLocale)) {
    return saved as SupportedLocale
  }
  // Detect from browser: try full tag first (e.g. "ru-RU"), then base language (e.g. "ru")
  for (const lang of navigator.languages ?? [navigator.language]) {
    const base = lang.split('-')[0].toLowerCase() as SupportedLocale
    if (SUPPORTED_LOCALES.includes(base)) return base
  }
  return 'en'
}

const savedLocale = detectLocale()

// Применяем тему до монтирования приложения чтобы избежать мигания
const savedTheme = localStorage.getItem('theme') ?? 'auto'
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark')
} else if (savedTheme === 'light') {
  document.documentElement.classList.remove('dark')
}

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { ru, en },
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)

app.config.errorHandler = (err) => {
  const msg = String((err as Error)?.message ?? err ?? '')
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Unable to preload CSS') ||
    msg.includes('ChunkLoadError')
  ) {
    useAppUpdate().markUpdateAvailable()
  }
}

app.mount('#app')
