import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useConfig } from "./ConfigProvider";
import { useConfigAdapter, useConfigUpdater } from "@/hooks/useConfigAdapter";
import type { UnifiedRouterConfig, RouteRule } from "@/types";
import { getRuleDisplayName } from "@/lib/configUtils";

export function UnifiedRouter() {
  const { t } = useTranslation();
  const { config, setConfig } = useConfig();
  const adaptedConfig = useConfigAdapter(config);
  const updateConfig = useConfigUpdater(config, setConfig);

  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  // 处理默认路由更改
  const handleDefaultRouteChange = (value: string) => {
    if (!adaptedConfig) return;
    const routerConfig = adaptedConfig.routerConfig as UnifiedRouterConfig;
    updateConfig({
      routerConfig: {
        ...routerConfig,
        defaultRoute: value
      }
    });
  };

  // 处理规则启用/禁用
  const handleRuleToggle = (ruleName: string, enabled: boolean) => {
    if (!adaptedConfig) return;
    const routerConfig = adaptedConfig.routerConfig as UnifiedRouterConfig;
    const updatedRules = routerConfig.rules.map(rule =>
      rule.name === ruleName ? { ...rule, enabled } : rule
    );
    updateConfig({
      routerConfig: {
        ...routerConfig,
        rules: updatedRules
      }
    });
  };

  // 处理规则路由更改
  const handleRuleRouteChange = (ruleName: string, route: string) => {
    if (!adaptedConfig) return;
    const routerConfig = adaptedConfig.routerConfig as UnifiedRouterConfig;
    const updatedRules = routerConfig.rules.map(rule =>
      rule.name === ruleName ? { ...rule, action: { ...rule.action, route } } : rule
    );
    updateConfig({
      routerConfig: {
        ...routerConfig,
        rules: updatedRules
      }
    });
  };

  // 切换规则展开状态
  const toggleRuleExpanded = (ruleName: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(ruleName)) {
      newExpanded.delete(ruleName);
    } else {
      newExpanded.add(ruleName);
    }
    setExpandedRules(newExpanded);
  };

  if (!adaptedConfig) {
    return (
      <Card className="flex h-full flex-col rounded-lg border shadow-sm">
        <CardHeader className="border-b p-4">
          <CardTitle className="text-lg">{t("router.unifiedTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center p-4">
          <div className="text-gray-500">Loading router configuration...</div>
        </CardContent>
      </Card>
    );
  }

  const routerConfig = adaptedConfig.routerConfig as UnifiedRouterConfig;
  const providers = adaptedConfig.providers;

  // 生成模型选项
  const modelOptions = providers.flatMap((provider) => {
    if (!provider || !provider.models) return [];
    const providerName = provider.name || "Unknown Provider";
    return provider.models.map((model: string) => ({
      value: `${providerName},${model}`,
      label: `${providerName}, ${model}`,
    }));
  });

  return (
    <Card className="flex h-full flex-col rounded-lg border shadow-sm">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-lg">{t("router.unifiedTitle")}</CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary">Unified Router Engine</Badge>
          <span className="text-sm text-gray-500">
            {routerConfig.rules.length} rules loaded
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-5 overflow-y-auto p-4">
        {/* 默认路由 */}
        <div className="space-y-2">
          <Label>{t("router.defaultRoute")}</Label>
          <select
            value={routerConfig.defaultRoute}
            onChange={(e) => handleDefaultRouteChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select a model</option>
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 路由规则 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">路由规则</Label>
            <Badge variant="outline">{routerConfig.rules.length} rules</Badge>
          </div>

          <div className="space-y-3">
            {routerConfig.rules.map((rule, index) => {
              const isExpanded = expandedRules.has(rule.name);
              return (
                <Card key={rule.name} className="border border-gray-200">
                  <Collapsible>
                    <CollapsibleTrigger
                      className="w-full"
                      onClick={() => toggleRuleExpanded(rule.name)}
                    >
                      <div className="flex items-center justify-between p-3 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="text-left">
                            <div className="font-medium text-sm">
                              {getRuleDisplayName(rule.name)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Priority: {rule.priority || 0} | Route: {rule.action.route}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.enabled !== false}
                            onCheckedChange={(checked) => {
                              e.stopPropagation();
                              handleRuleToggle(rule.name, checked);
                            }}
                          />
                          <Badge variant={rule.enabled !== false ? "default" : "secondary"}>
                            {rule.enabled !== false ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-3 border-t pt-3">
                        {/* 规则详情 */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">条件类型</Label>
                            <div className="text-sm text-gray-700 mt-1">
                              {rule.condition.type}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">优先级</Label>
                            <div className="text-sm text-gray-700 mt-1">
                              {rule.priority || 0}
                            </div>
                          </div>
                        </div>

                        {/* 路由配置 */}
                        <div>
                          <Label className="text-xs">路由目标</Label>
                          <select
                            value={rule.action.route}
                            onChange={(e) => handleRuleRouteChange(rule.name, e.target.value)}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                          >
                            <option value="">Select a model</option>
                            {modelOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 条件详情 */}
                        {rule.condition.value && (
                          <div>
                            <Label className="text-xs">条件值</Label>
                            <div className="text-sm text-gray-700 mt-1">
                              {rule.condition.operator} {rule.condition.value}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 缓存配置 */}
        <div className="space-y-3 border-t pt-4">
          <Label className="text-base font-medium">缓存设置</Label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">启用缓存</Label>
              <div className="text-sm text-gray-700 mt-1">
                {routerConfig.cache?.enabled !== false ? "Yes" : "No"}
              </div>
            </div>
            <div>
              <Label className="text-xs">最大大小</Label>
              <div className="text-sm text-gray-700 mt-1">
                {routerConfig.cache?.maxSize || 1000}
              </div>
            </div>
            <div>
              <Label className="text-xs">TTL (ms)</Label>
              <div className="text-sm text-gray-700 mt-1">
                {routerConfig.cache?.ttl || 300000}
              </div>
            </div>
          </div>
        </div>

        {/* 调试配置 */}
        <div className="space-y-3 border-t pt-4">
          <Label className="text-base font-medium">调试设置</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">启用调试</Label>
              <div className="text-sm text-gray-700 mt-1">
                {routerConfig.debug?.enabled ? "Yes" : "No"}
              </div>
            </div>
            <div>
              <Label className="text-xs">日志级别</Label>
              <div className="text-sm text-gray-700 mt-1">
                {routerConfig.debug?.logLevel || "info"}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
