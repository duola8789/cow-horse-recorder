function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_with_holes(arr) {
    if (Array.isArray(arr)) return arr;
}
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _async_to_generator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
function _iterable_to_array_limit(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];
    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;
    var _s, _e;
    try {
        for(_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true){
            _arr.push(_s.value);
            if (i && _arr.length === i) break;
        }
    } catch (err) {
        _d = true;
        _e = err;
    } finally{
        try {
            if (!_n && _i["return"] != null) _i["return"]();
        } finally{
            if (_d) throw _e;
        }
    }
    return _arr;
}
function _non_iterable_rest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _sliced_to_array(arr, i) {
    return _array_with_holes(arr) || _iterable_to_array_limit(arr, i) || _unsupported_iterable_to_array(arr, i) || _non_iterable_rest();
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
function _ts_generator(thisArg, body) {
    var f, y, t, _ = {
        label: 0,
        sent: function() {
            if (t[0] & 1) throw t[1];
            return t[1];
        },
        trys: [],
        ops: []
    }, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype), d = Object.defineProperty;
    return d(g, "next", {
        value: verb(0)
    }), d(g, "throw", {
        value: verb(1)
    }), d(g, "return", {
        value: verb(2)
    }), typeof Symbol === "function" && d(g, Symbol.iterator, {
        value: function() {
            return this;
        }
    }), g;
    function verb(n) {
        return function(v) {
            return step([
                n,
                v
            ]);
        };
    }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while(g && (g = 0, op[0] && (_ = 0)), _)try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [
                op[0] & 2,
                t.value
            ];
            switch(op[0]){
                case 0:
                case 1:
                    t = op;
                    break;
                case 4:
                    _.label++;
                    return {
                        value: op[1],
                        done: false
                    };
                case 5:
                    _.label++;
                    y = op[1];
                    op = [
                        0
                    ];
                    continue;
                case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                        _ = 0;
                        continue;
                    }
                    if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                        _.label = op[1];
                        break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                        _.label = t[1];
                        t = op;
                        break;
                    }
                    if (t && _.label < t[2]) {
                        _.label = t[2];
                        _.ops.push(op);
                        break;
                    }
                    if (t[2]) _.ops.pop();
                    _.trys.pop();
                    continue;
            }
            op = body.call(thisArg, _);
        } catch (e) {
            op = [
                6,
                e
            ];
            y = 0;
        } finally{
            f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
}
// 云函数入口文件
var cloud = require("wx-server-sdk");
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
});
var db = cloud.database();
var _ = db.command;
// 获取今天 00:00:00 的时间
function getToday() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
// 判断是否是周末
function isWeekend(date) {
    var day = date.getDay();
    return day === 0 || day === 6;
}
// 格式化日期为 YYYY-MM-DD (用作 Map key，确保时间戳对比一致)
function formatDateKey(date) {
    var d = new Date(date);
    return "".concat(d.getFullYear(), "-").concat(String(d.getMonth() + 1).padStart(2, "0"), "-").concat(String(d.getDate()).padStart(2, "0"));
}
// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return "".concat(year, "-").concat(month, "-").concat(day);
}
// 格式化时间为 HH:mm
function formatTime(date) {
    if (!date) return null;
    var d = new Date(date);
    var hours = String(d.getHours()).padStart(2, "0");
    var minutes = String(d.getMinutes()).padStart(2, "0");
    return "".concat(hours, ":").concat(minutes);
}
// 解析时间字符串 "HH:mm" 到当天的 Date
function parseTimeToDate(timeStr, baseDate) {
    var _timeStr_split_map = _sliced_to_array(timeStr.split(":").map(Number), 2), hours = _timeStr_split_map[0], minutes = _timeStr_split_map[1];
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes);
}
// 计算两个时间之间的分钟数
function diffMinutes(start, end) {
    return Math.round((end.getTime() - start.getTime()) / 1000 / 60);
}
// 云函数入口函数
exports.main = function(event) {
    return _async_to_generator(function() {
        var wxContext, openid, year, month, today, monthStart, monthEnd, userRes, user, defaultStartTime, defaultEndTime, holidayRes, holidays, holidayMap, recordRes, clockRecords, recordMap, dailyRecords, current, totalMinutes, recordedDays, totalWorkDays, statsEndDate, dateKey, holidayType, clockRecord, isCurrentToday, isWorkday, status, startTime, endTime, startFrom, endFrom, hours, minutes, hasStartClock, hasEndClock, actualStartTime, actualEndTime, mins, actualStartTime1, actualEndTime1, mins1, totalHours, avgHoursPerDay;
        return _ts_generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    wxContext = cloud.getWXContext();
                    openid = wxContext.OPENID;
                    year = event.year, month = event.month;
                    // P2 fix: 参数校验
                    if (!year || !month || typeof year !== "number" || typeof month !== "number" || month < 1 || month > 12) {
                        return [
                            2,
                            {
                                success: false,
                                error: "Invalid year or month"
                            }
                        ];
                    }
                    today = getToday();
                    monthStart = new Date(year, month - 1, 1);
                    monthEnd = new Date(year, month, 0); // 月末
                    return [
                        4,
                        db.collection("users").where({
                            _openid: openid
                        }).get()
                    ];
                case 1:
                    userRes = _state.sent();
                    user = userRes.data[0];
                    defaultStartTime = (user === null || user === void 0 ? void 0 : user.defaultStartTime) || "09:30";
                    defaultEndTime = (user === null || user === void 0 ? void 0 : user.defaultEndTime) || "18:30";
                    return [
                        4,
                        db.collection("holidays").where({
                            date: _.gte(monthStart).and(_.lte(monthEnd))
                        }).get()
                    ];
                case 2:
                    holidayRes = _state.sent();
                    holidays = holidayRes.data;
                    // P1 fix: 使用日期字符串作为 Map key，避免时间戳对比问题
                    holidayMap = new Map(holidays.map(function(h) {
                        return [
                            formatDateKey(h.date),
                            h.type
                        ];
                    }));
                    return [
                        4,
                        db.collection("clock_records").where({
                            _openid: openid,
                            date: _.gte(monthStart).and(_.lte(monthEnd))
                        }).get()
                    ];
                case 3:
                    recordRes = _state.sent();
                    clockRecords = recordRes.data;
                    // P1 fix: 使用日期字符串作为 Map key
                    recordMap = new Map(clockRecords.map(function(r) {
                        return [
                            formatDateKey(r.date),
                            r
                        ];
                    }));
                    // 构建每日记录
                    dailyRecords = [];
                    current = new Date(monthStart);
                    // 用于计算汇总统计
                    totalMinutes = 0;
                    recordedDays = 0;
                    totalWorkDays = 0;
                    // T+1: 统计截止到昨天
                    statsEndDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                    while(current <= monthEnd){
                        dateKey = formatDateKey(current);
                        holidayType = holidayMap.get(dateKey);
                        clockRecord = recordMap.get(dateKey);
                        isCurrentToday = current.getTime() === today.getTime();
                        // 判断是否是工作日
                        isWorkday = false;
                        if (holidayType === "workday") {
                            isWorkday = true;
                        } else if (holidayType === "holiday") {
                            isWorkday = false;
                        } else if (!isWeekend(current)) {
                            isWorkday = true;
                        }
                        // 计算状态
                        status = void 0;
                        startTime = null;
                        endTime = null;
                        startFrom = null;
                        endFrom = null;
                        hours = null;
                        minutes = null;
                        if (isCurrentToday) {
                            // 今天
                            status = "today";
                            if (clockRecord) {
                                startTime = formatTime(clockRecord.startTime);
                                endTime = formatTime(clockRecord.endTime);
                                startFrom = clockRecord.startTime ? "clock" : null;
                                endFrom = clockRecord.endTime ? "clock" : null;
                            }
                        } else if (!isWorkday) {
                            // 休息日
                            status = "rest";
                        } else if ((clockRecord === null || clockRecord === void 0 ? void 0 : clockRecord.status) === "leave") {
                            // 请假
                            status = "leave";
                        } else if (clockRecord) {
                            // 有打卡记录
                            hasStartClock = !!clockRecord.startTime;
                            hasEndClock = !!clockRecord.endTime;
                            if (hasStartClock && hasEndClock) {
                                status = "recorded";
                            } else if (hasStartClock || hasEndClock) {
                                status = "partial";
                            } else {
                                status = "default";
                            }
                            // 使用打卡时间或默认时间
                            actualStartTime = clockRecord.startTime ? new Date(clockRecord.startTime) : parseTimeToDate(defaultStartTime, current);
                            actualEndTime = clockRecord.endTime ? new Date(clockRecord.endTime) : parseTimeToDate(defaultEndTime, current);
                            startTime = formatTime(actualStartTime);
                            endTime = formatTime(actualEndTime);
                            startFrom = clockRecord.startTime ? "clock" : "default";
                            endFrom = clockRecord.endTime ? "clock" : "default";
                            // 计算工时
                            mins = diffMinutes(actualStartTime, actualEndTime);
                            if (mins > 0) {
                                minutes = mins;
                                hours = Math.round(mins / 60 * 100) / 100;
                            }
                        } else {
                            // 工作日但无打卡记录，使用默认时间
                            status = "default";
                            startTime = defaultStartTime;
                            endTime = defaultEndTime;
                            startFrom = "default";
                            endFrom = "default";
                            actualStartTime1 = parseTimeToDate(defaultStartTime, current);
                            actualEndTime1 = parseTimeToDate(defaultEndTime, current);
                            mins1 = diffMinutes(actualStartTime1, actualEndTime1);
                            if (mins1 > 0) {
                                minutes = mins1;
                                hours = Math.round(mins1 / 60 * 100) / 100;
                            }
                        }
                        // 统计汇总（只统计到昨天的工作日）
                        if (isWorkday && current <= statsEndDate && status !== "leave" && status !== "today") {
                            totalWorkDays++;
                            if ((clockRecord === null || clockRecord === void 0 ? void 0 : clockRecord.startTime) || (clockRecord === null || clockRecord === void 0 ? void 0 : clockRecord.endTime)) {
                                recordedDays++;
                            }
                            if (minutes !== null) {
                                totalMinutes += minutes;
                            }
                        }
                        dailyRecords.push({
                            date: formatDate(current),
                            day: current.getDate(),
                            dayOfWeek: current.getDay(),
                            isWorkday: isWorkday,
                            isToday: isCurrentToday,
                            status: status,
                            startTime: startTime,
                            endTime: endTime,
                            startFrom: startFrom,
                            endFrom: endFrom,
                            defaultStartTime: defaultStartTime,
                            defaultEndTime: defaultEndTime,
                            hours: hours,
                            minutes: minutes
                        });
                        current.setDate(current.getDate() + 1);
                    }
                    // 按日期倒序排列
                    dailyRecords.reverse();
                    // 计算汇总统计
                    totalHours = Math.round(totalMinutes / 60 * 100) / 100;
                    avgHoursPerDay = totalWorkDays > 0 ? Math.round(totalMinutes / 60 / totalWorkDays * 100) / 100 : 0;
                    return [
                        2,
                        {
                            success: true,
                            year: year,
                            month: month,
                            records: dailyRecords,
                            summary: {
                                totalWorkDays: totalWorkDays,
                                recordedDays: recordedDays,
                                totalHours: totalHours,
                                avgHoursPerDay: avgHoursPerDay
                            }
                        }
                    ];
            }
        });
    })();
};

