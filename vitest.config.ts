/**
 * Vitest 测试配置文件
 * 为项目提供完整的测试环境配置
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // 测试环境
    environment: 'node',
    // 测试文件模式
    include: [
      'tests/**/*.test.{ts,tsx}',
      'tests/**/*.spec.{ts,tsx}'
    ],
    // 排除的文件
    exclude: [
      'node_modules',
      'dist',
      'ui/node_modules',
      'ui/dist',
      '**/*.d.ts'
    ],
    // 全局测试设置
    globals: true,
    // 测试超时时间
    testTimeout: 30000,
    // 钩子超时时间
    hookTimeout: 10000,
    // 并行测试
    threads: true,
    // 测试顺序
    testOrder: 'asc',
    // 覆盖报告
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'ui/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/coverage/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    // 报告格式
    reporters: [
      'default',
      'verbose'
    ],
    // 输出目录
    outputDir: 'test-results',
    // 清理模拟
    clearMocks: true,
    // 恢复模拟
    restoreMocks: true,
    // 序列测试
    sequence: {
      shuffle: false,
      concurrent: false
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@ui': resolve(__dirname, './ui/src')
    }
  },
  esbuild: {
    target: 'node18',
    platform: 'node'
  }
});