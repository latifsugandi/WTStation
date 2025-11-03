// Utility untuk check apakah Electron API tersedia
export const waitForElectronAPI = (timeout = 5000): Promise<typeof window.electronAPI> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      resolve(window.electronAPI)
      return
    }

    const startTime = Date.now()
    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        clearInterval(checkInterval)
        resolve(window.electronAPI)
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval)
        reject(new Error('Electron API not available after timeout'))
      }
    }, 100)
  })
}

// Check immediately
export const isElectronAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined'
}
