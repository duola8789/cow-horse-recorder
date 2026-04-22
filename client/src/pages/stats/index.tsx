import { Picker, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import { StatsService } from '@/services/statsService'
import { ClockService } from '@/services/clockService'
import { HolidayService } from '@/services/holidayService'
import { getCurrentYearMonth, formatTime } from '@/utils/date'
import dayjs from 'dayjs'
import './index.scss'

// 每日记录接口
interface DailyRecord {
  date: string
  day: number
  dayOfWeek: string // "周一"、"周二" 等
  isWorkday: boolean
  isToday: boolean
  status: string
  startTime: number | null // 时间戳
  endTime: number | null // 时间戳
  startFrom: 'clock' | 'default'
  endFrom: 'clock' | 'default'
  defaultStartTime: string
  defaultEndTime: string
  hours: number | null
  minutes: number | null
}

// 月度数据响应接口
interface MonthlyRecordsResponse {
  records: DailyRecord[]
  summary: {
    totalWorkDays: number
    recordedDays: number
    totalHours: number
    avgHoursPerDay: number
    leaveDays: number
    overtimeDays: number
  }
}

// 编辑表单状态
interface EditFormState {
  status: 'normal' | 'leave' | 'overtime'
  startTime: string
  endTime: string
}

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
    case 'overtime':
      return { icon: '🟠', tip: '加班' }
    case 'today':
      return { icon: '🟢', tip: '进行中' } // 今天没有任何打卡，显示绿球
    case 'rest':
    default:
      return { icon: '', tip: '' }
  }
}

// 获取状态文案
function getStatusText(record: DailyRecord): string {
  if (record.status === 'rest') {
    // 检查是否是特殊节假日
    const holidayName = HolidayService.getHolidayName(record.date)
    return holidayName ? `休息日（${holidayName}）` : '休息日'
  }
  if (record.status === 'overtime') {
    // 加班日：显示打卡时间
    const holidayName = HolidayService.getHolidayName(record.date)
    const overtimeLabel = holidayName ? `加班（${holidayName}）` : '加班'
    if (record.startTime && record.endTime) {
      const startTimeStr = dayjs(record.startTime).format('HH:mm')
      const endTimeStr = dayjs(record.endTime).format('HH:mm')
      return `${startTimeStr} - ${endTimeStr} ${overtimeLabel}`
    }
    if (record.startTime && !record.endTime) {
      const startTimeStr = dayjs(record.startTime).format('HH:mm')
      return `${startTimeStr} - ${record.defaultEndTime} ${overtimeLabel}`
    }
    if (!record.startTime && record.endTime) {
      const endTimeStr = dayjs(record.endTime).format('HH:mm')
      return `${record.defaultStartTime} - ${endTimeStr} ${overtimeLabel}`
    }
    return overtimeLabel
  }
  if (record.status === 'leave') return '请假'
  if (record.status === 'missing') return '漏打卡'

  // 检查是否是补班日
  const isWorkdayHoliday = HolidayService.getHolidayType(record.date) === 'workday'
  const workdayTag = isWorkdayHoliday ? ' (补班)' : ''

  // 今天：不显示"默认"或"部分默认"标记
  if (record.isToday) {
    if (record.startTime && record.endTime) {
      const startTimeStr = dayjs(record.startTime).format('HH:mm')
      const endTimeStr = dayjs(record.endTime).format('HH:mm')
      return `${startTimeStr} - ${endTimeStr}${workdayTag}`
    }
    if (record.startTime && !record.endTime) {
      const startTimeStr = dayjs(record.startTime).format('HH:mm')
      return `${startTimeStr} - 进行中${workdayTag}`
    }
    if (!record.startTime && record.endTime) {
      const endTimeStr = dayjs(record.endTime).format('HH:mm')
      return `进行中 - ${endTimeStr}${workdayTag}`
    }
    return `进行中${workdayTag}`
  }

  // 过去的日期：有打卡记录
  if (record.startTime && record.endTime) {
    const defaultSuffix = record.startFrom === 'default' || record.endFrom === 'default' ? ' (部分默认)' : ''
    const suffix = workdayTag || defaultSuffix
    const startTimeStr = dayjs(record.startTime).format('HH:mm')
    const endTimeStr = dayjs(record.endTime).format('HH:mm')
    return `${startTimeStr} - ${endTimeStr}${suffix}`
  }

  // 过去的日期：部分打卡
  if (record.startTime || record.endTime) {
    const startTimeStr = record.startTime
      ? dayjs(record.startTime).format('HH:mm')
      : record.defaultStartTime
    const endTimeStr = record.endTime
      ? dayjs(record.endTime).format('HH:mm')
      : record.defaultEndTime
    const suffix = workdayTag || ' (部分默认)'
    return `${startTimeStr} - ${endTimeStr}${suffix}`
  }

  // 过去的日期：完全使用默认时间
  if (record.status === 'default') {
    const suffix = workdayTag || ' (默认)'
    return `${record.defaultStartTime} - ${record.defaultEndTime}${suffix}`
  }

  return '—'
}

