#!/usr/bin/env node

/**
 * 配置迁移CLI工具
 * 用于将旧版配置文件迁移到统一路由格式
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { migrateConfig, generateMigrationReport } from './config-migrator';

const CONFIG_PATH = join(homedir(), '.claude-code-router', 'config.json');

async function main() {
  console.log('Claude Code Router 配置迁移工具');
  console.log('================================\n');

  try {
    // 读取配置文件
    const configContent = await readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configContent);

    // 执行迁移
    const { config: newConfig, migrated, errors } = migrateConfig(config, {
      autoMigrate: true,
      keepLegacy: true
    });

    if (!migrated) {
      console.log('✓ 配置已经是最新格式，无需迁移');
      return;
    }

    if (errors && errors.length > 0) {
      console.error('迁移过程中发生错误:');
      errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

    // 备份原配置
    const backupPath = join(homedir(), '.claude-code-router', `config.backup.${Date.now()}.json`);
    await writeFile(backupPath, configContent, 'utf-8');
    console.log(`✓ 原配置已备份到: ${backupPath}`);

    // 写入新配置
    await writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    console.log('✓ 新配置已保存');

    // 生成迁移报告
    const report = generateMigrationReport(config.Router, newConfig.Router);
    const reportPath = join(homedir(), '.claude-code-router', 'migration-report.md');
    await writeFile(reportPath, report, 'utf-8');
    console.log(`✓ 迁移报告已生成: ${reportPath}\n`);

    console.log('迁移完成！请检查新配置是否正确。');
    console.log('如需回滚，可以使用备份文件。');

  } catch (error: any) {
    console.error(`错误: ${error.message}`);
    process.exit(1);
  }
}

export { main as migrateConfigCLI };