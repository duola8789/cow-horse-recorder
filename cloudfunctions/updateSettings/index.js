"use strict";
// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
// 云函数入口函数
exports.main = async (event) => {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    // 查询用户
    const userRes = await db
        .collection("users")
        .where({
        _openid: openid,
    })
        .get();
    if (userRes.data.length === 0) {
        return {
            success: false,
            error: "User not found",
        };
    }
    const user = userRes.data[0];
    const now = new Date();
    // 构建更新数据
    const updateData = {
        updatedAt: now,
    };
    if (event.defaultStartTime) {
        updateData.defaultStartTime = event.defaultStartTime;
    }
    if (event.defaultEndTime) {
        updateData.defaultEndTime = event.defaultEndTime;
    }
    // 更新用户设置
    await db.collection("users").doc(user._id).update({
        data: updateData,
    });
    return {
        success: true,
        user: {
            ...user,
            ...updateData,
        },
    };
};
