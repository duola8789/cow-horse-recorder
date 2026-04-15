import Taro from '@tarojs/taro'

/**
 * Storage 封装工具
 * 提供类型安全的 storage 操作和统一的错误处理
 */
export class Storage {
  /**
   * 安全的读取数据
   * @param key storage key
   * @param defaultValue 默认值（可选）
   * @returns 读取的数据或默认值
   */
  static get<T>(key: string, defaultValue?: T): T | null {
    try {
      const value = Taro.getStorageSync(key)
      return value !== '' ? value : defaultValue ?? null
    } catch (e) {
      console.error(`[Storage] 读取失败: ${key}`, e)
      return defaultValue ?? null
    }
  }

  /**
   * 安全的写入数据
   * @param key storage key
   * @param value 要存储的数据
   * @returns 是否成功
   */
  static set(key: string, value: any): boolean {
    try {
      Taro.setStorageSync(key, value)
      return true
    } catch (e) {
      console.error(`[Storage] 写入失败: ${key}`, e)
      Taro.showToast({
        title: '存储失败，请检查手机空间',
        icon: 'none',
        duration: 2000,
      })
      return false
    }
  }

  /**
   * 删除指定 key 的数据
   * @param key storage key
   */
  static remove(key: string): void {
    try {
      Taro.removeStorageSync(key)
    } catch (e) {
      console.error(`[Storage] 删除失败: ${key}`, e)
    }
  }

  /**
   * 清空所有 storage 数据（谨慎使用）
   */
  static clear(): void {
    try {
      Taro.clearStorageSync()
    } catch (e) {
      console.error('[Storage] 清空失败', e)
    }
  }
}
