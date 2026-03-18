import type { PickerEvents } from '@antmjs/vantui'
import type { User } from '@/services/api'
import { Cell, Picker, Popup } from '@antmjs/vantui'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useCallback, useState } from 'react'
import { login, updateSettings } from '@/services/api'
import './index.scss'

// 生成时间选项 00:00 - 23:30，每30分钟
function generateTimeOptions() {
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
  const [user, setUser] = useState<User | null>(null)
  const [startPickerVisible, setStartPickerVisible] = useState(false)
  const [endPickerVisible, setEndPickerVisible] = useState(false)

  const loadUser = useCallback(async () => {
    try {
      const result = await login()
      setUser(result.user)
    }
    catch (error) {
      console.error('加载用户信息失败:', error)
    }
  }, [])

  useDidShow(() => {
    loadUser()
  })

  const handleUpdateStartTime = async (value: string) => {
    if (!value || value === user?.defaultStartTime)
      return

    try {
      const result = await updateSettings({ defaultStartTime: value })
      setUser(result.user)
      Taro.showToast({ title: '保存成功', icon: 'success' })
    }
    catch (error) {
      console.error('保存失败:', error)
      Taro.showToast({ title: '保存失败', icon: 'error' })
    }
  }

  const handleUpdateEndTime = async (value: string) => {
    if (!value || value === user?.defaultEndTime)
      return

    try {
      const result = await updateSettings({ defaultEndTime: value })
      setUser(result.user)
      Taro.showToast({ title: '保存成功', icon: 'success' })
    }
    catch (error) {
      console.error('保存失败:', error)
      Taro.showToast({ title: '保存失败', icon: 'error' })
    }
  }

  return (
    <View className="settings">
      <View className="section">
        <Text className="section-title">默认时间设置</Text>
        <Text className="section-desc">忘记打卡时，将使用以下默认时间计算工时</Text>

        <Cell
          title="默认上班时间"
          value={user?.defaultStartTime || '09:30'}
          isLink
          onClick={() => setStartPickerVisible(true)}
        />
        <Cell
          title="默认下班时间"
          value={user?.defaultEndTime || '18:30'}
          isLink
          onClick={() => setEndPickerVisible(true)}
        />
      </View>

      <Popup
        show={startPickerVisible}
        position="bottom"
        round
        onClose={() => setStartPickerVisible(false)}
      >
        <Picker
          title="选择上班时间"
          showToolbar
          columns={timeOptions}
          defaultIndex={timeOptions.indexOf(user?.defaultStartTime || '09:30')}
          onConfirm={(e: PickerEvents) => {
            handleUpdateStartTime(e.detail.value as string)
            setStartPickerVisible(false)
          }}
          onCancel={() => setStartPickerVisible(false)}
        />
      </Popup>

      <Popup
        show={endPickerVisible}
        position="bottom"
        round
        onClose={() => setEndPickerVisible(false)}
      >
        <Picker
          title="选择下班时间"
          showToolbar
          columns={timeOptions}
          defaultIndex={timeOptions.indexOf(user?.defaultEndTime || '18:30')}
          onConfirm={(e: PickerEvents) => {
            handleUpdateEndTime(e.detail.value as string)
            setEndPickerVisible(false)
          }}
          onCancel={() => setEndPickerVisible(false)}
        />
      </Popup>
    </View>
  )
}
