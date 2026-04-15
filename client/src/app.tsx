import type { PropsWithChildren } from 'react'
import { Component } from 'react'
import { Storage } from '@/utils/storage'
import { STORAGE_KEYS } from '@/constants/storage'
import { HolidayService } from '@/services/holidayService'
import { ClockService } from '@/services/clockService'
import type { UserSettings, ClockRecords } from '@/types/data'
import './app.scss'

const DATA_VERSION = '1.0'

class App extends Component<PropsWithChildren> {
  componentDidMount() {
    // 初始化本地数据
    this.initLocalData()

    // 初始化打卡服务（补全未完成的打卡记录）
    ClockService.init()

    // 初始化节假日数据
    HolidayService.init()
  }

  /**
   * 初始化本地数据
   * 首次启动时创建默认数据
   */
  initLocalData() {
    // 检查数据版本
    const version = Storage.get<string>(STORAGE_KEYS.DATA_VERSION)

    if (!version) {
      // 首次启动，初始化默认数据

      // 初始化用户设置
      const defaultSettings: UserSettings = {
        defaultStartTime: '09:30',
        defaultEndTime: '19:30',
        version: DATA_VERSION,
      }
      Storage.set(STORAGE_KEYS.USER_SETTINGS, defaultSettings)

      // 初始化打卡记录（空对象）
      const emptyRecords: ClockRecords = {}
      Storage.set(STORAGE_KEYS.CLOCK_RECORDS, emptyRecords)

      // 设置数据版本
      Storage.set(STORAGE_KEYS.DATA_VERSION, DATA_VERSION)
    } else if (version !== DATA_VERSION) {
      // 数据版本不匹配，需要升级
      // TODO: 未来如果需要数据迁移，在这里实现
      Storage.set(STORAGE_KEYS.DATA_VERSION, DATA_VERSION)
    }
  }

  render() {
    return this.props.children
  }
}

export default App
