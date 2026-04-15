import type { PickerSelectorProps } from '@tarojs/components'
import { Picker, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useCallback, useState } from 'react'
import { Storage } from '@/utils/storage'
import { STORAGE_KEYS } from '@/constants/storage'
import type { UserSettings } from '@/types/data'
import './index.scss'

// 生成时间选项 00:00 - 23:30，每30分钟
function generateTimeOptions(): string[] {
  const options: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return options
}

const timeOptions = generateTimeOptions()

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)

  const loadSettings = useCallback(() => {
    try {
      const userSettings = Storage.get<UserSettings>(STORAGE_KEYS.USER_SETTINGS)
      setSettings(
        userSettings || {
          defaultStartTime: '09:30',
          defaultEndTime: '19:30',
          version: '1.0',
        }
      )
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }, [])

  useDidShow(() => {
    loadSettings()
  })

  const handleStartTimeChange: PickerSelectorProps['onChange'] = (e) => {
    const index = e.detail.value as number
    const value = timeOptions[index]
    if (!value || !settings || value === settings.defaultStartTime) return

    try {
      const newSettings = { ...settings, defaultStartTime: value }
      const success = Storage.set(STORAGE_KEYS.USER_SETTINGS, newSettings)
      if (success) {
        setSettings(newSettings)
        Taro.showToast({ title: '保存成功', icon: 'success' })
      }
    } catch (error) {
      console.error('保存失败:', error)
      Taro.showToast({ title: '保存失败', icon: 'error' })
    }
  }

  const handleEndTimeChange: PickerSelectorProps['onChange'] = (e) => {
    const index = e.detail.value as number
    const value = timeOptions[index]
    if (!value || !settings || value === settings.defaultEndTime) return

    try {
      const newSettings = { ...settings, defaultEndTime: value }
      const success = Storage.set(STORAGE_KEYS.USER_SETTINGS, newSettings)
      if (success) {
        setSettings(newSettings)
        Taro.showToast({ title: '保存成功', icon: 'success' })
      }
    } catch (error) {
      console.error('保存失败:', error)
      Taro.showToast({ title: '保存失败', icon: 'error' })
    }
  }

  // 点击提醒设置项
  const handleReminderClick = () => {
    Taro.showToast({
      title: '功能即将上线，敬请期待',
      icon: 'none',
      duration: 2000,
    })
  }

  const startTimeIndex = timeOptions.indexOf(settings?.defaultStartTime || '09:30')
  const endTimeIndex = timeOptions.indexOf(settings?.defaultEndTime || '19:30')

  return (
    <View className="settings">
      {/* 默认时间设置 */}
      <View className="section-card">
        <View className="section-header">
          <Text className="section-icon">⏰</Text>
          <Text className="section-title">默认时间设置</Text>
        </View>
        <Text className="section-desc">忘记打卡时，将使用以下时间计算工时</Text>

        <View className="setting-list">
          <Picker
            mode="selector"
            range={timeOptions}
            value={startTimeIndex >= 0 ? startTimeIndex : 19}
            onChange={handleStartTimeChange}
          >
            <View className="setting-item">
              <Text className="item-icon">☀️</Text>
              <Text className="item-label">默认上班时间</Text>
              <Text className="item-value">{settings?.defaultStartTime || '09:30'}</Text>
              <Text className="item-arrow">›</Text>
            </View>
          </Picker>
          <Picker
            mode="selector"
            range={timeOptions}
            value={endTimeIndex >= 0 ? endTimeIndex : 37}
            onChange={handleEndTimeChange}
          >
            <View className="setting-item">
              <Text className="item-icon">🌙</Text>
              <Text className="item-label">默认下班时间</Text>
              <Text className="item-value">{settings?.defaultEndTime || '19:30'}</Text>
              <Text className="item-arrow">›</Text>
            </View>
          </Picker>
        </View>
      </View>

      {/* 打卡提醒 */}
      <View className="section-card">
        <View className="section-header">
          <Text className="section-icon">🔔</Text>
          <Text className="section-title">打卡提醒</Text>
        </View>
        <Text className="section-desc">开启后将在对应时间发送微信通知提醒打卡</Text>

        <View className="setting-list">
          <View className="setting-item" onClick={handleReminderClick}>
            <Text className="item-icon">☀️</Text>
            <Text className="item-label">上班打卡提醒</Text>
            <Text className="item-value coming-soon">即将上线</Text>
            <Text className="item-arrow">›</Text>
          </View>
          <View className="setting-item" onClick={handleReminderClick}>
            <Text className="item-icon">🌙</Text>
            <Text className="item-label">下班打卡提醒</Text>
            <Text className="item-value coming-soon">即将上线</Text>
            <Text className="item-arrow">›</Text>
          </View>
        </View>
      </View>

      {/* 关于 */}
      <View className="section-card">
        <View className="section-header">
          <Text className="section-icon">ℹ️</Text>
          <Text className="section-title">关于</Text>
        </View>

        <View className="setting-list about-version">
          <View className="setting-item">
            <Text className="item-icon">📱</Text>
            <Text className="item-label">当前版本</Text>
            <Text className="item-value">v{APP_VERSION}</Text>
          </View>
        </View>

        <View className="about-content">
          <Text className="about-emoji">🐮🐴</Text>
          <Text className="about-name">牛马工时记录器</Text>
          <Text className="about-slogan">珍惜卖命的每一秒</Text>
        </View>
      </View>
    </View>
  )
}
