/**
 * 统一日志系统
 * 
 * 功能：
 * 1. 支持多级别日志（debug, info, warn, error）
 * 2. 控制台输出（用户友好格式）
 * 3. 文件输出（详细日志）
 * 4. 配置化控制
 */

import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  enabled: boolean;
  logLevel: LogLevel;
  logToFile?: boolean;
  logToConsole?: boolean;
  logDir?: string;
}

export interface LogContext {
  [key: string]: any;
}

/**
 * 日志工具类
 */
export class Logger {
  private config: LoggerConfig;
  private logFilePath?: string;
  private logLevels: { [key in LogLevel]: number } = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor(config: LoggerConfig) {
    this.config = {
      logToFile: true,
      logToConsole: true,
      logDir: path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude-code-router', 'logs'),
      ...config
    };

    // 初始化日志文件
    if (this.config.logToFile && this.config.enabled) {
      this.initLogFile();
    }
  }

  /**
   * 初始化日志文件
   */
  private initLogFile(): void {
    try {
      if (!this.config.logDir) return;

      // 确保日志目录存在
      if (!fs.existsSync(this.config.logDir)) {
        fs.mkdirSync(this.config.logDir, { recursive: true });
      }

      // 生成日志文件名: router-YYYYMMDDHHMMSS.log
      const now = new Date();
      const timestamp = now.toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '')
        .split('.')[0];
      
      this.logFilePath = path.join(this.config.logDir, `router-${timestamp}.log`);

      // 写入日志头
      const header = `=== Claude Code Router Log ===\nStarted at: ${now.toLocaleString()}\n\n`;
      fs.writeFileSync(this.logFilePath, header, 'utf-8');
    } catch (error) {
      console.error('Failed to initialize log file:', error);
    }
  }

  /**
   * 检查日志级别是否应该输出
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return this.logLevels[level] >= this.logLevels[this.config.logLevel];
  }

  /**
   * 格式化时间戳
   */
  private formatTimestamp(): string {
    const now = new Date();
    return now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * 格式化日志消息（控制台）- 用户友好格式
   */
  private formatConsoleMessage(level: LogLevel, message: string, context?: LogContext): string {
    const emoji = {
      debug: '🔍',
      info: '',
      warn: '⚠️',
      error: '❌'
    };

    const levelUpper = level.toUpperCase();
    
    // info级别使用简洁格式，其他级别显示更多细节
    if (level === 'info') {
      return `${emoji[level]} ${message}`;
    } else {
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      return `${emoji[level]} [${levelUpper}] ${message}${contextStr}`;
    }
  }

  /**
   * 格式化日志消息（文件）- 详细格式
   */
  private formatFileMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = this.formatTimestamp();
    const levelUpper = level.toUpperCase().padEnd(5);
    const contextStr = context ? `\nContext: ${JSON.stringify(context, null, 2)}` : '';
    return `[${timestamp}] [${levelUpper}] ${message}${contextStr}\n`;
  }

  /**
   * 写入日志文件
   */
  private writeToFile(message: string): void {
    if (!this.logFilePath || !this.config.logToFile) return;

    try {
      fs.appendFileSync(this.logFilePath, message, 'utf-8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * 核心日志方法
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    // 控制台输出
    if (this.config.logToConsole) {
      const consoleMsg = this.formatConsoleMessage(level, message, context);
      switch (level) {
        case 'error':
          console.error(consoleMsg);
          break;
        case 'warn':
          console.warn(consoleMsg);
          break;
        default:
          console.log(consoleMsg);
      }
    }

    // 文件输出
    if (this.config.logToFile) {
      const fileMsg = this.formatFileMessage(level, message, context);
      this.writeToFile(fileMsg);
    }
  }

  /**
   * Debug级别日志
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Info级别日志 - 用户友好的关键信息
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Warn级别日志
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Error级别日志
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 如果启用文件日志且还没有初始化，则初始化
    if (config.logToFile && !this.logFilePath && this.config.enabled) {
      this.initLogFile();
    }
  }

  /**
   * 获取日志文件路径
   */
  getLogFilePath(): string | undefined {
    return this.logFilePath;
  }
}

/**
 * 创建logger实例的工厂函数
 */
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

export default Logger;
