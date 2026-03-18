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
}

// 登录
export async function login(): Promise<{ success: boolean, user: User }> {
  const res = await Taro.cloud.callFunction({
    name: 'login',
  })
  return res.result as { success: boolean, user: User }
}

// 打卡
export async function clock(
  type: 'start' | 'end',
): Promise<{ success: boolean, record: ClockRecord }> {
  const res = await Taro.cloud.callFunction({
    name: 'clock',
    data: { type },
  })
  return res.result as { success: boolean, record: ClockRecord }
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
}): Promise<{ success: boolean, user: User }> {
  const res = await Taro.cloud.callFunction({
    name: 'updateSettings',
    data: settings,
  })
  return res.result as { success: boolean, user: User }
}

// 同步节假日
export async function syncHolidays(year: number): Promise<{ success: boolean, count: number }> {
  const res = await Taro.cloud.callFunction({
    name: 'syncHolidays',
    data: { year },
  })
  return res.result as { success: boolean, count: number }
}
