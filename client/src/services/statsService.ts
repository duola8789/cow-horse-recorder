import { Storage } from '@/utils/storage'
import { STORAGE_KEYS } from '@/constants/storage'
import { HolidayService } from './holidayService'
import { ClockService } from './clockService'
import type { MonthStats, UserSettings, ClockRecords } from '@/types/data'
import dayjs from 'dayjs'

/** 默认用户设置 */
const DEFAULT_SETTINGS: UserSettings = {
  defaultStartTime: '09:30',
  defaultEndTime: '19:30',
  version: '1.0',
}

/** 每日记录接口 */
interface DailyRecord {
  date: string
  day: number
  dayOfWeek: string
  isWorkday: boolean
  isToday: boolean
  status: string
  startTime: number | null
  endTime: number | null
  startFrom: 'clock' | 'default'
  endFrom: 'clock' | 'default'
  defaultStartTime: string
  defaultEndTime: string
  hours: number | null
  minutes: number | null
}

/** 月度每日明细响应 */
interface MonthlyRecordsResponse {
  records: DailyRecord[]
  summary: MonthStats
}

/**
 * 统计服务
 * 负责工时统计计算
 */
export class StatsService {
  /**
   * 获取用户设置（带默认值）
   * @private
   */
  private static getSettings(): UserSettings {
    return Storage.get<UserSettings>(STORAGE_KEYS.USER_SETTINGS) || DEFAULT_SETTINGS
  }

  /**
   * 获取月度统计
   * @param year 年份
   * @param month 月份 (1-12)
   * @param settings 可选的用户设置（避免重复读取）
   * @param records 可选的打卡记录（避免重复读取）
   * @returns 月度统计数据
   */
  static getMonthStats(
    year: number,
    month: number,
    settings?: UserSettings,
    records?: ClockRecords
  ): MonthStats {
    const today = dayjs().format('YYYY-MM-DD')
    const monthStart = dayjs()
      .year(year)
      .month(month - 1)
      .date(1)
      .format('YYYY-MM-DD')
    const monthEnd = dayjs()
      .year(year)
      .month(month - 1)
      .endOf('month')
      .format('YYYY-MM-DD')

    // 统计包含今天
    const statsEndDate = today

    // 如果统计截止日期早于月初，说明本月还没开始统计
    if (statsEndDate < monthStart) {
      return this.emptyStats()
    }

    // 实际统计结束日期（取月末和今天的较小值）
    const actualEndDate = statsEndDate < monthEnd ? statsEndDate : monthEnd

    // 获取用户设置（如果没有传入）
    const userSettings = settings || this.getSettings()

    // 计算工作日列表
    const workdays = this.calculateWorkdays(monthStart, actualEndDate)

    // 获取打卡记录（如果没有传入）
    const clockRecords = records || ClockService.getMonthRecords(year, month)

    // 计算总工时
    let totalMinutes = 0
    let recordedDays = 0
    let leaveDays = 0 // 请假天数
    let overtimeDays = 0 // 加班天数

    // 统计工作日的工时
    workdays.forEach((date) => {
      const record = clockRecords[date]

      // 跳过请假日（但统计请假天数）
      if (record && record.status === 'leave') {
        leaveDays++
        return
      }

      // 如果有打卡记录（部分或全部），计入已打卡天数
      if (record?.startTime || record?.endTime) {
        recordedDays++
      }

      // 今天需要特殊处理
      const isToday = date === today
      let minutes: number

      if (isToday && record?.startTime && !record?.endTime) {
        // 今天只有上班卡：始终使用当前时间（实时计算）
        const nowTimestamp = Date.now()
        minutes = Math.round((nowTimestamp - record.startTime) / 1000 / 60)
      } else {
        // 其他情况：使用打卡时间或默认时间
        const startTime = record?.startTime || userSettings.defaultStartTime
        const endTime = record?.endTime || userSettings.defaultEndTime
        minutes = this.calcMinutes(startTime, endTime)
      }

      if (minutes > 0) {
        totalMinutes += minutes
      }
    })

    // 统计加班天数（休息日有打卡记录）
    const restDays = this.calculateRestDays(monthStart, actualEndDate)
    restDays.forEach((date) => {
      const record = clockRecords[date]
      if (record && (record.startTime || record.endTime)) {
        overtimeDays++
        // 加班也要计入工时
        const startTime = record.startTime || userSettings.defaultStartTime
        const endTime = record.endTime || userSettings.defaultEndTime
        const minutes = this.calcMinutes(startTime, endTime)
        if (minutes > 0) {
          totalMinutes += minutes
        }
      }
    })

    // 实际工作日 = 工作日总数 - 请假天数 + 加班天数
    const actualWorkDays = workdays.length - leaveDays + overtimeDays

    const totalHours = Math.round((totalMinutes / 60) * 100) / 100
    const avgHoursPerDay =
      actualWorkDays > 0
        ? Math.round((totalMinutes / 60 / actualWorkDays) * 100) / 100
        : 0

    return {
      totalWorkDays: workdays.length,
      recordedDays,
      totalHours,
      avgHoursPerDay,
      leaveDays,
      overtimeDays,
    }
  }

  /**
   * 计算工作日列表
   * @param start 开始日期 "YYYY-MM-DD"
   * @param end 结束日期 "YYYY-MM-DD"
   * @returns 工作日列表
   * @private
   */
  private static calculateWorkdays(start: string, end: string): string[] {
    const workdays: string[] = []
    let current = dayjs(start)
    const endDay = dayjs(end)

    while (current.isBefore(endDay) || current.isSame(endDay)) {
      const dateStr = current.format('YYYY-MM-DD')

      if (HolidayService.isWorkday(dateStr)) {
        workdays.push(dateStr)
      }

      current = current.add(1, 'day')
    }

    return workdays
  }

