"use strict";
// 使用 got 或 axios 的替代方案，云函数环境下使用内置的 http 模版
const http = require("node:http");
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
// HTTP GET 请求封装
function httpGet(url) {
    return new Promise((resolve, reject) => {
        http
            .get(url, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                resolve(data);
            });
        })
            .on("error", (err) => {
            reject(err);
        });
    });
}
// 云函数入口函数
exports.main = async (event) => {
    // 如果没有传入 year 参数（定时触发器触发），使用下一年
    const year = event.year ?? new Date().getFullYear() + 1;
    // 从 timor.tech API 获取节假日数据
    // API 文档: http://timor.tech/api/holiday/
    const url = `http://timor.tech/api/holiday/year/${year}`;
    console.log("开始同步节假日数据, year:", year, "url:", url);
    try {
        const responseText = await httpGet(url);
        console.log("API 响应:", responseText.substring(0, 200));
        const response = JSON.parse(responseText);
        if (response.code !== 0) {
            console.error("API 返回错误:", response);
            return {
                success: false,
                error: `API returned error code: ${response.code}`,
            };
        }
        const holidays = [];
        // 解析 API 返回的数据
        for (const [dateStr, info] of Object.entries(response.holiday)) {
            // dateStr 格式: "01-01" 或 "01-24"
            const [month, day] = dateStr.split("-").map(Number);
            const date = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`).format("YYYY-MM-DD");
            holidays.push({
                date,
                year,
                type: info.holiday ? "holiday" : "workday",
                name: info.name,
            });
        }
        console.log("解析到节假日数据条数:", holidays.length);
        // 清除该年份的旧数据
        try {
            await db
                .collection("holidays")
                .where({
                year,
            })
                .remove();
            console.log("已清除旧数据");
        }
        catch (e) {
            console.log("清除旧数据失败（可能不存在）:", e);
        }
        // 批量插入新数据
        let count = 0;
        for (const holiday of holidays) {
            try {
                await db.collection("holidays").add({
                    data: holiday,
                });
                count++;
            }
            catch (e) {
                console.error("插入数据失败:", holiday, e);
            }
        }
        console.log("同步完成, 插入条数:", count);
        return {
            success: true,
            year,
            count,
        };
    }
    catch (error) {
        console.error("同步节假日失败:", error);
        return {
            success: false,
            error: String(error),
        };
    }
};
