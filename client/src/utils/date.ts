import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

// 设置中文环境
dayjs.locale('zh-cn')

// 星期映射
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

// 判断当前是上午还是下午
export function isMorning(): boolean {
  return dayjs().hour() < 12
}

// 格式化时间 HH:mm（支持时间戳、Date 对象、"HH:mm" 字符串）
export function formatTime(time: number | Date | string | null | undefined): string {
  if (!time) return '--:--'
  // 如果已经是 "HH:mm" 格式的字符串，直接返回
  if (typeof time === 'string' && /^\d{2}:\d{2}$/.test(time)) {
    return time
  }
  // 时间戳或 Date 对象
  return dayjs(time).format('HH:mm')
}

// 格式化时间带秒 HH:mm:ss
export function formatTimeWithSeconds(date: Date): string {
  return dayjs(date).format('HH:mm:ss')
}

// 格式化日期 YYYY-MM-DD
export function formatDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

// 格式化日期为中文格式 YYYY年M月D日 周X
export function formatDateChinese(date: Date): string {
  const d = dayjs(date)
  const weekday = weekdays[d.day()]
  return `${d.format('YYYY年M月D日')} 周${weekday}`
}

// 获取当前年月
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = dayjs()
  return {
    year: now.year(),
    month: now.month() + 1,
  }
}

// 计算工作时长接口
export interface ClockRecordForDuration {
  startTime?: number | null  // 时间戳（毫秒）
  endTime?: number | null    // 时间戳（毫秒）
}

// 计算工作时长（分钟）
export function calculateWorkMinutes(
  record: ClockRecordForDuration | null,
  defaultStartTime: string,  // "HH:mm" 格式
  defaultEndTime: string,    // "HH:mm" 格式
  now: Date
): number | null {
  if (!record?.startTime && !record?.endTime) {
    return null
  }

  // 将 "HH:mm" 转换为今天的时间戳
  const parseTimeToTimestamp = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return dayjs(now).hour(hours).minute(minutes).second(0).millisecond(0).valueOf()
  }

  const nowTimestamp = now.getTime()
  const defaultStartTimestamp = parseTimeToTimestamp(defaultStartTime)

  let startTimestamp: number
  let endTimestamp: number

  if (record?.startTime) {
    startTimestamp = record.startTime

    if (record.endTime) {
      // 有上班卡，有下班卡
      endTimestamp = record.endTime
    } else {
      // 有上班卡，无下班卡：始终使用当前时间（实时计算）
      endTimestamp = nowTimestamp
    }
  } else if (record?.endTime) {
    // 无上班卡，有下班卡
    startTimestamp = defaultStartTimestamp
    endTimestamp = record.endTime
  } else {
    return null
  }

  const diffMs = endTimestamp - startTimestamp
  return Math.max(0, Math.round(diffMs / 1000 / 60))
}

// 格式化分钟为 X 小时 X 分
export function formatDuration(totalMinutes: number): { hours: number; minutes: number } {
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  }
}
