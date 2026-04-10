// 云函数入口文件
const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

interface ClockRecord {
  _id?: string;
  _openid: string;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  startFrom: "clock" | "default";
  endFrom: "clock" | "default";
  status: "normal" | "leave";
  createdAt: Date;
  updatedAt: Date;
}

// 北京时间偏移量 (UTC+8)
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

// 获取北京时间的今天 00:00:00 (UTC+8)
// 云函数运行在 UTC 时区，需要手动转换
function getToday(): Date {
  const now = new Date();
  // 转换为北京时间
  const beijingTime = new Date(now.getTime() + BEIJING_OFFSET_MS);
  // 获取北京时间的年月日
  const year = beijingTime.getUTCFullYear();
  const month = beijingTime.getUTCMonth();
  const day = beijingTime.getUTCDate();
  // 返回北京时间当天 00:00:00 对应的 UTC 时间
  return new Date(Date.UTC(year, month, day) - BEIJING_OFFSET_MS);
}

// 云函数入口函数
exports.main = async (event: { type: "start" | "end" }) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID!;
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

  let record: ClockRecord;

  if (recordRes.data.length > 0) {
    // 今日已有记录，更新
    record = recordRes.data[0] as ClockRecord;

    if (event.type === "start") {
      // 上班卡：取更早的时间
      const newStartTime = record.startTime
        ? now < record.startTime
          ? now
          : record.startTime
        : now;

      await db
        .collection("clock_records")
        .doc(record._id!)
        .update({
          data: {
            startTime: newStartTime,
            startFrom: "clock",
            updatedAt: now,
          },
        });

      record.startTime = newStartTime;
      record.startFrom = "clock";
    } else {
      // 下班卡：取更晚的时间
      const newEndTime = record.endTime
        ? now > record.endTime
          ? now
          : record.endTime
        : now;

      await db
        .collection("clock_records")
        .doc(record._id!)
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
  } else {
    // 今日没有记录，创建新记录
    const newRecord: Omit<ClockRecord, "_id"> = {
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
      _id: addRes._id as string,
      ...newRecord,
    };
  }

  return {
    success: true,
    record,
  };
};
