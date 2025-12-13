/**
 * 配置迁移工具
 *
 * 用于将旧的路由配置自动迁移到统一路由格式
 */

import { LegacyRouterConfig, UnifiedRouterConfig } from '../types/router';
import { migrateLegacyConfig } from './unified-router';

export interface ConfigMigrationOptions {
  autoMigrate?: boolean; // 是否自动迁移
  keepLegacy?: boolean;  // 是否保留旧配置作为备份
  backupPath?: string;    // 备份文件路径
}

/**
 * 检查配置是否需要迁移
 */
export function needsMigration(config: any): boolean {
  // 如果已经是统一路由格式，不需要迁移
  if (config.Router && config.Router.engine === 'unified') {
    return false;
  }

  // 如果有旧的Router配置，需要迁移
  if (config.Router && (
    config.Router.default ||
    config.Router.background ||
    config.Router.think ||
    config.Router.longContext ||
    config.Router.webSearch
  )) {
    return true;
  }

  return false;
}

/**
 * 迁移配置到统一路由格式
 */
export function migrateConfig(
  config: any,
  options: ConfigMigrationOptions = {}
): { config: any; migrated: boolean; errors?: string[] } {
  const errors: string[] = [];
  let migrated = false;

  // 检查是否需要迁移
  if (!needsMigration(config)) {
    return { config, migrated: false };
  }

  try {
    // 保留原始配置的副本
    const originalConfig = JSON.parse(JSON.stringify(config));

    // 提取旧的路由配置
    const legacyRouter: LegacyRouterConfig = {
      default: config.Router?.default,
      background: config.Router?.background,
      think: config.Router?.think,
      longContext: config.Router?.longContext,
      webSearch: config.Router?.webSearch,
      longContextThreshold: config.Router?.longContextThreshold
    };

    // 迁移到统一路由配置
    const unifiedRouter = migrateLegacyConfig(legacyRouter);

    // 更新配置
    config.Router = unifiedRouter;

    // 如果需要保留旧配置
    if (options.keepLegacy) {
      config.LegacyRouter = legacyRouter;
    }

    migrated = true;

    console.log('✓ 配置迁移成功');
    console.log(`  - 生成 ${unifiedRouter.rules.length} 条路由规则`);
    console.log(`  - 默认路由: ${unifiedRouter.defaultRoute}`);

  } catch (error: any) {
    errors.push(`迁移失败: ${error.message}`);
    console.error('配置迁移失败:', error.message);
  }

  return { config, migrated, errors: errors.length > 0 ? errors : undefined };
}

/**
 * 生成迁移报告
 */
export function generateMigrationReport(
  originalConfig: any,
  newConfig: UnifiedRouterConfig
): string {
  const report = [];

  report.push('# 配置迁移报告');
  report.push('');
  report.push('## 原始配置');
  report.push('```json');
  report.push(JSON.stringify(originalConfig, null, 2));
  report.push('```');
  report.push('');

  report.push('## 统一路由配置');
  report.push('```json');
  report.push(JSON.stringify(newConfig, null, 2));
  report.push('```');
  report.push('');

  report.push('## 迁移详情');
  report.push('');
  report.push(`- 引擎类型: ${newConfig.engine}`);
  report.push(`- 默认路由: ${newConfig.defaultRoute}`);
  report.push(`- 规则数量: ${newConfig.rules.length}`);
  report.push(`- 缓存启用: ${newConfig.cache?.enabled !== false ? '是' : '否'}`);

  if (newConfig.contextThreshold) {
    report.push(`- 默认阈值: ${newConfig.contextThreshold.default}`);
    report.push(`- 长上下文阈值: ${newConfig.contextThreshold.longContext}`);
  }

  report.push('');
  report.push('### 路由规则详情');
  report.push('');

  for (const rule of newConfig.rules) {
    report.push(`#### ${rule.name}`);
    report.push(`- 优先级: ${rule.priority || 0}`);
    report.push(`- 启用状态: ${rule.enabled !== false ? '启用' : '禁用'}`);
    report.push(`- 条件类型: ${rule.condition.type}`);
    report.push(`- 目标路由: ${rule.action.route}`);
    report.push('');
  }

  return report.join('\n');
}