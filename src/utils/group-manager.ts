/**
 * 组别管理器
 *
 * 管理路由实例的组别，支持负载均衡和健康检查
 */

import {
  IGroupManager,
  IInstanceManager,
  RouteInstance,
  InstanceManagerConfig,
  InstanceStatus,
  LoadBalancingStrategy
} from '../types/router';
import { Logger, createLogger } from './logger';

/**
 * 实例管理器
 */
export class InstanceManager implements IInstanceManager {
  private instances: Map<string, RouteInstance> = new Map();
  private config: InstanceManagerConfig;
  private logger: Logger;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: InstanceManagerConfig = {}) {
    this.config = {
      maxInstances: 10,
      healthCheckInterval: 30000, // 30秒
      healthCheckTimeout: 5000,    // 5秒
      recoveryTimeout: 60000,      // 1分钟
      loadBalancing: { type: 'round-robin' },
      ...config
    };

    this.logger = createLogger({
      enabled: true,
      logLevel: 'info',
      logToFile: false,
      logToConsole: true
    });

    // 启动健康检查
    this.startHealthCheck();
  }

  /**
   * 添加实例
   */
  addInstance(route: string, metadata?: Record<string, any>): string {
    // 检查实例数量限制
    if (this.instances.size >= this.config.maxInstances!) {
      throw new Error(`实例数量已达上限: ${this.config.maxInstances}`);
    }

    const instanceId = this.generateInstanceId();
    const instance: RouteInstance = {
      id: instanceId,
      route,
      status: 'healthy',
      connectionCount: 0,
      lastUsed: Date.now(),
      metadata
    };

    this.instances.set(instanceId, instance);
    this.logger.info(`添加实例: ${instanceId} -> ${route}`);

    return instanceId;
  }

  /**
   * 移除实例
   */
  removeInstance(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      // 先将实例设置为draining状态
      this.updateInstanceStatus(instanceId, 'draining');

      // 等待连接数降为0后移除
      const checkInterval = setInterval(() => {
        const currentInstance = this.instances.get(instanceId);
        if (!currentInstance || currentInstance.connectionCount === 0) {
          clearInterval(checkInterval);
          this.instances.delete(instanceId);
          this.logger.info(`移除实例: ${instanceId}`);
        }
      }, 1000);
    }
  }

  /**
   * 选择实例（负载均衡）
   */
  selectInstance(groupName?: string): RouteInstance | null {
    const healthyInstances = Array.from(this.instances.values())
      .filter(instance => instance.status === 'healthy');

    if (healthyInstances.length === 0) {
      this.logger.warn(`没有健康的实例可用`);
      return null;
    }

    let selectedInstance: RouteInstance;

    switch (this.config.loadBalancing?.type) {
      case 'least-connections':
        selectedInstance = healthyInstances.reduce((prev, current) =>
          (prev.connectionCount || 0) < (current.connectionCount || 0) ? prev : current
        );
        break;

      case 'random':
        selectedInstance = healthyInstances[Math.floor(Math.random() * healthyInstances.length)];
        break;

      case 'weighted':
        selectedInstance = this.selectWeightedInstance(healthyInstances);
        break;

      case 'round-robin':
      default:
        selectedInstance = this.selectRoundRobinInstance(healthyInstances);
        break;
    }

    // 更新使用信息
    selectedInstance.lastUsed = Date.now();
    selectedInstance.connectionCount = (selectedInstance.connectionCount || 0) + 1;

    this.logger.debug(`选择实例: ${selectedInstance.id} (${selectedInstance.route})`);

    return selectedInstance;
  }

  /**
   * 更新实例状态
   */
  updateInstanceStatus(instanceId: string, status: InstanceStatus): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.status = status;
      this.logger.debug(`更新实例状态: ${instanceId} -> ${status}`);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<void> {
    const promises = Array.from(this.instances.entries()).map(async ([instanceId, instance]) => {
      try {
        // 这里可以添加实际的健康检查逻辑
        // 例如发送ping请求或检查连接状态
        const isHealthy = await this.checkInstanceHealth(instance);

        if (isHealthy && instance.status === 'unhealthy') {
          this.updateInstanceStatus(instanceId, 'healthy');
          this.logger.info(`实例恢复健康: ${instanceId}`);
        } else if (!isHealthy && instance.status === 'healthy') {
          this.updateInstanceStatus(instanceId, 'unhealthy');
          this.logger.warn(`实例不健康: ${instanceId}`);
        }
      } catch (error: any) {
        this.logger.error(`健康检查失败 ${instanceId}: ${error.message}`);
        this.updateInstanceStatus(instanceId, 'unhealthy');
      }
    });

    await Promise.all(promises);
  }

  /**
   * 获取所有实例
   */
  getInstances(): RouteInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * 启动健康检查定时器
   */
  private startHealthCheck(): void {
    if (this.config.healthCheckInterval && this.config.healthCheckInterval > 0) {
      this.healthCheckTimer = setInterval(() => {
        this.healthCheck().catch(error => {
          this.logger.error(`健康检查失败: ${error.message}`);
        });
      }, this.config.healthCheckInterval);
    }
  }

  /**
   * 停止健康检查
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * 生成实例ID
   */
  private generateInstanceId(): string {
    return `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 轮询选择实例
   */
  private selectRoundRobinInstance(instances: RouteInstance[]): RouteInstance {
    // 简单实现：选择最久未使用的实例
    return instances.reduce((prev, current) =>
      (prev.lastUsed || 0) < (current.lastUsed || 0) ? prev : current
    );
  }

  /**
   * 加权选择实例
   */
  private selectWeightedInstance(instances: RouteInstance[]): RouteInstance {
    const weights = this.config.loadBalancing?.weights || {};
    const totalWeight = instances.reduce((sum, instance) => {
      return sum + (weights[instance.route] || 1);
    }, 0);

    let random = Math.random() * totalWeight;
    for (const instance of instances) {
      random -= weights[instance.route] || 1;
      if (random <= 0) {
        return instance;
      }
    }

    return instances[0];
  }

  /**
   * 检查实例健康状态
   */
  private async checkInstanceHealth(instance: RouteInstance): Promise<boolean> {
    // 这里可以实现具体的健康检查逻辑
    // 例如：发送测试请求、检查连接状态等

    // 简单实现：如果实例最近被使用过且没有错误，认为是健康的
    const now = Date.now();
    const lastUsedThreshold = this.config.recoveryTimeout || 60000;

    if (instance.lastUsed && (now - instance.lastUsed) < lastUsedThreshold) {
      return true;
    }

    // 检查连接数是否合理
    if (instance.connectionCount && instance.connectionCount > 100) {
      return false;
    }

    return true;
  }
}

/**
 * 组别管理器
 */
export class GroupManager implements IGroupManager {
  private groups: Map<string, { routes: string[]; instanceManager: InstanceManager }> = new Map();
  private routeToGroup: Map<string, string> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = createLogger({
      enabled: true,
      logLevel: 'info',
      logToFile: false,
      logToConsole: true
    });
  }

  /**
   * 添加组别
   */
  addGroup(name: string, routes: string[], config?: InstanceManagerConfig): void {
    const instanceManager = new InstanceManager(config);

    // 添加实例
    for (const route of routes) {
      instanceManager.addInstance(route);
      this.routeToGroup.set(route, name);
    }

    this.groups.set(name, {
      routes: [...routes],
      instanceManager
    });

    this.logger.info(`添加组别: ${name} (${routes.length} 个路由)`);
  }

  /**
   * 移除组别
   */
  removeGroup(name: string): void {
    const group = this.groups.get(name);
    if (group) {
      // 清理路由到组别的映射
      for (const route of group.routes) {
        this.routeToGroup.delete(route);
      }

      // 停止实例管理器
      group.instanceManager.stop();

      this.groups.delete(name);
      this.logger.info(`移除组别: ${name}`);
    }
  }

  /**
   * 更新组别
   */
  updateGroup(name: string, routes: string[], config?: InstanceManagerConfig): void {
    this.removeGroup(name);
    this.addGroup(name, routes, config);
  }

  /**
   * 获取组别信息
   */
  getGroup(name: string): any {
    const group = this.groups.get(name);
    if (!group) {
      return null;
    }

    return {
      name,
      routes: group.routes,
      instances: group.instanceManager.getInstances()
    };
  }

  /**
   * 从组别选择实例
   */
  selectInstance(groupName: string): RouteInstance | null {
    const group = this.groups.get(groupName);
    if (!group) {
      this.logger.warn(`组别不存在: ${groupName}`);
      return null;
    }

    return group.instanceManager.selectInstance(groupName);
  }

  /**
   * 根据路由获取组别
   */
  getGroupByRoute(route: string): string | null {
    return this.routeToGroup.get(route) || null;
  }

  /**
   * 获取所有组别
   */
  getGroups(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [name, group] of this.groups.entries()) {
      result[name] = this.getGroup(name);
    }
    return result;
  }

  /**
   * 清理所有资源
   */
  cleanup(): void {
    for (const group of this.groups.values()) {
      group.instanceManager.stop();
    }
    this.groups.clear();
    this.routeToGroup.clear();
  }
}