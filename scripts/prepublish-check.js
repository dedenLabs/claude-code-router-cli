#!/usr/bin/env node

/**
 * 发布前检查脚本
 * 确保包发布前的必要条件都满足
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 执行发布前检查...');

// 1. 检查 package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// 2. 检查必要字段
const requiredFields = ['name', 'version', 'description', 'author', 'license'];
const missingFields = requiredFields.filter(field => !packageJson[field]);

if (missingFields.length > 0) {
  console.error('❌ 缺少必要字段:', missingFields.join(', '));
  process.exit(1);
}

// 3. 检查包名是否符合规范
if (!packageJson.name.startsWith('@')) {
  console.error('❌ 包名必须以 @ 开头');
  process.exit(1);
}

// 4. 检查版本号
if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) {
  console.error('❌ 版本号格式不正确');
  process.exit(1);
}

// 5. 检查作者信息
if (!packageJson.author || !packageJson.author.includes('<')) {
  console.error('❌ 作者信息不正确，应为 Name <email@example.com> 格式');
  process.exit(1);
}

// 6. 检查仓库信息
if (!packageJson.repository || !packageJson.repository.url) {
  console.error('❌ 缺少仓库信息');
  process.exit(1);
}

console.log('✅ 发布前检查通过');
console.log(`📦 包名: ${packageJson.name}`);
console.log(`📌 版本: ${packageJson.version}`);
console.log(`👤 作者: ${packageJson.author}`);
console.log(`🔗 仓库: ${packageJson.repository.url}`);