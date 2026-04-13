import Taro from '@tarojs/taro'

export interface User {
  _id: string
  _openid: string
  defaultStartTime: string
  defaultEndTime: string
  createdAt: Date
  updatedAt: Date
}

export interface ClockRecord {
  _id: string
  _openid: string
  date: Date
  startTime: Date | null
  endTime: Date | null
  startFrom: 'clock' | 'default'
  endFrom: 'clock' | 'default'
  status: 'normal' | 'leave'
  createdAt: Date
  updatedAt: Date
}

export interface Stats {
  totalWorkDays: number
  recordedDays: number
  totalHours: number
  avgHoursPerDay: number
}

export interface TodayStatus {
  record: ClockRecord | null
  isWorkday: boolean
  defaultStartTime: string
  defaultEndTime: string
}

export type DailyStatus =
  | 'recorded'
  | 'partial'
  | 'default'
  | 'missing'
  | 'rest'
  | 'leave'
  | 'today'

export interface DailyRecord {
  date: string // "2026-03-19"
  day: number // 19
  dayOfWeek: number // 3 (0=周日, 1-6=周一至周六)
  isWorkday: boolean
  isToday: boolean
  status: DailyStatus
  startTime: string | null // "09:28"
  endTime: string | null // "18:45"
  startFrom: 'clock' | 'default' | null
  endFrom: 'clock' | 'default' | null
  defaultStartTime: string // "09:30"
  defaultEndTime: string // "18:30"
  hours: number | null // 9.28
  minutes: number | null // 557
}

export interface MonthlyRecordsResponse {
  success: boolean
  year: number
  month: number
  records: DailyRecord[]
  summary: Stats
}

// 登录
export async function login(): Promise<{ success: boolean; user: User }> {
  const res = await Taro.cloud.callFunction({
    name: 'login',
  })
  return res.result as { success: boolean; user: User }
}

// 打卡
export async function clock(
  type: 'start' | 'end'
): Promise<{ success: boolean; record: ClockRecord }> {
  const res = await Taro.cloud.callFunction({
    name: 'clock',
    data: { type },
  })
  return res.result as { success: boolean; record: ClockRecord }
}

// 获取今日状态
export async function getTodayStatus(): Promise<{ success: boolean } & TodayStatus> {
  const res = await Taro.cloud.callFunction({
    name: 'getTodayStatus',
  })
  return res.result as { success: boolean } & TodayStatus
}

// 获取月度统计
export async function getStats(year: number, month: number): Promise<{ success: boolean } & Stats> {
  const res = await Taro.cloud.callFunction({
    name: 'getStats',
    data: { year, month },
  })
  return res.result as { success: boolean } & Stats
}

// 更新设置
export async function updateSettings(settings: {
  defaultStartTime?: string
  defaultEndTime?: string
}): Promise<{ success: boolean; user: User }> {
  const res = await Taro.cloud.callFunction({
    name: 'updateSettings',
    data: settings,
  })
  return res.result as { success: boolean; user: User }
}

// 同步节假日
export async function syncHolidays(year: number): Promise<{ success: boolean; count: number }> {
  const res = await Taro.cloud.callFunction({
    name: 'syncHolidays',
    data: { year },
  })
  return res.result as { success: boolean; count: number }
}

// 获取月度每日明细
export async function getMonthlyRecords(
  year: number,
  month: number
): Promise<MonthlyRecordsResponse> {
  const res = await Taro.cloud.callFunction({
    name: 'getMonthlyRecords',
    data: { year, month },
  })
  return res.result as MonthlyRecordsResponse
}

// 更新打卡记录请求参数
export interface UpdateRecordRequest {
  date: string // "2026-04-10"
  startTime?: string | null // "09:30"
  endTime?: string | null // "18:30"
  status: 'normal' | 'leave'
}

// 更新打卡记录
export async function updateRecord(
  data: UpdateRecordRequest
): Promise<{ success: boolean; record?: ClockRecord; error?: string }> {
  const res = await Taro.cloud.callFunction({
    name: 'updateRecord',
    data,
  })
  return res.result as { success: boolean; record?: ClockRecord; error?: string }
}
