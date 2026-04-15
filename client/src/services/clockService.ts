import { Storage } from '@/utils/storage'
import { STORAGE_KEYS } from '@/constants/storage'
import type { ClockRecord, ClockRecords, UserSettings } from '@/types/data'
import dayjs from 'dayjs'

/**
 * 打卡服务
 * 负责打卡记录的管理
 */
export class ClockService {
  /**
   * 初始化：检查并补全未完成的打卡记录
   * 应用启动时调用
   * 只检查最近一个月的记录，避免性能问题
   */
  static init() {
    const today = dayjs()
    const todayStr = today.format('YYYY-MM-DD')
    const oneMonthAgo = today.subtract(1, 'month').format('YYYY-MM-DD')

    const records = Storage.get<ClockRecords>(STORAGE_KEYS.CLOCK_RECORDS) || {}
    const settings = Storage.get<UserSettings>(STORAGE_KEYS.USER_SETTINGS) || {
      defaultStartTime: '09:30',
      defaultEndTime: '19:30',
      version: '1.0',
    }

    let hasChanges = false

    // 只检查最近一个月的记录，避免每次启动遍历全部历史
    Object.keys(records).forEach((date) => {
      // 跳过今天的记录（今天可能还没下班）
      if (date === todayStr) return

      // 跳过超过一个月的记录（已处理过）
      if (date < oneMonthAgo) return

      const record = records[date]

      // 如果有上班卡但没下班卡，自动填充默认下班时间
      if (record.startTime && !record.endTime && record.status === 'normal') {
        const [hour, minute] = settings.defaultEndTime.split(':').map(Number)
        record.endTime = dayjs(date)
          .hour(hour)
          .minute(minute)
          .second(0)
          .millisecond(0)
          .valueOf()
        record.endFrom = 'default'
        record.updatedAt = Date.now()
        hasChanges = true
      }
    })

    if (hasChanges) {
      Storage.set(STORAGE_KEYS.CLOCK_RECORDS, records)
    }
  }

  /**
   * 打卡
   * @param type 打卡类型：'start'=上班，'end'=下班
   * @returns 更新后的记录
   */
  static clock(type: 'start' | 'end'): ClockRecord {
    const today = dayjs().format('YYYY-MM-DD')
    const now = Date.now() // Unix 时间戳（毫秒）

    const records = Storage.get<ClockRecords>(STORAGE_KEYS.CLOCK_RECORDS) || {}
    const record = records[today] || this.createEmptyRecord()

    if (type === 'start') {
      // 上班卡：取更早的时间
      if (record.startTime) {
        record.startTime = now < record.startTime ? now : record.startTime
      } else {
        record.startTime = now
      }
      record.startFrom = 'clock'

      // 校验：如果已有下班卡，上班时间不能晚于下班时间
      if (record.endTime && record.startTime >= record.endTime) {
        throw new Error('上班时间不能晚于下班时间')
      }
    } else {
      // 下班卡：取更晚的时间
      if (record.endTime) {
        record.endTime = now > record.endTime ? now : record.endTime
      } else {
        record.endTime = now
      }
      record.endFrom = 'clock'

      // 如果没有上班卡，自动填充默认上班时间
      if (!record.startTime) {
        const settings = Storage.get<UserSettings>(STORAGE_KEYS.USER_SETTINGS) || {
          defaultStartTime: '09:30',
          defaultEndTime: '19:30',
          version: '1.0',
        }
        const [hour, minute] = settings.defaultStartTime.split(':').map(Number)
        record.startTime = dayjs(today)
          .hour(hour)
          .minute(minute)
          .second(0)
          .millisecond(0)
          .valueOf()
        record.startFrom = 'default'
      }

      // 校验：下班时间不能早于上班时间
      if (record.startTime && record.endTime <= record.startTime) {
        throw new Error('下班时间不能早于上班时间')
      }
    }

    record.updatedAt = now
    records[today] = record

    Storage.set(STORAGE_KEYS.CLOCK_RECORDS, records)

    return record
  }

  /**
   * 获取今日打卡记录
   * @returns 今日记录或 null
   */
  static getTodayRecord(): ClockRecord | null {
    const today = dayjs().format('YYYY-MM-DD')
    const records = Storage.get<ClockRecords>(STORAGE_KEYS.CLOCK_RECORDS) || {}
    return records[today] || null
  }

  /**
   * 更新打卡记录
   * @param date 日期 "YYYY-MM-DD"
   * @param data 要更新的数据
   * @returns 是否成功
   */
  static updateRecord(date: string, data: Partial<ClockRecord>): boolean {
    const records = Storage.get<ClockRecords>(STORAGE_KEYS.CLOCK_RECORDS) || {}
    const record = records[date] || this.createEmptyRecord()

    const updatedRecord = {
      ...record,
      ...data,
      updatedAt: Date.now(),
    }

    // 校验：如果同时有上下班时间，上班时间必须早于下班时间
    if (
      updatedRecord.startTime &&
      updatedRecord.endTime &&
      updatedRecord.startTime >= updatedRecord.endTime
    ) {
      throw new Error('上班时间必须早于下班时间')
    }

    records[date] = updatedRecord

    const success = Storage.set(STORAGE_KEYS.CLOCK_RECORDS, records)

    return success
  }

  /**
   * 获取指定月份的打卡记录
   * @param year 年份
   * @param month 月份 (1-12)
   * @returns 该月的打卡记录
   */
  static getMonthRecords(year: number, month: number): ClockRecords {
    const records = Storage.get<ClockRecords>(STORAGE_KEYS.CLOCK_RECORDS) || {}
    const prefix = `${year}-${String(month).padStart(2, '0')}`

    const monthRecords: ClockRecords = {}
    Object.keys(records).forEach((date) => {
      if (date.startsWith(prefix)) {
        monthRecords[date] = records[date]
      }
    })

    return monthRecords
  }

  /**
   * 创建空记录
   * @private
   */
  private static createEmptyRecord(): ClockRecord {
    return {
      startTime: null,
      endTime: null,
      startFrom: 'default',
      endFrom: 'default',
      status: 'normal',
      updatedAt: Date.now(),
    }
  }
}