// 内存缓存：按 year-month 存储数据
const dataCache = new Map<string, MonthlyRecordsResponse>()
const MAX_CACHE_SIZE = 6 // 最多缓存6个月的数据

export default function Stats() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MonthlyRecordsResponse | null>(null)
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [expanded, setExpanded] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<DailyRecord | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  // 编辑模式状态
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [saving, setSaving] = useState(false)

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
        // 调用本地统计服务
        const result = StatsService.getMonthlyRecords(yearMonth.year, yearMonth.month)

        // 更新缓存（限制缓存大小）
        if (dataCache.size >= MAX_CACHE_SIZE) {
          const firstKey = dataCache.keys().next().value
          if (firstKey) dataCache.delete(firstKey)
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearMonth.year, yearMonth.month])

  // 下拉刷新
  usePullDownRefresh(async () => {
    // 清除当月缓存，强制刷新
    dataCache.delete(cacheKey)
    await loadData(false)
    Taro.stopPullDownRefresh()
  })

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
    // 休息日也可以点击（用于编辑加班）
    setSelectedRecord(record)
    setSheetVisible(true)
  }

  // 关闭弹窗
  const closeSheet = () => {
    if (isEditing) {
      // 编辑模式下先退出编辑
      setIsEditing(false)
      setEditForm(null)
    }
    setSheetVisible(false)
    setTimeout(() => setSelectedRecord(null), SHEET_ANIMATION_DURATION)
  }

  // 进入编辑模式
  const enterEditMode = () => {
    if (!selectedRecord) return

    // 对于今天，如果没有打下班卡，不要自动填充默认时间
    const shouldFillEndTime = !selectedRecord.isToday || selectedRecord.endTime

    // 判断状态：请假、加班（休息日有打卡记录）、正常/休息
    let status: 'normal' | 'leave' | 'overtime' = 'normal'
    if (selectedRecord.status === 'leave') {
      status = 'leave'
    } else if (!selectedRecord.isWorkday) {
      // 休息日
      if (selectedRecord.startTime || selectedRecord.endTime) {
        status = 'overtime' // 有打卡记录，视为加班
      } else {
        status = 'leave' // 无打卡记录，默认为休息
      }
    }

    setEditForm({
      status,
      startTime: selectedRecord.startTime
        ? dayjs(selectedRecord.startTime).format('HH:mm')
        : selectedRecord.defaultStartTime,
      endTime: selectedRecord.endTime
        ? dayjs(selectedRecord.endTime).format('HH:mm')
        : shouldFillEndTime ? selectedRecord.defaultEndTime : '',
    })
    setIsEditing(true)
  }

  // 退出编辑模式
  const exitEditMode = () => {
    setIsEditing(false)
    setEditForm(null)
  }

  // 处理状态切换
  const handleStatusChange = (status: 'normal' | 'leave' | 'overtime') => {
    if (!editForm || !selectedRecord) return

    // 更新状态时，根据需要重置时间
    if (status === 'overtime' && !selectedRecord.startTime) {
      // 加班时填充默认时间
      setEditForm({
        ...editForm,
        status,
        startTime: selectedRecord.defaultStartTime,
        endTime: selectedRecord.defaultEndTime,
      })
    } else {
      setEditForm({ ...editForm, status })
    }
  }

  // 处理时间选择
  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    if (!editForm) return
    setEditForm({ ...editForm, [field]: value })
  }

  // 保存编辑
  const handleSave = async () => {
    if (!selectedRecord || !editForm) return

    // 前端校验：正常/加班状态下，如果有上下班时间，上班时间必须早于下班时间
    if (
      (editForm.status === 'normal' || editForm.status === 'overtime') &&
      editForm.startTime &&
      editForm.endTime &&
      editForm.startTime >= editForm.endTime
    ) {
      Taro.showToast({ title: '上班时间必须早于下班时间', icon: 'none' })
      return
    }

    setSaving(true)
    try {
      // 将 "HH:mm" 转换为时间戳
      const parseTimeToTimestamp = (timeStr: string, date: string): number | null => {
        if (!timeStr) return null
        const [hours, minutes] = timeStr.split(':').map(Number)
        return dayjs(date).hour(hours).minute(minutes).second(0).millisecond(0).valueOf()
      }

      // 调用本地打卡服务更新记录
      const isWorkingStatus = editForm.status === 'normal' || editForm.status === 'overtime'
      const startTime = isWorkingStatus
        ? parseTimeToTimestamp(editForm.startTime, selectedRecord.date)
        : null
      const endTime = isWorkingStatus
        ? parseTimeToTimestamp(editForm.endTime, selectedRecord.date)
        : null

      // 注：加班状态（overtime）在存储时转换为 'normal'
      // 系统通过判断日期是否为休息日（isWorkday=false）来区分加班和正常工作
      const success = ClockService.updateRecord(selectedRecord.date, {
        status: editForm.status === 'overtime' ? 'normal' : editForm.status,
        startTime,
        endTime,
        startFrom: startTime ? 'clock' : 'default',
        endFrom: endTime ? 'clock' : 'default',
      })

      if (success) {
        Taro.showToast({ title: '保存成功', icon: 'success' })
        // 清除缓存并刷新数据
        dataCache.delete(cacheKey)
        closeSheet()
        loadData(false)
      } else {
        Taro.showToast({ title: '保存失败', icon: 'none' })
      }
    } catch (error) {
      console.error('保存失败:', error)
      const errorMessage = error instanceof Error ? error.message : '保存失败，请重试'
      Taro.showToast({ title: errorMessage, icon: 'none' })
    } finally {
      setSaving(false)
    }
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
              {data.summary.leaveDays > 0 && (
                <View className="sub-stat">
                  <Text className="sub-value leave">{data.summary.leaveDays}</Text>
                  <Text className="sub-label">请假</Text>
                </View>
              )}
              {data.summary.overtimeDays > 0 && (
                <View className="sub-stat">
                  <Text className="sub-value overtime">{data.summary.overtimeDays}</Text>
                  <Text className="sub-label">加班</Text>
                </View>
              )}
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
                <View className="daily-list-content">
                  {data.records.map((record) => (
                    <View
                      key={record.date}
                      className="daily-row clickable"
                      onClick={() => handleDayClick(record)}
                    >
                      <View className="day-info">
                        <Text className="day-date">
                          {record.day}日 {record.dayOfWeek}
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
                        <Text className="arrow-icon">▶</Text>
                      </View>
                    </View>
                  ))}
                </View>
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
                {selectedRecord.day}日 {selectedRecord.dayOfWeek}
              </Text>
              {!isEditing && (
                <Text className={`sheet-status ${selectedRecord.status}`}>
                  {selectedRecord.status === 'recorded' && '✓ 已记录'}
                  {selectedRecord.status === 'partial' && '部分打卡'}
                  {selectedRecord.status === 'default' && '使用默认'}
                  {selectedRecord.status === 'missing' && '漏打卡'}
                  {selectedRecord.status === 'leave' && '请假'}
                  {selectedRecord.status === 'overtime' && '加班'}
                  {selectedRecord.status === 'today' && '进行中'}
                </Text>
              )}
            </View>

            <View className="sheet-body">
              {isEditing && editForm ? (
                <>
                  {/* 编辑模式 */}
                  {/* 状态选择 */}
                  <View className="edit-section">
                    <Text className="edit-label">状态</Text>
                    <View className="status-options">
                      {selectedRecord.isWorkday ? (
                        <>
                          {/* 工作日：正常/请假 */}
                          <View
                            className={`status-option ${editForm.status === 'normal' ? 'active' : ''}`}
                            onClick={() => handleStatusChange('normal')}
                          >
                            <Text className="status-option-text">正常</Text>
                          </View>
                          <View
                            className={`status-option ${editForm.status === 'leave' ? 'active' : ''}`}
                            onClick={() => handleStatusChange('leave')}
                          >
                            <Text className="status-option-text">请假</Text>
                          </View>
                        </>
                      ) : (
                        <>
                          {/* 休息日：休息/加班 */}
                          <View
                            className={`status-option ${editForm.status === 'leave' ? 'active' : ''}`}
                            onClick={() => handleStatusChange('leave')}
                          >
                            <Text className="status-option-text">休息</Text>
                          </View>
                          <View
                            className={`status-option ${editForm.status === 'overtime' ? 'active' : ''}`}
                            onClick={() => handleStatusChange('overtime')}
                          >
                            <Text className="status-option-text">加班</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  {/* 时间选择器（正常/加班状态显示） */}
                  {(editForm.status === 'normal' || editForm.status === 'overtime') && (
                    <>
                      <View className="edit-section">
                        <Text className="edit-label">上班时间</Text>
                        <Picker
                          mode="time"
                          value={editForm.startTime}
                          onChange={(e) => handleTimeChange('startTime', e.detail.value)}
                        >
                          <View className="time-picker">
                            <Text className="time-value">{editForm.startTime}</Text>
                            <Text className="time-arrow">▼</Text>
                          </View>
                        </Picker>
                      </View>

                      <View className="edit-section">
                        <Text className="edit-label">下班时间</Text>
                        <Picker
                          mode="time"
                          value={editForm.endTime}
                          onChange={(e) => handleTimeChange('endTime', e.detail.value)}
                        >
                          <View className="time-picker">
                            <Text className="time-value">{editForm.endTime}</Text>
                            <Text className="time-arrow">▼</Text>
                          </View>
                        </Picker>
                      </View>
                    </>
                  )}

                  {/* 编辑操作按钮 */}
                  <View className="edit-actions">
                    <View className="edit-action cancel" onClick={exitEditMode}>
                      <Text className="edit-action-text">取消</Text>
                    </View>
                    <View
                      className={`edit-action save ${saving ? 'disabled' : ''}`}
                      onClick={handleSave}
                    >
                      <Text className="edit-action-text">{saving ? '保存中...' : '保存'}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  {/* 查看模式 */}
                  {selectedRecord.status === 'leave' ? (
                    <>
                      {/* 请假：不显示具体时间 */}
                      <View className="status-notice">
                        <Text className="notice-icon">🔵</Text>
                        <Text className="notice-text">请假</Text>
                      </View>

                      {/* 编辑按钮 */}
                      <View className="edit-button" onClick={enterEditMode}>
                        <Text className="edit-text">编辑</Text>
                      </View>
                    </>
                  ) : selectedRecord.status === 'rest' ? (
                    <>
                      {/* 休息日：不显示具体时间 */}
                      <View className="status-notice">
                        <Text className="notice-icon">😴</Text>
                        <Text className="notice-text">休息日</Text>
                      </View>

                      {/* 编辑按钮 */}
                      <View className="edit-button" onClick={enterEditMode}>
                        <Text className="edit-text">编辑</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      {/* 工作日或加班：显示打卡时间 */}
                      {/* 上班打卡 */}
                      <View className="clock-item">
                        <View className="clock-header">
                          <Text className="clock-icon">😢</Text>
                          <Text className="clock-label">上班打卡</Text>
                        </View>
                        <View className="clock-content">
                          <Text className="clock-time">
                            {selectedRecord.startTime
                              ? formatTime(selectedRecord.startTime)
                              : selectedRecord.defaultStartTime}
                          </Text>
                          <Text className={`clock-source ${selectedRecord.startFrom || ''}`}>
                            {selectedRecord.startFrom === 'clock' && '🟢 已打卡'}
                            {selectedRecord.startFrom === 'default' && '🟡 默认打卡'}
                            {!selectedRecord.startFrom && '未打卡'}
                          </Text>
                        </View>
                        {selectedRecord.startFrom !== 'clock' && (
                          <Text className="clock-default">默认: {selectedRecord.defaultStartTime}</Text>
                        )}
                      </View>

                      {/* 下班打卡 */}
                      <View className="clock-item">
                        <View className="clock-header">
                          <Text className="clock-icon">😊</Text>
                          <Text className="clock-label">下班打卡</Text>
                        </View>
                        <View className="clock-content">
                          <Text className="clock-time">
                            {selectedRecord.endTime
                              ? formatTime(selectedRecord.endTime)
                              : selectedRecord.isToday
                              ? '进行中'
                              : selectedRecord.defaultEndTime}
                          </Text>
                          <Text className={`clock-source ${selectedRecord.endFrom || ''}`}>
                            {selectedRecord.endFrom === 'clock' && '🟢 已打卡'}
                            {selectedRecord.endFrom === 'default' && '🟡 默认打卡'}
                            {!selectedRecord.endFrom && (selectedRecord.isToday ? '' : '未打卡')}
                          </Text>
                        </View>
                        {selectedRecord.endFrom !== 'clock' && !selectedRecord.isToday && (
                          <Text className="clock-default">默认: {selectedRecord.defaultEndTime}</Text>
                        )}
                      </View>

                      {/* 工作时长 */}
                      <View className="duration-section">
                        <Text className="duration-label">工作时长:</Text>
                        <Text className="duration-value">
                          {formatMinutesToDuration(selectedRecord.minutes)}
                        </Text>
                      </View>

                      {/* 编辑按钮 */}
                      <View className="edit-button" onClick={enterEditMode}>
                        <Text className="edit-text">编辑</Text>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
