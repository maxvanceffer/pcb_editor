<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('account.title') }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <!-- Аватар + имя -->
        <div class="flex items-center gap-4">
          <Avatar class="h-14 w-14">
            <AvatarImage :src="auth.user?.avatarUrl ?? ''" alt="" />
            <AvatarFallback class="text-lg">{{ userInitials }}</AvatarFallback>
          </Avatar>
          <div>
            <p class="font-semibold text-base">{{ auth.user?.fullName || '—' }}</p>
            <p class="text-sm text-muted-foreground">{{ auth.user?.email }}</p>
          </div>
        </div>

        <Separator />

        <!-- Данные аккаунта -->
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-foreground">{{ t('account.email') }}</span>
            <span>{{ auth.user?.email }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">{{ t('account.name') }}</span>
            <span>{{ auth.user?.fullName || '—' }}</span>
          </div>
          <div v-if="auth.user?.oauthProvider" class="flex justify-between">
            <span class="text-muted-foreground">{{ t('account.linkedVia') }}</span>
            <span class="capitalize">{{ auth.user.oauthProvider }}</span>
          </div>
        </div>

        <Separator />

        <!-- Danger zone -->
        <div class="space-y-2">
          <p class="text-sm font-medium text-destructive">{{ t('account.dangerZone') }}</p>
          <p class="text-xs text-muted-foreground">{{ t('account.deleteWarning') }}</p>

          <div v-if="!confirmDelete">
            <Button variant="destructive" size="sm" @click="confirmDelete = true">
              {{ t('account.deleteBtn') }}
            </Button>
          </div>

          <div v-else class="space-y-2">
            <p class="text-sm font-medium">{{ t('account.deleteConfirmPrompt') }}</p>
            <div class="flex gap-2">
              <Button variant="destructive" size="sm" :disabled="deleting" @click="deleteAccount">
                {{ deleting ? t('account.deleting') : t('account.deleteConfirm') }}
              </Button>
              <Button variant="outline" size="sm" @click="confirmDelete = false">
                {{ t('account.cancel') }}
              </Button>
            </div>
            <p v-if="deleteError" class="text-xs text-destructive">{{ deleteError }}</p>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

defineProps<{ open: boolean }>()
defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const confirmDelete = ref(false)
const deleting = ref(false)
const deleteError = ref('')

const userInitials = computed(() => {
  const name = auth.user?.fullName || auth.user?.email || ''
  return name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
})

async function deleteAccount() {
  deleting.value = true
  deleteError.value = ''
  try {
    await api.delete('/api/auth/account')
    auth.logout()
    router.push('/login')
  } catch {
    deleteError.value = t('account.deleteError')
  } finally {
    deleting.value = false
  }
}
</script>
