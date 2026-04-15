/**
 * 打卡记录
 */
export interface ClockRecord {
  startTime: number | null // Unix 时间戳（毫秒）
  endTime: number | null // Unix 时间戳（毫秒）
  startFrom: 'clock' | 'default'
  endFrom: 'clock' | 'default'
  /**
   * 状态：
   * - 'normal': 正常工作日（包括加班，加班通过 isWorkday=false 判断）
   * - 'leave': 请假
   *
   * 注：加班记录存储为 'normal'，在 UI 层通过日期是否为休息日来判断是否为加班
   */
  status: 'normal' | 'leave'
  updatedAt: number // Unix 时间戳（毫秒）
}

/**
 * 打卡记录集合（按日期索引）
 */
export interface ClockRecords {
  [date: string]: ClockRecord // key 为 "YYYY-MM-DD" 格式
}

/**
 * 用户设置
 */
export interface UserSettings {
  defaultStartTime: string // "HH:mm" 格式
  defaultEndTime: string // "HH:mm" 格式
  version: string // 数据版本号
}

/**
 * 年度节假日数据
 */
export interface YearHolidays {
  version: string // 年份
  updateTime: string // 更新时间
  data: {
    [date: string]: 'holiday' | 'workday' // key 为 "YYYY-MM-DD"
  }
  fullData?: {
    [monthDay: string]: {
      holiday: boolean
      name: string
      wage?: number
      date?: string
      rest?: number
    }
  } // 完整的 API 响应数据，用于获取节日名称
}

/**
 * 节假日缓存（按年份索引）
 */
export interface HolidaysCache {
  [year: string]: YearHolidays
}

/**
 * 月度统计数据
 */
export interface MonthStats {
  totalWorkDays: number // 总工作日数
  recordedDays: number // 已打卡天数
  totalHours: number // 总工时（小时）
  avgHoursPerDay: number // 日均工时（小时）
  leaveDays: number // 请假天数
  overtimeDays: number // 加班天数
}
