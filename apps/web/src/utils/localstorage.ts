export const getLocalStorageItem = <T>(key: string): T | null => {
  try {
    const item = window.localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error)
    return null
  }
}

export const setLocalStorageItem = <T>(key: string, value: T): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error)
  }
}

export const removeLocalStorageItem = (key: string): void => {
  try {
    window.localStorage.removeItem(key)
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error)
  }
}
