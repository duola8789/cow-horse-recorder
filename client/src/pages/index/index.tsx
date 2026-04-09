import type { GlobalData } from '@/app'
import type { ClockRecord } from '@/services/api'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { clock, getTodayStatus, login } from '@/services/api'
import {
  calculateWorkMinutes,
  formatDateChinese,
  formatDuration,
  formatTime,
  formatTimeWithSeconds,
  isMorning,
} from '@/utils/date'
import './index.scss'

type ClockType = 'start' | 'end'

// 获取全局登录 Promise 的辅助函数
async function waitForLogin(): Promise<void> {
  const app = Taro.getApp<{ globalData: GlobalData }>()
  if (app?.globalData?.loginPromise) {
    await app.globalData.loginPromise
  } else {
    // 如果 globalData 还没准备好，直接调用 login
    await login()
  }
}

export default function Index() {
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [record, setRecord] = useState<ClockRecord | null>(null)
  const [isWorkday, setIsWorkday] = useState(true)
  const [clockType, setClockType] = useState<ClockType>(() => (isMorning() ? 'start' : 'end'))
  const [currentTime, setCurrentTime] = useState(new Date())
  const [defaultStartTime, setDefaultStartTime] = useState('09:30')
  const [defaultEndTime, setDefaultEndTime] = useState('18:30')

  // 实时时钟 (秒级更新用于显示时间，分钟级用于时长计算)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 计算当日工作时长（只在分钟变化时重新计算）
  const currentMinute = Math.floor(currentTime.getTime() / 60000)
  const workMinutes = useMemo(
    () => calculateWorkMinutes(record, defaultStartTime, defaultEndTime, currentTime),
    [record, defaultStartTime, defaultEndTime, currentMinute]
  )
  const duration = workMinutes !== null ? formatDuration(workMinutes) : null
  const hasClockRecord = record?.startTime || record?.endTime

  // 初始化
  const init = useCallback(async () => {
    setPageLoading(true)
    try {
      // 等待全局登录完成
      await waitForLogin()

      // 获取今日状态
      const status = await getTodayStatus()
      setRecord(status.record)
      setIsWorkday(status.isWorkday)
      setDefaultStartTime(status.defaultStartTime)
      setDefaultEndTime(status.defaultEndTime)

      // 根据时间和状态设置默认打卡类型
      if (isMorning()) {
        setClockType('start')
      } else {
        setClockType('end')
      }
    } catch (error) {
      console.error('初始化失败:', error)
      Taro.showToast({ title: '加载失败', icon: 'error' })
    } finally {
      setPageLoading(false)
    }
  }, [])

  useDidShow(() => {
    init()
  })

  // 切换打卡类型
  const handleSwitchType = (type: ClockType) => {
    setClockType(type)
  }

  // 点击 Switch 轨道切换
  const handleTrackClick = () => {
    setClockType(clockType === 'start' ? 'end' : 'start')
  }

  // 执行打卡
  const doClockIn = async (type: ClockType) => {
    setLoading(true)
    try {
      // 震动反馈
      Taro.vibrateShort({ type: 'medium' })

      const result = await clock(type)
      setRecord(result.record)
      Taro.showToast({
        title: type === 'start' ? '上班打卡成功' : '下班打卡成功',
        icon: 'success',
      })
    } catch (error) {
      console.error('打卡失败:', error)
      Taro.showToast({ title: '打卡失败', icon: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // 显示确认对话框（使用原生 Modal）
  const showConfirmDialog = (content: string, onConfirm: () => void) => {
    Taro.showModal({
      title: '提示',
      content,
      confirmText: '确认',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          onConfirm()
        }
      },
    })
  }

  // 点击打卡按钮
  const handleClock = () => {
    const morning = isMorning()

    // 检查异常情况
    if (clockType === 'end' && morning) {
      // 上午打下班卡
      showConfirmDialog('现在是上午，确认打下班卡吗？', () => doClockIn('end'))
      return
    }

    if (clockType === 'end' && !record?.startTime) {
      // 没打上班卡直接打下班卡
      showConfirmDialog('您还没有打上班卡，将使用默认上班时间，确认打下班卡吗？', () =>
        doClockIn('end')
      )
      return
    }

    // 正常打卡
    doClockIn(clockType)
  }

  return (
    <View className="index">
      {/* 日期显示 */}
      <View className="date-header">
        <Text className="date-text">{formatDateChinese(currentTime)}</Text>
        <View className={`day-type-tag ${isWorkday ? 'workday' : 'holiday'}`}>
          <Text className="tag-text">{isWorkday ? '工作日' : '休息日'}</Text>
        </View>
      </View>

      {/* 实时时钟 */}
      <View className="clock-display">
        <Text className="clock-time">{formatTimeWithSeconds(currentTime)}</Text>
      </View>

      {pageLoading ? (
        <View className="page-loading">
          <View className="loading-spinner" />
          <Text className="loading-text">加载中...</Text>
        </View>
      ) : (
        <>
          {/* 上下班切换 Switch */}
          <View className="clock-type-switch">
            <Text
              className={`switch-option ${clockType === 'start' ? 'active' : ''}`}
              onClick={() => handleSwitchType('start')}
            >
              上班
            </Text>
            <View className="switch-track" onClick={handleTrackClick}>
              <View className={`switch-thumb ${clockType}`} />
            </View>
            <Text
              className={`switch-option ${clockType === 'end' ? 'active' : ''}`}
              onClick={() => handleSwitchType('end')}
            >
              下班
            </Text>
          </View>

          {/* 打卡按钮 */}
          <View
            className={`clock-button ${clockType === 'start' ? 'start-mode' : 'end-mode'} ${loading ? 'loading' : ''}`}
            onClick={!loading ? handleClock : undefined}
          >
            <Text className="button-icon">{clockType === 'start' ? '😢' : '😊'}</Text>
            <Text className="button-text">
              {loading ? '打卡中...' : clockType === 'start' ? '上班打卡' : '下班打卡'}
            </Text>
          </View>

          {/* 当日工作时长 */}
          {hasClockRecord && duration && (
            <View className="duration-card">
              <Text className="duration-label">今日已工作</Text>
              <View className="duration-value">
                <Text className="duration-icon">⏱️</Text>
                <Text className="duration-text">
                  {duration.hours} 小时 {duration.minutes} 分
                </Text>
              </View>
            </View>
          )}

          {/* 打卡状态卡片 */}
          <View className="status-card">
            <View className={`status-item ${record?.startTime ? 'checked' : ''}`}>
              <Text className="status-icon">😢</Text>
              <Text className="status-label">上班</Text>
              <Text className="status-time">{formatTime(record?.startTime)}</Text>
              <Text className="status-state">{record?.startTime ? '已打卡 ✓' : '未打卡'}</Text>
            </View>
            <View className="status-divider" />
            <View className={`status-item ${record?.endTime ? 'checked' : ''}`}>
              <Text className="status-icon">😊</Text>
              <Text className="status-label">下班</Text>
              <Text className="status-time">{formatTime(record?.endTime)}</Text>
              <Text className="status-state">{record?.endTime ? '已打卡 ✓' : '未打卡'}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  )
}
