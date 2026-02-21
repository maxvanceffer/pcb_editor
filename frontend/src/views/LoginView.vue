<template>
  <div class="min-h-screen flex items-center justify-center bg-background">
    <Card class="w-[400px]">
      <CardHeader>
        <CardTitle class="text-2xl">{{ t('auth.login.title') }}</CardTitle>
        <CardDescription>{{ t('auth.login.subtitle') }}</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="email">{{ t('auth.login.email') }}</Label>
          <Input id="email" v-model="email" type="email" placeholder="you@example.com" />
        </div>
        <div class="space-y-2">
          <Label for="password">{{ t('auth.login.password') }}</Label>
          <Input id="password" v-model="password" type="password" placeholder="••••••••" @keyup.enter="submit" />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      </CardContent>
      <CardFooter class="flex flex-col gap-3">
        <Button class="w-full" :disabled="loading" @click="submit">
          {{ loading ? t('auth.login.submitting') : t('auth.login.submit') }}
        </Button>

        <div class="relative w-full">
          <div class="absolute inset-0 flex items-center">
            <span class="w-full border-t border-border" />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-background px-2 text-muted-foreground">{{ t('auth.login.orContinueWith') }}</span>
          </div>
        </div>

        <div class="flex gap-2 w-full">
          <Button variant="outline" class="flex-1 gap-2" @click="loginWithGoogle">
            <img src="/google.svg" class="h-4 w-4" alt="Google" />
            Google
          </Button>
          <Button variant="outline" class="flex-1 gap-2" @click="loginWithGithub">
            <Github class="h-4 w-4" />
            GitHub
          </Button>
        </div>

        <p v-if="oauthError" class="text-sm text-destructive text-center">{{ oauthError }}</p>

        <p class="text-sm text-muted-foreground text-center">
          {{ t('auth.login.noAccount') }}
          <RouterLink to="/register" class="text-primary hover:underline">{{ t('auth.login.register') }}</RouterLink>
        </p>
      </CardFooter>
    </Card>

    <!-- Модал объединения аккаунтов -->
    <Dialog :open="linkDialogOpen" @update:open="linkDialogOpen = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('auth.link.title') }}</DialogTitle>
          <DialogDescription>
            {{ t('auth.link.description', { provider: linkProvider, email: linkEmail }) }}
          </DialogDescription>
        </DialogHeader>

        <div class="flex flex-col items-center gap-4 py-2">
          <Input
            v-model="linkCode"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="123456"
            class="text-center text-2xl tracking-[0.5em] w-48"
            @input="linkCode = linkCode.replace(/\D/g, '').slice(0, 6)"
          />
          <p v-if="linkError" class="text-sm text-destructive">{{ linkError }}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="linkDialogOpen = false">{{ t('auth.link.cancel') }}</Button>
          <Button :disabled="linkCode.length < 6 || linkLoading" @click="confirmLink">
            {{ linkLoading ? t('auth.link.confirming') : t('auth.link.confirm') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Github } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const oauthError = ref('')

// Link account dialog
const linkDialogOpen = ref(false)
const linkEmail = ref('')
const linkProvider = ref('')
const linkCode = ref('')
const linkError = ref('')
const linkLoading = ref(false)

onMounted(async () => {
  const token = route.query.token as string | undefined
  const err = route.query.error as string | undefined
  const linkRequired = route.query.link_required as string | undefined

  if (token) {
    auth.setToken(token)
    await auth.fetchMe()
    router.replace('/')
    return
  }

  if (linkRequired) {
    linkEmail.value = decodeURIComponent((route.query.link_email as string) ?? '')
    linkProvider.value = decodeURIComponent((route.query.link_provider as string) ?? '')
    linkDialogOpen.value = true
    return
  }

  if (err) {
    oauthError.value = t('auth.login.oauthError')
  }
})

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message ?? t('auth.login.error')
  } finally {
    loading.value = false
  }
}

const apiBase = import.meta.env.VITE_API_URL ?? ''

function loginWithGoogle() {
  window.location.href = `${apiBase}/api/auth/google/redirect`
}

function loginWithGithub() {
  window.location.href = `${apiBase}/api/auth/github/redirect`
}

async function confirmLink() {
  linkError.value = ''
  linkLoading.value = true
  try {
    const { data } = await api.post('/api/auth/link/confirm', {
      email: linkEmail.value,
      code: linkCode.value,
    })
    auth.setToken(data.token)
    await auth.fetchMe()
    router.replace('/')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    linkError.value = err.response?.data?.message ?? t('auth.link.error')
  } finally {
    linkLoading.value = false
  }
}
</script>
