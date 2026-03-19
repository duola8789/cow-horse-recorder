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
  if (!date)
    return '--:--'
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
export function getCurrentYearMonth(): { year: number, month: number } {
  const now = dayjs()
  return {
    year: now.year(),
    month: now.month() + 1,
  }
}
