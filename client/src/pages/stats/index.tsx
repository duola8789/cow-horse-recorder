import type { Stats as StatsData } from '../../services/api'
import type { GlobalData } from '@/app'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useCallback, useState } from 'react'
import { getStats, login } from '../../services/api'
import { getCurrentYearMonth } from '../../utils/date'
import './index.scss'

// 获取全局登录 Promise 的辅助函数
async function waitForLogin(): Promise<void> {
  const app = Taro.getApp<{ globalData: GlobalData }>()
  if (app?.globalData?.loginPromise) {
    await app.globalData.loginPromise
  } else {
    await login()
  }
}

export default function Stats() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [yearMonth, _setYearMonth] = useState(getCurrentYearMonth())

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      // 等待全局登录完成
      await waitForLogin()

      const result = await getStats(yearMonth.year, yearMonth.month)
      setStats(result)
    }
    catch (error) {
      console.error('加载统计失败:', error)
      Taro.showToast({ title: '加载失败', icon: 'error' })
    }
    finally {
      setLoading(false)
    }
  }, [yearMonth])

  useDidShow(() => {
    loadStats()
  })

  const formatHours = (hours: number) => {
    return hours.toFixed(1)
  }

  return (
    <View className="stats">
      <View className="month-header">
        <Text className="month-title">
          {yearMonth.year}
          年
          {yearMonth.month}
          月工时统计
        </Text>
        <Text className="t1-note">(T+1，不含今天)</Text>
      </View>

      {loading
        ? (
            <View className="loading">
              <Text>加载中...</Text>
            </View>
          )
        : stats
          ? (
              <View className="stats-grid">
                <View className="stats-card">
                  <Text className="stats-value">{stats.totalWorkDays}</Text>
                  <Text className="stats-label">工作日</Text>
                </View>
                <View className="stats-card">
                  <Text className="stats-value">{stats.recordedDays}</Text>
                  <Text className="stats-label">已记录</Text>
                </View>
                <View className="stats-card highlight">
                  <Text className="stats-value">{formatHours(stats.totalHours)}</Text>
                  <Text className="stats-label">总工时</Text>
                </View>
                <View className="stats-card highlight">
                  <Text className="stats-value">{formatHours(stats.avgHoursPerDay)}</Text>
                  <Text className="stats-label">日均工时</Text>
                </View>
              </View>
            )
          : (
              <View className="empty">
                <Text>暂无数据</Text>
              </View>
            )}
    </View>
  )
}
