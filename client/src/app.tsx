import type { PropsWithChildren } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect } from 'react'
import './app.scss'

function App({ children }: PropsWithChildren) {
  useEffect(() => {
    // 初始化云开发
    if (process.env.TARO_ENV === 'weapp') {
      Taro.cloud.init({
        env: 'cloud1-5g9r86c3f7706e47',
        traceUser: true,
      })
    }
  }, [])

  useDidShow(() => {})

  return children
}

export default App
