/**
 * 基于时间的路由规则
 * 根据当前时间决定使用不同的模型
 */

/**
 * 检查是否为工作时间
 * @param {RouteContext} context - 路由上下文
 * @returns {boolean} - 是否为工作时间
 */
function isBusinessHours(context) {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=周日, 1=周一, ..., 6=周六

  // 工作时间：周一到周五，9:00-18:00
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isWorkHour = hour >= 9 && hour < 18;

  const inBusinessHours = isWeekday && isWorkHour;

  console.log(`时间检查: ${now.toISOString()}, 小时: ${hour}, 星期${dayOfWeek}, 工作时间: ${inBusinessHours}`);

  return inBusinessHours;
}

/**
 * 检查是否为高峰时段
 * @param {RouteContext} context - 路由上下文
 * @returns {boolean} - 是否为高峰时段
 */
function isPeakHours(context) {
  const now = new Date();
  const hour = now.getHours();

  // 高峰时段：9:00-11:00 和 14:00-17:00
  const isMorningPeak = hour >= 9 && hour < 11;
  const isAfternoonPeak = hour >= 14 && hour < 17;

  const isPeakHours = isMorningPeak || isAfternoonPeak;

  console.log(`高峰时段检查: 当前${hour}点，高峰: ${isPeakHours}`);

  return isPeakHours;
}

// 导出多个函数
module.exports = {
  isBusinessHours,
  isPeakHours
};