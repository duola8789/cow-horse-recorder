"use strict";
// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
// 获取今天 00:00:00 的时间
function getToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
// 云函数入口函数
exports.main = async (event) => {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const now = new Date();
    const today = getToday();
    // 查询今日打卡记录
    const recordRes = await db
        .collection("clock_records")
        .where({
        _openid: openid,
        date: today,
    })
        .get();
    let record;
    if (recordRes.data.length > 0) {
        // 今日已有记录，更新
        record = recordRes.data[0];
        if (event.type === "start") {
            // 上班卡：取更早的时间
            const newStartTime = record.startTime
                ? now < record.startTime
                    ? now
                    : record.startTime
                : now;
            await db
                .collection("clock_records")
                .doc(record._id)
                .update({
                data: {
                    startTime: newStartTime,
                    startFrom: "clock",
                    updatedAt: now,
                },
            });
            record.startTime = newStartTime;
            record.startFrom = "clock";
        }
        else {
            // 下班卡：取更晚的时间
            const newEndTime = record.endTime
                ? now > record.endTime
                    ? now
                    : record.endTime
                : now;
            await db
                .collection("clock_records")
                .doc(record._id)
                .update({
                data: {
                    endTime: newEndTime,
                    endFrom: "clock",
                    updatedAt: now,
                },
            });
            record.endTime = newEndTime;
            record.endFrom = "clock";
        }
        record.updatedAt = now;
    }
    else {
        // 今日没有记录，创建新记录
        const newRecord = {
            _openid: openid,
            date: today,
            startTime: event.type === "start" ? now : null,
            endTime: event.type === "end" ? now : null,
            startFrom: event.type === "start" ? "clock" : "default",
            endFrom: event.type === "end" ? "clock" : "default",
            status: "normal",
            createdAt: now,
            updatedAt: now,
        };
        const addRes = await db.collection("clock_records").add({
            data: newRecord,
        });
        record = {
            _id: addRes._id,
            ...newRecord,
        };
    }
    return {
        success: true,
        record,
    };
};
