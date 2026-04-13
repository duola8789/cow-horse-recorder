// 云函数入口文件
const cloud = require("wx-server-sdk");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 请求参数接口
interface UpdateRecordRequest {
  date?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  status?: unknown;
}

// 打卡记录接口
interface ClockRecord {
  _id?: string;
  _openid: string;
  date: string; // "YYYY-MM-DD"
  startTime: Date | null;
  endTime: Date | null;
  startFrom: "clock" | "default";
  endFrom: "clock" | "default";
  status: "normal" | "leave";
  createdAt: Date;
  updatedAt: Date;
}

// 节假日接口
interface Holiday {
  _id: string;
  date: string; // "YYYY-MM-DD"
  type: "workday" | "holiday";
}

// 判断是否是周末
function isWeekend(dateStr: string): boolean {
  const day = dayjs(dateStr).day();
  return day === 0 || day === 6;
}

// 校验日期格式 YYYY-MM-DD
function isValidDateFormat(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  return dayjs(dateStr).isValid();
}

// 校验时间格式 HH:mm
function isValidTimeFormat(timeStr: string): boolean {
  const regex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  return regex.test(timeStr);
}

// 将时间字符串转换为指定日期的 Date 对象
// timeStr: "HH:mm" 格式的北京时间
// dateStr: "YYYY-MM-DD" 格式的日期
function parseTimeString(timeStr: string, dateStr: string): Date {
  // 用 dayjs 构造北京时间，然后转为 UTC Date 对象
  return dayjs.tz(`${dateStr} ${timeStr}`, "Asia/Shanghai").toDate();
}

// 云函数入口函数
exports.main = async (event: UpdateRecordRequest) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID!;
  const { date, startTime, endTime, status } = event;

  // ========== 参数校验 ==========

  // 校验 date
  if (typeof date !== "string" || !isValidDateFormat(date)) {
    return { success: false, error: "Invalid date format" };
  }

  // 校验 status
  if (status !== "normal" && status !== "leave") {
    return { success: false, error: "Invalid status" };
  }

  // 正常状态下校验时间
  if (status === "normal") {
    // startTime 和 endTime 必须提供
    if (typeof startTime !== "string" || !isValidTimeFormat(startTime)) {
      return { success: false, error: "Invalid start time format" };
    }
    if (typeof endTime !== "string" || !isValidTimeFormat(endTime)) {
      return { success: false, error: "Invalid end time format" };
    }
    // 校验 startTime < endTime
    if (startTime >= endTime) {
      return { success: false, error: "Start time must be before end time" };
    }
  }

  // ========== 日期范围校验 ==========

  const targetDate = date as string;
  const today = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");

  // 解析目标日期的年月
  const [targetYear, targetMonth] = targetDate.split("-").map(Number);
  const todayDayjs = dayjs().tz("Asia/Shanghai");
  const currentYear = todayDayjs.year();
  const currentMonth = todayDayjs.month() + 1;

  // 校验是否在当月
  if (targetYear !== currentYear || targetMonth !== currentMonth) {
    return { success: false, error: "Can only edit current month records" };
  }

  // 校验不能编辑未来日期
  if (targetDate > today) {
    return { success: false, error: "Cannot edit future dates" };
  }

  // ========== 工作日校验 ==========

  // 查询是否有节假日/调休配置
  const holidayRes = await db
    .collection("holidays")
    .where({
      date: targetDate,
    })
    .get();

  const holiday = holidayRes.data[0] as Holiday | undefined;

  // 判断是否是工作日
  let isWorkday = false;
  if (holiday?.type === "workday") {
    isWorkday = true;
  } else if (holiday?.type === "holiday") {
    isWorkday = false;
  } else if (!isWeekend(targetDate)) {
    isWorkday = true;
  }

  if (!isWorkday) {
    return { success: false, error: "Cannot edit rest days" };
  }

  // ========== 查询/更新记录 ==========

  const now = new Date();

  // 查询现有记录
  const recordRes = await db
    .collection("clock_records")
    .where({
      _openid: openid,
      date: targetDate,
    })
    .get();

  const existingRecord = recordRes.data[0] as ClockRecord | undefined;

  // 准备更新数据
  let startTimeDate: Date | null = null;
  let endTimeDate: Date | null = null;

  if (status === "normal") {
    startTimeDate = parseTimeString(startTime as string, targetDate);
    endTimeDate = parseTimeString(endTime as string, targetDate);
  }

  let record: ClockRecord;

  if (existingRecord) {
    // 更新现有记录
    await db
      .collection("clock_records")
      .doc(existingRecord._id!)
      .update({
        data: {
          startTime: startTimeDate,
          endTime: endTimeDate,
          startFrom: "clock",
          endFrom: "clock",
          status,
          updatedAt: now,
        },
      });

    record = {
      ...existingRecord,
      startTime: startTimeDate,
      endTime: endTimeDate,
      startFrom: "clock",
      endFrom: "clock",
      status,
      updatedAt: now,
    };
  } else {
    // 创建新记录
    const newRecord: Omit<ClockRecord, "_id"> = {
      _openid: openid,
      date: targetDate,
      startTime: startTimeDate,
      endTime: endTimeDate,
      startFrom: "clock",
      endFrom: "clock",
      status,
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
