<template>
  <div class="min-h-screen flex items-center justify-center bg-background">
    <Card class="w-[400px]">
      <CardHeader>
        <CardTitle class="text-2xl">{{ t('auth.register.title') }}</CardTitle>
        <CardDescription>{{ t('auth.register.subtitle') }}</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="fullName">{{ t('auth.register.name') }} <span class="text-muted-foreground text-xs">{{ t('auth.register.optional') }}</span></Label>
          <Input id="fullName" v-model="fullName" placeholder="Иван Иванов" />
        </div>
        <div class="space-y-2">
          <Label for="email">{{ t('auth.register.email') }}</Label>
          <Input id="email" v-model="email" type="email" placeholder="you@example.com" />
        </div>
        <div class="space-y-2">
          <Label for="password">{{ t('auth.register.password') }}</Label>
          <Input id="password" v-model="password" type="password" :placeholder="t('auth.register.passwordPlaceholder')" @keyup.enter="submit" />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      </CardContent>
      <CardFooter class="flex flex-col gap-3">
        <Button class="w-full" :disabled="loading" @click="submit">
          {{ loading ? t('auth.register.submitting') : t('auth.register.submit') }}
        </Button>
        <p class="text-sm text-muted-foreground text-center">
          {{ t('auth.register.hasAccount') }}
          <RouterLink to="/login" class="text-primary hover:underline">{{ t('auth.register.login') }}</RouterLink>
        </p>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const fullName = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = t('auth.register.errorRequired')
    return
  }
  loading.value = true
  try {
    await auth.register(email.value, password.value, fullName.value || undefined)
    router.push('/')
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { message?: string } } }
    const status = err.response?.status
    const serverMessage = err.response?.data?.message
    // Known user-facing errors (conflict, bad request)
    if (status === 409 || status === 400) {
      error.value = serverMessage ?? t('auth.register.error')
    } else {
      console.error('[register]', e)
      error.value = t('auth.register.error')
    }
  } finally {
    loading.value = false
  }
}
</script>
