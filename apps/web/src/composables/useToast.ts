import { showToast, showLoadingToast, closeToast } from 'vant'

export function useAppToast() {
  function success(msg: string) {
    showToast({ type: 'success', message: msg, duration: 2000 })
  }

  function fail(msg: string) {
    showToast({ type: 'fail', message: msg, duration: 2500 })
  }

  function loading(msg = '加载中...') {
    return showLoadingToast({ message: msg, forbidClick: true, duration: 0 })
  }

  function close() {
    closeToast()
  }

  return { success, fail, loading, close }
}

/** Extract API error message from axios error */
export function extractApiError(err: unknown, fallback = '操作失败，请重试'): string {
  const e = err as { response?: { data?: { error?: string } }; message?: string }
  return e?.response?.data?.error ?? e?.message ?? fallback
}
