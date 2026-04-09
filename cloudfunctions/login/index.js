"use strict";
// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
// 云函数入口函数
exports.main = async () => {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    // 查询用户是否存在
    const userRes = await db
        .collection("users")
        .where({
        _openid: openid,
    })
        .get();
    let user;
    if (userRes.data.length > 0) {
        // 用户已存在
        user = userRes.data[0];
    }
    else {
        // 新用户，创建记录
        const now = new Date();
        const newUser = {
            _openid: openid,
            defaultStartTime: "09:30",
            defaultEndTime: "18:30",
            createdAt: now,
            updatedAt: now,
        };
        const addRes = await db.collection("users").add({
            data: newUser,
        });
        user = {
            _id: addRes._id,
            ...newUser,
        };
    }
    // 检查当年节假日数据是否存在（兜底机制）
    const currentYear = new Date().getFullYear();
    try {
        const holidayCheck = await db
            .collection("holidays")
            .where({ year: currentYear })
            .limit(1)
            .get();
        if (holidayCheck.data.length === 0) {
            // 异步触发同步，不阻塞登录流程
            cloud
                .callFunction({
                name: "syncHolidays",
                data: { year: currentYear },
            })
                .catch((err) => {
                console.error("同步节假日失败:", err);
            });
        }
    }
    catch (err) {
        // 忽略错误，不影响登录
        console.error("检查节假日数据失败:", err);
    }
    return {
        success: true,
        user,
    };
};
