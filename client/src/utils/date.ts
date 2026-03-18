import dayjs from 'dayjs'

// 判断当前是上午还是下午
export function isMorning(): boolean {
  return dayjs().hour() < 12
}

// 格式化时间
export function formatTime(date: Date | null | undefined): string {
  if (!date)
    return '--:--'
  return dayjs(date).format('HH:mm')
}

// 格式化日期
export function formatDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

// 获取当前年月
export function getCurrentYearMonth(): { year: number, month: number } {
  const now = dayjs()
  return {
    year: now.year(),
    month: now.month() + 1,
  }
}
