// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

interface User {
  _id?: string
  _openid: string
  defaultStartTime: string
  defaultEndTime: string
  createdAt: Date
  updatedAt: Date
}

// 云函数入口函数
exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID!

  // 查询用户是否存在
  const userRes = await db.collection('users').where({
    _openid: openid,
  }).get()

  if (userRes.data.length > 0) {
    // 用户已存在，返回用户信息
    return {
      success: true,
      user: userRes.data[0] as User,
    }
  }

  // 新用户，创建记录
  const now = new Date()
  const newUser: Omit<User, '_id'> = {
    _openid: openid,
    defaultStartTime: '09:30',
    defaultEndTime: '18:30',
    createdAt: now,
    updatedAt: now,
  }

  const addRes = await db.collection('users').add({
    data: newUser,
  })

  return {
    success: true,
    user: {
      _id: addRes._id,
      ...newUser,
    },
  }
}
