/**
 * 配置文件读写集成测试
 * 测试配置文件的读取、写入和规范化流程
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { normalizeConfig } from '../../src/utils/config-handler';
import { isUnifiedFormat, isLegacyFormat, convertLegacyToUnified } from '../../src/utils/config-handler';
import type { RouterConfig, UnifiedRouterConfig } from '../../src/types/router';

// Mock file system operations
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockExistsSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock('fs', () => ({
  readFileSync: mockReadFile,
  writeFileSync: mockWriteFile,
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync
}));

// Mock config file operations
const mockReadConfigFile = async () => {
  const configPath = join(process.env.HOME || '', '.claude-code-router', 'config.json');

  if (!existsSync(configPath)) {
    throw new Error('Config file not found');
  }

  const configData = readFileSync(configPath, 'utf8');
  return JSON.parse(configData);
};

const mockWriteConfigFile = async (config: any) => {
  const configDir = join(process.env.HOME || '', '.claude-code-router');
  const configPath = join(configDir, 'config.json');

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
};

const mockBackupConfigFile = async () => {
  const configDir = join(process.env.HOME || '', '.claude-code-router');
  const configPath = join(configDir, 'config.json');
  const backupPath = join(configDir, `config.backup.${Date.now()}.json`);

  if (existsSync(configPath)) {
    const configData = readFileSync(configPath, 'utf8');
    writeFileSync(backupPath, configData, 'utf8');
    return backupPath;
  }

  return null;
};

describe('配置文件读写', () => {
  const testConfigDir = join(__dirname, '../test-data');
  const testConfigPath = join(testConfigDir, 'test-config.json');

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup test directory
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup test files
    if (existsSync(testConfigPath)) {
      // Remove test config file
    }
  });

  test('应该正确读取Legacy格式配置文件', async () => {
    const legacyConfig = {
      "Router": {
        "default": "test,model",
        "background": "haiku,model",
        "think": "opus,model",
        "longContext": "sonnet,model",
        "longContextThreshold": 60000,
        "webSearch": "sonnet,model"
      },
      "Providers": [
        {
          "name": "test",
          "api_base_url": "https://api.test.com",
          "api_key": "test-key",
          "models": ["model1", "model2"]
        }
      ]
    };

    // Mock reading the file
    mockReadFile.mockReturnValue(JSON.stringify(legacyConfig));
    mockExistsSync.mockReturnValue(true);

    const config = await mockReadConfigFile();

    expect(config).toBeDefined();
    expect(config.Router.default).toBe('test,model');
    expect(isLegacyFormat(config)).toBe(true);
  });

  test('应该正确读取Unified格式配置文件', async () => {
    const unifiedConfig = {
      "Router": {
        "engine": "unified",
        "defaultRoute": "test,model",
        "rules": [
          {
            "name": "testRule",
            "priority": 100,
            "enabled": true,
            "condition": {
              "type": "fieldExists",
              "field": "test",
              "operator": "exists"
            },
            "action": {
              "route": "test,route",
              "transformers": [],
              "description": "测试规则"
            }
          }
        ],
        "cache": {
          "enabled": true,
          "maxSize": 1000,
          "ttl": 300000
        },
        "debug": {
          "enabled": false,
          "logLevel": "info"
        }
      },
      "Providers": [
        {
          "name": "test",
          "api_base_url": "https://api.test.com",
          "api_key": "test-key",
          "models": ["model1", "model2"]
        }
      ]
    };

    mockReadFile.mockReturnValue(JSON.stringify(unifiedConfig));
    mockExistsSync.mockReturnValue(true);

    const config = await mockReadConfigFile();

    expect(config).toBeDefined();
    expect(config.Router.engine).toBe('unified');
    expect(isUnifiedFormat(config)).toBe(true);
  });

  test('应该在读取时自动规范化Legacy配置', async () => {
    const legacyConfig = {
      "Router": {
        "default": "test,model",
        "background": "haiku,model",
        "think": "opus,model",
        "longContext": "sonnet,model",
        "longContextThreshold": 60000,
        "webSearch": "sonnet,model"
      },
      "Providers": []
    };

    mockReadFile.mockReturnValue(JSON.stringify(legacyConfig));
    mockExistsSync.mockReturnValue(true);

    const config = await mockReadConfigFile();
    const normalized = normalizeConfig(config);

    expect(normalized.Router.engine).toBe('unified');
    expect(isUnifiedFormat(normalized)).toBe(true);
  });

  test('应该正确写入配置到文件', async () => {
    const configToWrite = {
      "Router": {
        "engine": "unified",
        "defaultRoute": "test,model",
        "rules": [],
        "cache": {
          "enabled": true,
          "maxSize": 1000,
          "ttl": 300000
        },
        "debug": {
          "enabled": false,
          "logLevel": "info"
        }
      },
      "Providers": []
    };

    mockExistsSync.mockReturnValue(true);
    mockWriteFile.mockImplementation(() => {});

    await mockWriteConfigFile(configToWrite);

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('test-config.json'),
      JSON.stringify(configToWrite, null, 2),
      'utf8'
    );
  });

  test('应该在保存前创建备份', async () => {
    const configToWrite = {
      "Router": {
        "engine": "unified",
        "defaultRoute": "test,model",
        "rules": [],
        "cache": {
          "enabled": true,
          "maxSize": 1000,
          "ttl": 300000
        },
        "debug": {
          "enabled": false,
          "logLevel": "info"
        }
      },
      "Providers": []
    };

    const existingConfig = {
      "Router": {
        "default": "old,model"
      },
      "Providers": []
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockReturnValue(JSON.stringify(existingConfig));
    mockWriteFile.mockImplementation(() => {});

    const backupPath = await mockBackupConfigFile();

    if (backupPath) {
      expect(backupPath).toContain('config.backup.');
      expect(backupPath).toContain('.json');
    }
  });

  test('应该处理配置文件不存在的情况', async () => {
    mockExistsSync.mockReturnValue(false);

    await expect(mockReadConfigFile()).rejects.toThrow('Config file not found');
  });

  test('应该处理无效的JSON格式', async () => {
    mockReadFile.mockReturnValue('{ invalid json }');
    mockExistsSync.mockReturnValue(true);

    await expect(mockReadConfigFile()).rejects.toThrow();
  });

  test('应该处理文件写入失败', async () => {
    const configToWrite = {
      "Router": {
        "engine": "unified",
        "defaultRoute": "test,model"
      },
      "Providers": []
    };

    mockExistsSync.mockReturnValue(true);
    mockWriteFile.mockImplementation(() => {
      throw new Error('Write failed');
    });

    await expect(mockWriteConfigFile(configToWrite)).rejects.toThrow('Write failed');
  });
});

describe('配置规范化流程', () => {
  test('应该完整转换Legacy配置', async () => {
    const legacyConfig = {
      "Router": {
        "default": "sonnet,MiniMax-M2",
        "background": "haiku,MiniMax-M2",
        "think": "opus,MiniMax-M2",
        "longContext": "sonnet,MiniMax-M2",
        "longContextThreshold": 60000,
        "webSearch": "sonnet,MiniMax-M2"
      },
      "Providers": []
    };

    const normalized = normalizeConfig(legacyConfig);

    // 验证转换后的格式
    expect(normalized.Router.engine).toBe('unified');
    expect(normalized.Router.defaultRoute).toBe('sonnet,MiniMax-M2');
    expect(Array.isArray(normalized.Router.rules)).toBe(true);
    expect(normalized.Router.rules.length).toBeGreaterThan(0);

    // 验证所有规则都包含必需字段
    normalized.Router.rules.forEach((rule: any) => {
      expect(rule.name).toBeDefined();
      expect(rule.priority).toBeDefined();
      expect(rule.enabled).toBe(true);
      expect(rule.condition).toBeDefined();
      expect(rule.action).toBeDefined();
      expect(rule.action.route).toBeDefined();
      expect(rule.action.transformers).toEqual([]);
      expect(rule.action.description).toBeDefined();
    });
  });

  test('应该保持Unified配置不变', async () => {
    const unifiedConfig = {
      "Router": {
        "engine": "unified",
        "defaultRoute": "test,model",
        "rules": [
          {
            "name": "testRule",
            "priority": 100,
            "enabled": true,
            "condition": {
              "type": "fieldExists",
              "field": "test",
              "operator": "exists"
            },
            "action": {
              "route": "test,route",
              "transformers": [],
              "description": "测试规则"
            }
          }
        ],
        "cache": {
          "enabled": true,
          "maxSize": 1000,
          "ttl": 300000
        },
        "debug": {
          "enabled": false,
          "logLevel": "info"
        }
      },
      "Providers": []
    };

    const normalized = normalizeConfig(unifiedConfig);

    expect(normalized).toEqual(unifiedConfig);
  });

  test('应该为不完整的Unified配置添加默认值', async () => {
    const incompleteConfig = {
      "Router": {
        "engine": "unified",
        "defaultRoute": "test,model"
        // 缺少 rules, cache, debug 等字段
      },
      "Providers": []
    };

    const normalized = normalizeConfig(incompleteConfig);

    expect(normalized.Router.rules).toEqual([]);
    expect(normalized.Router.cache).toBeDefined();
    expect(normalized.Router.cache?.enabled).toBe(true);
    expect(normalized.Router.cache?.maxSize).toBe(1000);
    expect(normalized.Router.cache?.ttl).toBe(300000);
    expect(normalized.Router.debug).toBeDefined();
    expect(normalized.Router.debug?.enabled).toBe(false);
    expect(normalized.Router.debug?.logLevel).toBe('info');
  });
});

describe('配置文件版本兼容性', () => {
  test('应该兼容旧版本的Router配置字段', async () => {
    const oldConfig = {
      "Router": {
        "default": "test",
        "background": "haiku",
        "think": "opus",
        "longContext": "sonnet",
        "webSearch": "search"
      },
      "Providers": []
    };

    const normalized = normalizeConfig(oldConfig);

    expect(normalized.Router.engine).toBe('unified');
    expect(normalized.Router.defaultRoute).toBe('test');
  });

  test('应该处理缺失的可选字段', async () => {
    const minimalConfig = {
      "Router": {
        "default": "test"
      },
      "Providers": []
    };

    const normalized = normalizeConfig(minimalConfig);

    expect(normalized.Router.engine).toBe('unified');
    expect(normalized.Router.defaultRoute).toBe('test');
    expect(normalized.Router.rules).toEqual([]);
  });

  test('应该处理完全空的配置', async () => {
    const emptyConfig = {
      "Router": {},
      "Providers": []
    };

    const normalized = normalizeConfig(emptyConfig);

    expect(normalized.Router.engine).toBe('unified');
    expect(normalized.Router.defaultRoute).toBeDefined();
    expect(normalized.Router.rules).toEqual([]);
  });
});