  /**
   * 计算时间差（分钟）
   * @param start 时间戳或 "HH:mm" 字符串
   * @param end 时间戳或 "HH:mm" 字符串
   * @returns 分钟数
   * @private
   */
  private static calcMinutes(start: number | string, end: number | string): number {
    // 如果是时间戳
    if (typeof start === 'number' && typeof end === 'number') {
      return Math.round((end - start) / 1000 / 60)
    }

    // 如果是 "HH:mm" 字符串
    const startStr = typeof start === 'string' ? start : dayjs(start).format('HH:mm')
    const endStr = typeof end === 'string' ? end : dayjs(end).format('HH:mm')

    const [startH, startM] = startStr.split(':').map(Number)
    const [endH, endM] = endStr.split(':').map(Number)
    return endH * 60 + endM - (startH * 60 + startM)
  }

  /**
   * 计算休息日列表
   * @param start 开始日期 "YYYY-MM-DD"
   * @param end 结束日期 "YYYY-MM-DD"
   * @returns 休息日列表
   * @private
   */
  private static calculateRestDays(start: string, end: string): string[] {
    const restDays: string[] = []
    let current = dayjs(start)
    const endDay = dayjs(end)

    while (current.isBefore(endDay) || current.isSame(endDay)) {
      const dateStr = current.format('YYYY-MM-DD')

      if (!HolidayService.isWorkday(dateStr)) {
        restDays.push(dateStr)
      }

      current = current.add(1, 'day')
    }

    return restDays
  }

  /**
   * 返回空统计
   * @private
   */
  private static emptyStats(): MonthStats {
    return {
      totalWorkDays: 0,
      recordedDays: 0,
      totalHours: 0,
      avgHoursPerDay: 0,
      leaveDays: 0,
      overtimeDays: 0,
    }
  }

  /**
   * 获取月度每日明细
   * @param year 年份
   * @param month 月份 (1-12)
   * @returns 每日明细和汇总统计
   */
  static getMonthlyRecords(year: number, month: number): MonthlyRecordsResponse {
    const today = dayjs().format('YYYY-MM-DD')
    const todayDayjs = dayjs()
    const monthStart = dayjs()
      .year(year)
      .month(month - 1)
      .date(1)
    const monthEnd = dayjs()
      .year(year)
      .month(month - 1)
      .endOf('month')

    // 获取用户设置（只读取一次）
    const settings = this.getSettings()

    // 获取打卡记录（只读取一次）
    const records = ClockService.getMonthRecords(year, month)

    // 构建每日数据（只到今天为止）
    const dailyRecords: DailyRecord[] = []
    let current = monthStart

    // 计算实际结束日期：取月末和今天的较小值
    const actualEndDate = monthEnd.isAfter(todayDayjs) ? todayDayjs : monthEnd

    const dayNames = ['日', '一', '二', '三', '四', '五', '六']

    while (current.isBefore(actualEndDate) || current.isSame(actualEndDate, 'day')) {
      const dateStr = current.format('YYYY-MM-DD')
      const day = current.date()
      const dayOfWeek = current.day()
      const isToday = dateStr === today
      const isWorkday = HolidayService.isWorkday(dateStr)

      const record = records[dateStr]

      // 计算状态（今天也按照实际打卡情况判断）
      let status: string
      if (record?.status === 'leave') {
        status = 'leave'
      } else if (!isWorkday) {
        status = 'rest'
      } else if (record?.startTime && record?.endTime) {
        status = 'recorded'
      } else if (record?.startTime || record?.endTime) {
        status = 'partial'
      } else if (isToday) {
        status = 'today' // 今天没有任何打卡记录
      } else {
        status = 'default'
      }

      // 计算工时（今天需要特殊处理）
      let minutes: number
      let hours: number

      if (isToday && record?.startTime && !record?.endTime) {
        // 今天只有上班卡：始终使用当前时间（实时计算）
        const nowTimestamp = Date.now()
        minutes = Math.round((nowTimestamp - record.startTime) / 1000 / 60)
        hours = Math.round((minutes / 60) * 100) / 100
      } else {
        // 其他情况：使用打卡时间或默认时间
        const startTime = record?.startTime || settings.defaultStartTime
        const endTime = record?.endTime || settings.defaultEndTime
        minutes = this.calcMinutes(startTime, endTime)
        hours = Math.round((minutes / 60) * 100) / 100
      }

      dailyRecords.push({
        date: dateStr,
        day,
        dayOfWeek: `周${dayNames[dayOfWeek]}`,
        isWorkday,
        isToday,
        status,
        startTime: record?.startTime || null,
        endTime: record?.endTime || null,
        startFrom: record?.startFrom || 'default',
        endFrom: record?.endFrom || 'default',
        defaultStartTime: settings.defaultStartTime,
        defaultEndTime: settings.defaultEndTime,
        hours: isWorkday && status !== 'leave' ? hours : null,
        minutes: isWorkday && status !== 'leave' ? minutes : null,
      })

      current = current.add(1, 'day')
    }

    // 倒序排列（最新的在前）
    dailyRecords.reverse()

    // 获取汇总统计（传递已获取的数据，避免重复读取）
    const summary = this.getMonthStats(year, month, settings, records)

    return {
      records: dailyRecords,
      summary,
    }
  }
}
