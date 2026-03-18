import type { ClockRecord } from '@/services/api'
import { Button, Dialog } from '@antmjs/vantui'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useCallback, useState } from 'react'
import { clock, getTodayStatus, login } from '@/services/api'
import { formatTime, isMorning } from '@/utils/date'
import './index.scss'

type ClockType = 'start' | 'end'

export default function Index() {
  const [loading, setLoading] = useState(false)
  const [record, setRecord] = useState<ClockRecord | null>(null)
  const [isWorkday, setIsWorkday] = useState(true)
  const [clockType, setClockType] = useState<ClockType>(() => (isMorning() ? 'start' : 'end'))
  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogContent, setDialogContent] = useState('')
  const [pendingClockType, setPendingClockType] = useState<ClockType>('start')

  // 初始化
  const init = useCallback(async () => {
    try {
      // 先登录
      await login()

      // 获取今日状态
      const status = await getTodayStatus()
      setRecord(status.record)
      setIsWorkday(status.isWorkday)

      // 根据时间和状态设置默认打卡类型
      if (isMorning()) {
        setClockType('start')
      }
      else {
        setClockType('end')
      }
    }
    catch (error) {
      console.error('初始化失败:', error)
      Taro.showToast({ title: '加载失败', icon: 'error' })
    }
  }, [])

  useDidShow(() => {
    init()
  })

  // 切换打卡类型
  const handleSwitchType = () => {
    setClockType(prev => (prev === 'start' ? 'end' : 'start'))
  }

  // 执行打卡
  const doClockIn = async (type: ClockType) => {
    setLoading(true)
    try {
      const result = await clock(type)
      setRecord(result.record)
      Taro.showToast({
        title: type === 'start' ? '上班打卡成功' : '下班打卡成功',
        icon: 'success',
      })
    }
    catch (error) {
      console.error('打卡失败:', error)
      Taro.showToast({ title: '打卡失败', icon: 'error' })
    }
    finally {
      setLoading(false)
    }
  }

  // 点击打卡按钮
  const handleClock = () => {
    const morning = isMorning()

    // 检查异常情况
    if (clockType === 'end' && morning) {
      // 上午打下班卡
      setDialogContent('现在是上午，确认打下班卡吗？')
      setPendingClockType('end')
      setDialogVisible(true)
      return
    }

    if (clockType === 'end' && !record?.startTime) {
      // 没打上班卡直接打下班卡
      setDialogContent('您还没有打上班卡，将使用默认上班时间 09:30，确认打下班卡吗？')
      setPendingClockType('end')
      setDialogVisible(true)
      return
    }

    // 正常打卡
    doClockIn(clockType)
  }

  // 确认对话框
  const handleConfirm = () => {
    setDialogVisible(false)
    doClockIn(pendingClockType)
  }

  const buttonText = clockType === 'start' ? '上班打卡' : '下班打卡'
  const switchText = clockType === 'start' ? '切换到下班卡' : '切换到上班卡'

  return (
    <View className="index">
      {/* 今日状态 */}
      <View className="status-card">
        <Text className="status-title">今日打卡状态</Text>
        {!isWorkday && <Text className="holiday-tag">非工作日</Text>}
        <View className="status-row">
          <View className="status-item">
            <Text className="status-label">上班</Text>
            <Text className="status-value">{formatTime(record?.startTime)}</Text>
          </View>
          <View className="status-item">
            <Text className="status-label">下班</Text>
            <Text className="status-value">{formatTime(record?.endTime)}</Text>
          </View>
        </View>
      </View>

      {/* 打卡按钮 */}
      <View className="clock-section">
        <Button
          className="clock-button"
          type="primary"
          round
          loading={loading}
          onClick={handleClock}
        >
          {buttonText}
        </Button>
        <Text className="switch-link" onClick={handleSwitchType}>
          {switchText}
        </Text>
      </View>

      {/* 确认对话框 */}
      <Dialog
        title="提示"
        show={dialogVisible}
        showCancelButton
        message={dialogContent}
        onConfirm={handleConfirm}
        onCancel={() => setDialogVisible(false)}
      />
    </View>
  )
}
