import { ref } from 'vue'

const updateAvailable = ref(false)

export function useAppUpdate() {
  function markUpdateAvailable() {
    updateAvailable.value = true
  }

  function reload() {
    window.location.reload()
  }

  return { updateAvailable, markUpdateAvailable, reload }
}
