import type { PickerSelectorProps } from '@tarojs/components'
import type { GlobalData } from '@/app'
import type { User } from '@/services/api'
import { Picker, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useCallback, useState } from 'react'
import { AtList, AtListItem } from 'taro-ui'
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

  const startTimeIndex = timeOptions.indexOf(user?.defaultStartTime || '09:30')
  const endTimeIndex = timeOptions.indexOf(user?.defaultEndTime || '18:30')

  return (
    <View className="settings">
      <View className="section">
        <Text className="section-title">默认时间设置</Text>
        <Text className="section-desc">忘记打卡时，将使用以下默认时间计算工时</Text>

        <AtList>
          <Picker
            mode="selector"
            range={timeOptions}
            value={startTimeIndex >= 0 ? startTimeIndex : 19}
            onChange={handleStartTimeChange}
          >
            <AtListItem
              title="默认上班时间"
              extraText={user?.defaultStartTime || '09:30'}
              arrow="right"
            />
          </Picker>
          <Picker
            mode="selector"
            range={timeOptions}
            value={endTimeIndex >= 0 ? endTimeIndex : 37}
            onChange={handleEndTimeChange}
          >
            <AtListItem
              title="默认下班时间"
              extraText={user?.defaultEndTime || '18:30'}
              arrow="right"
            />
          </Picker>
        </AtList>
      </View>
    </View>
  )
}
