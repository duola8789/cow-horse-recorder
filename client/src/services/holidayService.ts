import { Storage } from '@/utils/storage'
import { STORAGE_KEYS } from '@/constants/storage'
import type { HolidaysCache } from '@/types/data'
import Taro from '@tarojs/taro'
import dayjs from 'dayjs'

const API_URL = 'https://timor.tech/api/holiday/year'

/**
 * 节假日服务
 * 负责节假日数据的同步和工作日判断
 */
export class HolidayService {
  /**
   * 初始化节假日数据
   * 应用启动时调用
   */
  static async init() {
    const now = dayjs()
    const currentYear = now.year()
    const nextYear = currentYear + 1
    const month = now.month() + 1 // 1-12

    const holidays = Storage.get<HolidaysCache>(STORAGE_KEYS.HOLIDAYS) || {}

    // 确保当年数据存在
    if (!holidays[currentYear]) {
      await this.syncYear(currentYear)
    }

    // 12月且没有次年数据，尝试拉取
    if (month === 12 && !holidays[nextYear]) {
      await this.syncYear(nextYear)
    }
  }

  /**
   * 同步指定年份的节假日数据
   * @param year 年份
   * @returns 是否成功
   */
  static async syncYear(year: number): Promise<boolean> {
    try {
      const res = await Taro.request({
        url: `${API_URL}/${year}`,
        method: 'GET',
        timeout: 5000,
      })

      if (res.statusCode === 200 && res.data?.holiday) {
        const holidays = Storage.get<HolidaysCache>(STORAGE_KEYS.HOLIDAYS) || {}

        // API 返回格式示例：
        // {
        //   "holiday": {
        //     "01-01": { "holiday": true, "name": "元旦", "wage": 3, "date": "2026-01-01", ... }
        //   }
        // }
        // 需要转换为完整的日期格式
        const rawData = res.data.holiday as Record<string, { holiday: boolean; date?: string; name?: string }>
        const processedData: Record<string, 'holiday' | 'workday'> = {}

        Object.keys(rawData).forEach((key) => {
          const item = rawData[key]
          const fullDate = item.date || `${year}-${key}` // 完整日期 "YYYY-MM-DD"

          // 判断是工作日还是休息日
          if (item.holiday === true) {
            processedData[fullDate] = 'holiday' // 休息日
          } else if (item.holiday === false) {
            processedData[fullDate] = 'workday' // 调休工作日
          }
        })

        holidays[year] = {
          version: year.toString(),
          updateTime: new Date().toISOString(),
          data: processedData,
          fullData: res.data.holiday, // 保存完整数据用于获取节日名称
        }

        Storage.set(STORAGE_KEYS.HOLIDAYS, holidays)
        return true
      }

      return false
    } catch {
      // API 失败时静默降级到默认规则（周一到周五）
      return false
    }
  }

  /**
   * 判断指定日期是否为工作日
   * @param date 日期字符串 "YYYY-MM-DD"
   * @returns 是否为工作日
   */
  static isWorkday(date: string): boolean {
    const dateDayjs = dayjs(date)
    const year = dateDayjs.year()

    const holidays = Storage.get<HolidaysCache>(STORAGE_KEYS.HOLIDAYS) || {}

    // 有节假日数据，使用精确判断
    if (holidays[year]?.data[date]) {
      return holidays[year].data[date] === 'workday'
    }

    // 没有数据，降级为简单规则：周一到周五
    const day = dateDayjs.day()
    return day >= 1 && day <= 5
  }

  /**
   * 获取指定日期的节假日类型
   * @param date 日期字符串 "YYYY-MM-DD"
   * @returns 节假日类型或 null
   */
  static getHolidayType(date: string): 'holiday' | 'workday' | null {
    const dateDayjs = dayjs(date)
    const year = dateDayjs.year()

    const holidays = Storage.get<HolidaysCache>(STORAGE_KEYS.HOLIDAYS) || {}

    return holidays[year]?.data[date] || null
  }

  /**
   * 获取指定日期的节假日名称
   * @param date 日期字符串 "YYYY-MM-DD"
   * @returns 节假日名称或 null
   */
  static getHolidayName(date: string): string | null {
    const dateDayjs = dayjs(date)
    const year = dateDayjs.year()

    const holidays = Storage.get<HolidaysCache>(STORAGE_KEYS.HOLIDAYS) || {}
    const yearData = holidays[year]
    if (!yearData || !yearData.fullData) return null

    const fullData = yearData.fullData

    // API 返回的 key 格式可能是 "MM-DD" 或 "YYYY-MM-DD"
    // 优先尝试 "MM-DD" 格式
    const monthDay = dateDayjs.format('MM-DD') // "04-06"
    let holidayInfo = fullData[monthDay]

    // 如果没找到，尝试完整日期格式
    if (!holidayInfo) {
      holidayInfo = fullData[date]
    }

    // 查找节日信息
    if (holidayInfo?.holiday === true && holidayInfo?.name) {
      return holidayInfo.name
    }

    return null
  }
}
