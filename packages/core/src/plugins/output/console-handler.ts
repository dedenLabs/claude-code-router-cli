import { OutputHandler, OutputOptions, ConsoleOutputConfig } from './types';

/**
 * Console output handler
 * Supports colored output and multiple log levels
 */
export class ConsoleOutputHandler implements OutputHandler {
  type = 'console' as const;
  private config: ConsoleOutputConfig;

  // ANSI color codes
  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    orange: '\x1b[38;5;208m',  // Orange for high speed
    brightGreen: '\x1b[92m',   // Bright green for ultra speed
    pink: '\x1b[38;5;219m'     // Pink for super ultra speed
  };

  constructor(config: ConsoleOutputConfig = {}) {
    this.config = {
      colors: true,
      level: 'log',
      ...config
    };
  }

  /**
   * Format TPS (tokens per second) with visual indicator
   */
  private formatTPS(tps: number, useColors: boolean): string {
    // Speed thresholds (tokens/second)
    const SUPER_ULTRA_THRESHOLD = 120;  // 120+ tps = super ultra (pink)
    const ULTRA_THRESHOLD = 80;          // 80-120 tps = ultra (bright green)
    const FAST_THRESHOLD = 40;           // 40-80 tps = fast (orange)
    const MEDIUM_THRESHOLD = 20;         // 20-40 tps = medium (yellow)
    // Below 20 = slow (red)

    let speedLabel: string;
    let color: string;
    let bar: string;

    if (tps >= SUPER_ULTRA_THRESHOLD) {
      speedLabel = '💖 超级极速';
      color = useColors ? this.colors.pink : '';
    } else if (tps >= ULTRA_THRESHOLD) {
      speedLabel = '⚡ 极速';
      color = useColors ? this.colors.brightGreen : '';
    } else if (tps >= FAST_THRESHOLD) {
      speedLabel = '🚀 快速';
      color = useColors ? this.colors.orange : '';
    } else if (tps >= MEDIUM_THRESHOLD) {
      speedLabel = '🐢 中等';
      color = useColors ? this.colors.yellow : '';
    } else {
      speedLabel = '🦎 慢速';
      color = useColors ? this.colors.red : '';
    }

    // Create visual bar (max 10 characters)
    const barLength = Math.min(10, Math.ceil(tps / 12));
    bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);

    const reset = useColors ? this.colors.reset : '';
    const tpsStr = `${color}${tps}${reset}`;
    const barStr = `${color}${bar}${reset}`;
    const labelStr = `${color}${speedLabel}${reset}`;

    return `${tpsStr} tps | ${barStr} | ${labelStr}`;
  }

  /**
   * Format output data
   */
  private formatData(data: any, options: OutputOptions): string {
    const { format = 'text', timestamp = true, prefix, metadata } = options || {};

    // Build prefix
    let output = '';

    if (timestamp) {
      const time = new Date().toISOString();
      output += this.config.colors
        ? `${this.colors.cyan}[${time}]${this.colors.reset} `
        : `[${time}] `;
    }

    if (prefix) {
      output += this.config.colors
        ? `${this.colors.bright}${prefix}${this.colors.reset} `
        : `${prefix} `;
    }

    // Format data
    switch (format) {
      case 'json':
        output += JSON.stringify(data, null, 2);
        break;

      case 'markdown':
        if (typeof data === 'object') {
          output += this.toMarkdown(data);
        } else {
          output += String(data);
        }
        break;

      case 'text':
      default:
        if (typeof data === 'object') {
          output += JSON.stringify(data, null, 2);
        } else {
          output += String(data);
        }
        break;
    }

    // Add metadata
    if (metadata && Object.keys(metadata).length > 0) {
      output += '\n' + (this.config.colors ? `${this.colors.dim}` : '');
      output += 'Metadata: ' + JSON.stringify(metadata, null, 2);
      if (this.config.colors) output += this.colors.reset;
    }

    return output;
  }

  /**
   * Convert object to Markdown format
   */
  private toMarkdown(data: any, indent = 0): string {
    const padding = '  '.repeat(indent);

    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === 'object') {
          return `${padding}-\n${this.toMarkdown(item, indent + 1)}`;
        }
        return `${padding}- ${item}`;
      }).join('\n');
    }

    if (typeof data === 'object' && data !== null) {
      return Object.entries(data).map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${padding}${key}:\n${this.toMarkdown(value, indent + 1)}`;
        }
        return `${padding}${key}: ${value}`;
      }).join('\n');
    }

    return `${padding}${data}`;
  }

  /**
   * Check if data is token speed stats
   */
  private isTokenSpeedData(data: any): boolean {
    return data &&
      typeof data.tokensPerSecond === 'number' &&
      (data.tokenCount !== undefined || data.tps !== undefined);
  }

  /**
   * Format token speed data with visual indicator
   */
  private formatTokenSpeedData(data: any, options: OutputOptions): string {
    const useColors = this.config.colors;
    const isFinal = data.isFinal !== false;

    // Extract values
    const tps = data.tokensPerSecond ?? data.tps ?? 0;
    const tokenCount = data.tokenCount ?? 0;
    const duration = data.duration ?? 'N/A';
    const timeToFirstToken = data.timeToFirstToken ?? 'N/A';

    // Get prefix
    const prefix = options.prefix || '[Token 速度]';
    const prefixStr = useColors
      ? `${this.colors.bright}${this.colors.cyan}${prefix}${this.colors.reset}`
      : prefix;

    // Build TPS visualization
    const tpsVisual = this.formatTPS(tps, useColors);

    // Build output
    let output = '';

    // Summary line
    output += `${prefixStr} `;
    if (isFinal) {
      output += useColors ? `${this.colors.green}[完成]${this.colors.reset} ` : '[完成] ';
    }
    output += `Token: ${tokenCount} | Time: ${duration}`;
    if (timeToFirstToken !== 'N/A') {
      output += ` | TTFT: ${timeToFirstToken}`;
    }
    output += ` | ${tpsVisual}`;

    // Always end with newline
    output += '\n';

    return output;
  }

  /**
   * Output data
   */
  async output(data: any, options: OutputOptions = {}): Promise<boolean> {
    try {
      // Check if this is token speed data
      if (this.isTokenSpeedData(data)) {
        const formatted = this.formatTokenSpeedData(data, options);
        // Use process.stdout.write to control newline explicitly
        process.stdout.write(formatted);
        return true;
      }

      const formatted = this.formatData(data, options);
      const logMethod = this.config.level || 'log';

      // Output based on configured log level
      switch (logMethod) {
        case 'info':
          console.info(formatted);
          break;
        case 'warn':
          console.warn(formatted);
          break;
        case 'error':
          console.error(formatted);
          break;
        case 'debug':
          console.debug(formatted);
          break;
        case 'log':
        default:
          console.log(formatted);
          break;
      }

      return true;
    } catch (error) {
      console.error('[ConsoleOutputHandler] Output failed:', error);
      return false;
    }
  }
}
