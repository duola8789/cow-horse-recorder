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

// 格式化时间 HH:mm
export function formatTime(date: Date | null | undefined): string {
  if (!date) return '--:--'
  return dayjs(date).format('HH:mm')
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
  startTime?: Date | string | null
  endTime?: Date | string | null
}

// 计算工作时长（分钟）
export function calculateWorkMinutes(
  record: ClockRecordForDuration | null,
  defaultStartTime: string,
  defaultEndTime: string,
  now: Date
): number | null {
  if (!record?.startTime && !record?.endTime) {
    return null
  }

  // 解析默认时间为今日的 Date
  const parseTime = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
  }

  const defaultEnd = parseTime(defaultEndTime)
  const defaultStart = parseTime(defaultStartTime)

  let startDate: Date
  let endDate: Date

  if (record?.startTime) {
    startDate = new Date(record.startTime)

    if (record.endTime) {
      // 有上班卡，有下班卡
      endDate = new Date(record.endTime)
    } else if (now < defaultEnd) {
      // 有上班卡，无下班卡，当前时间未超过默认下班时间
      endDate = now
    } else {
      // 有上班卡，无下班卡，当前时间已超过默认下班时间
      endDate = defaultEnd
    }
  } else if (record?.endTime) {
    // 无上班卡，有下班卡
    startDate = defaultStart
    endDate = new Date(record.endTime)
  } else {
    return null
  }

  const diffMs = endDate.getTime() - startDate.getTime()
  return Math.max(0, Math.round(diffMs / 1000 / 60))
}

// 格式化分钟为 X 小时 X 分
export function formatDuration(totalMinutes: number): { hours: number; minutes: number } {
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  }
}
