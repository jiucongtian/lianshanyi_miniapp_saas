import { defineStore } from 'pinia'
import { ref } from 'vue'

type ToastType = 'success' | 'fail' | 'loading'

export const useUiStore = defineStore('ui', () => {
  const toastMessage = ref('')
  const toastType = ref<ToastType>('success')

  function showToast(msg: string, type: ToastType = 'success') {
    toastMessage.value = msg
    toastType.value = type
  }

  function hideToast() {
    toastMessage.value = ''
  }

  return {
    toastMessage,
    toastType,
    showToast,
    hideToast,
  }
})
