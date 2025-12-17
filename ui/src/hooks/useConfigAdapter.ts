/**
 * 配置适配器 Hook
 * 用于在 UI 中处理新旧配置格式的转换
 */

import { useState, useEffect } from 'react';
import type { Config, UnifiedRouterConfig, RouterConfig, AnyRouterConfig } from '@/types';
import { isUnifiedFormat, convertLegacyToUnified } from '@/lib/configUtils';

// 配置适配器返回的数据结构
export interface AdaptedConfig {
  // 是否为统一格式
  isUnified: boolean;
  // 路由配置
  routerConfig: UnifiedRouterConfig | RouterConfig;
  // 提供商列表
  providers: any[];
  // 其他配置
  [key: string]: any;
}

// 配置适配器 Hook
export function useConfigAdapter(config: Config | null): AdaptedConfig | null {
  const [adaptedConfig, setAdaptedConfig] = useState<AdaptedConfig | null>(null);

  useEffect(() => {
    if (!config) {
      setAdaptedConfig(null);
      return;
    }

    // 检测路由配置格式
    const isUnified = isUnifiedFormat(config.Router);
    let adaptedRouterConfig: UnifiedRouterConfig | RouterConfig;

    if (isUnified) {
      // 已经是统一格式，直接使用
      adaptedRouterConfig = config.Router as UnifiedRouterConfig;
    } else {
      // 旧格式，转换为统一格式
      adaptedRouterConfig = convertLegacyToUnified(config.Router as RouterConfig);
    }

    setAdaptedConfig({
      isUnified,
      routerConfig: adaptedRouterConfig,
      providers: config.Providers || [],
      ...config
    });
  }, [config]);

  return adaptedConfig;
}

// 更新配置的 Hook
export function useConfigUpdater(
  currentConfig: Config | null,
  setConfig: (config: Config) => void
) {
  const updateConfig = (updates: Partial<AdaptedConfig>) => {
    if (!currentConfig) return;

    const newConfig = { ...currentConfig };

    // 更新路由配置
    if (updates.routerConfig) {
      newConfig.Router = updates.routerConfig;
    }

    // 更新提供商
    if (updates.providers) {
      newConfig.Providers = updates.providers;
    }

    // 更新其他字段
    Object.keys(updates).forEach(key => {
      if (!['isUnified', 'routerConfig', 'providers'].includes(key)) {
        (newConfig as any)[key] = (updates as any)[key];
      }
    });

    setConfig(newConfig);
  };

  return updateConfig;
}
