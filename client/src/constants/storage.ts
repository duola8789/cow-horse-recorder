/**
 * Storage key 常量定义
 */
export const STORAGE_KEYS = {
  // 打卡记录
  CLOCK_RECORDS: 'clock_records',
  
  // 用户设置
  USER_SETTINGS: 'user_settings',
  
  // 节假日缓存
  HOLIDAYS: 'holidays',
  
  // 数据版本（用于未来升级）
  DATA_VERSION: 'data_version',
} as const

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]
