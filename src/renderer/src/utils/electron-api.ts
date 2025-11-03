// Utility untuk check dan access electronAPI dengan safe fallback

export const checkElectronAPI = (): boolean => {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined'
}

export const getElectronAPI = () => {
  if (!checkElectronAPI()) {
    throw new Error('Electron API is not available. Make sure you are running in Electron environment.')
  }
  return window.electronAPI
}

// Safe wrapper untuk electronAPI calls
export const safeElectronCall = async <T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T> => {
  try {
    if (!checkElectronAPI()) {
      if (fallback !== undefined) return fallback
      throw new Error('Electron API not available')
    }
    return await fn()
  } catch (error) {
    console.error('Electron API call failed:', error)
    throw error
  }
}
