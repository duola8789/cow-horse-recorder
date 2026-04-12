import type { DailyRecord, MonthlyRecordsResponse } from '@/services/api'
import type { GlobalData } from '@/app'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import { getMonthlyRecords, login } from '@/services/api'
import { getCurrentYearMonth } from '@/utils/date'
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

// 星期映射
const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 动画时长常量（与 CSS 保持一致）
const SHEET_ANIMATION_DURATION = 300

// 格式化工时为 X.Xh
function formatHours(hours: number | null): string {
  if (hours === null) return '—'
  return `${hours.toFixed(1)}h`
}

// 格式化分钟为 X小时X分
function formatMinutesToDuration(minutes: number | null): string {
  if (minutes === null) return '—'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}分钟`
  if (mins === 0) return `${hours}小时`
  return `${hours}小时${mins}分`
}

// 获取状态图标和说明
function getStatusIcon(record: DailyRecord): { icon: string; tip: string } {
  switch (record.status) {
    case 'recorded':
      return { icon: '🟢', tip: '' }
    case 'partial':
      return { icon: '🟡', tip: '部分默认' }
    case 'default':
      return { icon: '🟡', tip: '默认' }
    case 'missing':
      return { icon: '🔴', tip: '漏打卡' }
    case 'leave':
      return { icon: '🔵', tip: '请假' }
    case 'rest':
    case 'today':
    default:
      return { icon: '', tip: '' }
  }
}

// 获取状态文案
function getStatusText(record: DailyRecord): string {
  if (record.status === 'rest') return '休息日'
  if (record.status === 'leave') return '请假'
  if (record.status === 'missing') return '漏打卡'
  if (record.status === 'today') return '进行中'

  if (record.startTime && record.endTime) {
    const suffix = record.startFrom === 'default' || record.endFrom === 'default' ? ' (默认)' : ''
    return `${record.startTime} - ${record.endTime}${suffix}`
  }
  return '—'
}

// 内存缓存：按 year-month 存储数据
const dataCache = new Map<string, MonthlyRecordsResponse>()

export default function Stats() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MonthlyRecordsResponse | null>(null)
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [expanded, setExpanded] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<DailyRecord | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  const cacheKey = `${yearMonth.year}-${yearMonth.month}`

  const loadData = useCallback(
    async (showLoading = true) => {
      // 如果有缓存且不需要显示 loading，先用缓存数据
      const cached = dataCache.get(cacheKey)
      if (cached && !showLoading) {
        setData(cached)
        setLoading(false)
      }

      if (showLoading) {
        setLoading(true)
      }

      try {
        await waitForLogin()
        const result = await getMonthlyRecords(yearMonth.year, yearMonth.month)
        // 更新缓存
        dataCache.set(cacheKey, result)
        setData(result)
      } catch (error) {
        console.error('加载统计失败:', error)
        // 只在没有缓存数据时显示错误
        if (!cached) {
          Taro.showToast({ title: '加载失败', icon: 'error' })
        }
      } finally {
        setLoading(false)
      }
    },
    [yearMonth, cacheKey]
  )

  // 页面显示时加载数据（从其他页面返回时刷新）
  useDidShow(() => {
    if (isFirstLoad) {
      // 首次加载由 useEffect 处理
      setIsFirstLoad(false)
      return
    }
    // 非首次加载：先显示缓存，后台静默刷新
    const cached = dataCache.get(cacheKey)
    if (cached) {
      setData(cached)
      setLoading(false)
    }
    loadData(false)
  })

  // 首次加载或月份变化时加载数据
  useEffect(() => {
    // 检查是否有缓存
    const cached = dataCache.get(cacheKey)
    if (cached) {
      // 有缓存：立即显示，后台刷新
      setData(cached)
      setLoading(false)
      loadData(false)
    } else {
      // 无缓存：显示 loading
      loadData(true)
    }
  }, [yearMonth.year, yearMonth.month, cacheKey])

  // 切换到上个月
  const handlePrevMonth = () => {
    let newYear = yearMonth.year
    let newMonth = yearMonth.month - 1
    if (newMonth < 1) {
      newMonth = 12
      newYear--
    }
    setYearMonth({ year: newYear, month: newMonth })
    setExpanded(false)
  }

  // 切换到下个月
  const handleNextMonth = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // 不能超过当前月份
    if (yearMonth.year === currentYear && yearMonth.month >= currentMonth) {
      return
    }

    let newYear = yearMonth.year
    let newMonth = yearMonth.month + 1
    if (newMonth > 12) {
      newMonth = 1
      newYear++
    }
    setYearMonth({ year: newYear, month: newMonth })
    setExpanded(false)
  }

  // 是否可以切换到下个月
  const canGoNext = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    return !(yearMonth.year === currentYear && yearMonth.month >= currentMonth)
  }

  // 点击日期行
  const handleDayClick = (record: DailyRecord) => {
    if (record.status === 'rest') return
    setSelectedRecord(record)
    setSheetVisible(true)
  }

  // 关闭弹窗
  const closeSheet = () => {
    setSheetVisible(false)
    setTimeout(() => setSelectedRecord(null), SHEET_ANIMATION_DURATION)
  }

  // 点击编辑按钮
  const handleEditClick = () => {
    Taro.showToast({ title: '编辑功能即将上线', icon: 'none' })
  }

  return (
    <View className="stats">
      {/* 月份选择器 */}
      <View className="month-selector">
        <View className="month-arrow" onClick={handlePrevMonth}>
          <Text className="arrow-text">◀</Text>
        </View>
        <Text className="month-text">
          {yearMonth.year}年{yearMonth.month}月
        </Text>
        <View className={`month-arrow ${!canGoNext() ? 'disabled' : ''}`} onClick={handleNextMonth}>
          <Text className="arrow-text">▶</Text>
        </View>
      </View>

      {loading ? (
        <View className="loading">
          <View className="loading-spinner" />
          <Text className="loading-text">加载中...</Text>
        </View>
      ) : data ? (
        <>
          {/* 核心指标卡片 */}
          <View className="summary-card">
            <View className="main-stat">
              <Text className="main-value">{data.summary.avgHoursPerDay.toFixed(1)}</Text>
              <Text className="main-label">日均工时 (小时)</Text>
            </View>

            <View className="sub-stats">
              <View className="sub-stat">
                <Text className="sub-value">{data.summary.totalWorkDays}</Text>
                <Text className="sub-label">工作日</Text>
              </View>
              <View className="sub-stat">
                <Text className="sub-value">{data.summary.recordedDays}</Text>
                <Text className="sub-label">已记录</Text>
              </View>
            </View>

            <View className="total-hours">
              <Text className="total-text">总工时: {data.summary.totalHours.toFixed(1)} 小时</Text>
              <Text className="t1-note">(T+1，不含今天)</Text>
            </View>
          </View>

          {/* 每日明细 */}
          <View className="daily-section">
            <View className="daily-header" onClick={() => setExpanded(!expanded)}>
              <Text className="daily-title">📅 每日明细</Text>
              <Text className={`daily-arrow ${expanded ? 'expanded' : ''}`}>
                {expanded ? '▲' : '▼'}
              </Text>
            </View>

            {expanded && (
              <ScrollView className="daily-list" scrollY>
                {data.records.map((record) => (
                  <View
                    key={record.date}
                    className={`daily-row ${record.status === 'rest' ? 'rest' : 'clickable'}`}
                    onClick={() => handleDayClick(record)}
                  >
                    <View className="day-info">
                      <Text className="day-date">
                        {record.day}日 {WEEKDAY_NAMES[record.dayOfWeek]}
                      </Text>
                      {record.isToday && <Text className="today-tag">今天</Text>}
                    </View>
                    <View className="day-status">
                      {getStatusIcon(record).icon && (
                        <Text className="status-icon">{getStatusIcon(record).icon}</Text>
                      )}
                      <Text className={`status-text ${record.status}`}>
                        {getStatusText(record)}
                      </Text>
                    </View>
                    <View className="day-hours">
                      <Text className="hours-text">{formatHours(record.hours)}</Text>
                      {record.status !== 'rest' && record.status !== 'today' && (
                        <Text className="arrow-icon">▶</Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </>
      ) : (
        <View className="empty">
          <Text>暂无数据</Text>
        </View>
      )}

      {/* 单日详情弹窗 */}
      {selectedRecord && (
        <View className={`sheet-overlay ${sheetVisible ? 'visible' : ''}`} onClick={closeSheet}>
          <View
            className={`sheet-content ${sheetVisible ? 'visible' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <View className="sheet-handle" />

            <View className="sheet-header">
              <Text className="sheet-title">
                {selectedRecord.day}日 {WEEKDAY_NAMES[selectedRecord.dayOfWeek]}
              </Text>
              <Text className={`sheet-status ${selectedRecord.status}`}>
                {selectedRecord.status === 'recorded' && '✓ 已记录'}
                {selectedRecord.status === 'partial' && '部分打卡'}
                {selectedRecord.status === 'default' && '使用默认'}
                {selectedRecord.status === 'missing' && '漏打卡'}
                {selectedRecord.status === 'leave' && '请假'}
                {selectedRecord.status === 'today' && '进行中'}
              </Text>
            </View>

            <View className="sheet-body">
              {/* 上班打卡 */}
              <View className="clock-item">
                <View className="clock-header">
                  <Text className="clock-icon">😢</Text>
                  <Text className="clock-label">上班打卡</Text>
                </View>
                <View className="clock-content">
                  <Text className="clock-time">{selectedRecord.startTime || '—'}</Text>
                  <Text className={`clock-source ${selectedRecord.startFrom || ''}`}>
                    {selectedRecord.startFrom === 'clock' && '🟢 实际打卡'}
                    {selectedRecord.startFrom === 'default' && '🟡 默认时间'}
                    {!selectedRecord.startFrom && '未打卡'}
                  </Text>
                </View>
                <Text className="clock-default">默认: {selectedRecord.defaultStartTime}</Text>
              </View>

              {/* 下班打卡 */}
              <View className="clock-item">
                <View className="clock-header">
                  <Text className="clock-icon">😊</Text>
                  <Text className="clock-label">下班打卡</Text>
                </View>
                <View className="clock-content">
                  <Text className="clock-time">{selectedRecord.endTime || '—'}</Text>
                  <Text className={`clock-source ${selectedRecord.endFrom || ''}`}>
                    {selectedRecord.endFrom === 'clock' && '🟢 实际打卡'}
                    {selectedRecord.endFrom === 'default' && '🟡 默认时间'}
                    {!selectedRecord.endFrom && '未打卡'}
                  </Text>
                </View>
                <Text className="clock-default">默认: {selectedRecord.defaultEndTime}</Text>
              </View>

              {/* 工作时长 */}
              <View className="duration-section">
                <Text className="duration-label">工作时长:</Text>
                <Text className="duration-value">
                  {formatMinutesToDuration(selectedRecord.minutes)}
                </Text>
              </View>

              {/* 编辑按钮 */}
              <View className="edit-button disabled" onClick={handleEditClick}>
                <Text className="edit-text">编辑</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
