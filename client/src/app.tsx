import type { PropsWithChildren } from 'react'
import type { User } from '@/services/api'
import { cloud } from '@tarojs/taro'
import { Component } from 'react'
import { login } from '@/services/api'
import './app.scss'

// 全局数据类型定义
export interface GlobalData {
  isLoggedIn: boolean
  user: User | null
  loginPromise: Promise<void> | null
}

class App extends Component<PropsWithChildren> {
  // 全局数据
  globalData: GlobalData = {
    isLoggedIn: false,
    user: null,
    loginPromise: null,
  }

  componentDidMount() {
    // 初始化云开发
    if (process.env.TARO_ENV === 'weapp') {
      cloud.init({
        env: 'cloud1-5g9r86c3f7706e47',
        traceUser: true,
      })
    }

    // 启动时执行登录
    this.globalData.loginPromise = this.doLogin()
  }

  async doLogin() {
    try {
      const result = await login()
      if (result.success) {
        this.globalData.isLoggedIn = true
        this.globalData.user = result.user
      }
    } catch (error) {
      console.error('登录失败:', error)
    }
  }

  render() {
    return this.props.children
  }
}

export default App
