import type { PickerSelectorProps } from '@tarojs/components'
import type { GlobalData } from '@/app'
import type { User } from '@/services/api'
import { Picker, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useCallback, useState } from 'react'
import { login, updateSettings } from '@/services/api'
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

// 获取全局登录 Promise 的辅助函数
async function waitForLogin(): Promise<User | null> {
  const app = Taro.getApp<{ globalData: GlobalData }>()
  if (app?.globalData?.loginPromise) {
    await app.globalData.loginPromise
    return app.globalData.user
  } else {
    const result = await login()
    return result.user
  }
}

export default function Settings() {
  const [user, setUser] = useState<User | null>(null)

  const loadUser = useCallback(async () => {
    try {
      const userData = await waitForLogin()
      setUser(userData)
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  }, [])

  useDidShow(() => {
    loadUser()
  })

  const handleStartTimeChange: PickerSelectorProps['onChange'] = async (e) => {
    const index = e.detail.value as number
    const value = timeOptions[index]
    if (!value || value === user?.defaultStartTime) return

    try {
      const result = await updateSettings({ defaultStartTime: value })
      setUser(result.user)
      // 同步更新全局状态
      const app = Taro.getApp<{ globalData: GlobalData }>()
      if (app?.globalData) {
        app.globalData.user = result.user
      }
      Taro.showToast({ title: '保存成功', icon: 'success' })
    } catch (error) {
      console.error('保存失败:', error)
      Taro.showToast({ title: '保存失败', icon: 'error' })
    }
  }

  const handleEndTimeChange: PickerSelectorProps['onChange'] = async (e) => {
    const index = e.detail.value as number
    const value = timeOptions[index]
    if (!value || value === user?.defaultEndTime) return

    try {
      const result = await updateSettings({ defaultEndTime: value })
      setUser(result.user)
      // 同步更新全局状态
      const app = Taro.getApp<{ globalData: GlobalData }>()
      if (app?.globalData) {
        app.globalData.user = result.user
      }
      Taro.showToast({ title: '保存成功', icon: 'success' })
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

  const startTimeIndex = timeOptions.indexOf(user?.defaultStartTime || '09:00')
  const endTimeIndex = timeOptions.indexOf(user?.defaultEndTime || '18:30')

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
            value={startTimeIndex >= 0 ? startTimeIndex : 18}
            onChange={handleStartTimeChange}
          >
            <View className="setting-item">
              <Text className="item-icon">☀️</Text>
              <Text className="item-label">默认上班时间</Text>
              <Text className="item-value">{user?.defaultStartTime || '09:30'}</Text>
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
              <Text className="item-value">{user?.defaultEndTime || '18:30'}</Text>
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
