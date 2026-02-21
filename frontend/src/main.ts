import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import router from './router'
import './style.css'
import App from './App.vue'
import ru from './locales/ru.json'
import en from './locales/en.json'

const savedLocale = localStorage.getItem('locale') ?? 'ru'

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
  fallbackLocale: 'ru',
  messages: { ru, en },
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')
