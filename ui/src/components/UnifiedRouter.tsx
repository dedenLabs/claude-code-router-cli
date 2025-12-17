import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Edit, Save, X } from "lucide-react";
import { useConfig } from "./ConfigProvider";
import { useConfigAdapter, useConfigUpdater } from "@/hooks/useConfigAdapter";
import type { UnifiedRouterConfig, RouteRule } from "@/types";
import { getRuleDisplayName } from "@/lib/configUtils";
import { RouteTargetInput } from "./RouteTargetInput";

export function UnifiedRouter() {
  const { t } = useTranslation();
  const { config, setConfig } = useConfig();
  const adaptedConfig = useConfigAdapter(config);
  const updateConfig = useConfigUpdater(config, setConfig);

  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [isAddRuleDialogOpen, setIsAddRuleDialogOpen] = useState(false);
  const [isEditRuleDialogOpen, setIsEditRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RouteRule | null>(null);
  const [newRule, setNewRule] = useState<Partial<RouteRule>>({
    name: "",
    priority: 10,
    enabled: true,
    condition: {
      type: "fieldExists",
      field: "",
      operator: "exists",
    },
    action: {
      route: "",
      transformers: [],
      description: "",
    },
  });

  // 处理默认路由更改
  const handleDefaultRouteChange = (value: string) => {
    if (!adaptedConfig) return;
    const routerConfig = adaptedConfig.routerConfig as UnifiedRouterConfig;
    updateConfig({
      routerConfig: {
        ...routerConfig,
        defaultRoute: value,
      },
    });
  };

  // 处理规则启用/禁用
  const handleRuleToggle = (ruleName: string, enabled: boolean) => {
    if (!adaptedConfig) return;
    const routerConfig = adaptedConfig.routerConfig as UnifiedRouterConfig;
    const updatedRules = routerConfig.rules.map((rule) =>
      rule.name === ruleName ? { ...rule, enabled } : rule,
    );
    updateConfig({
      routerConfig: {
        ...routerConfig,
        rules: updatedRules,
      },
    });
  };

  // 处理规则路由更改
  const handleRuleRouteChange = (ruleName: string, route: string) => {
    if (!adaptedConfig) return;
    const routerConfig = adaptedConfig.routerConfig as UnifiedRouterConfig;
    const updatedRules = routerConfig.rules.map((rule) =>
      rule.name === ruleName
        ? { ...rule, action: { ...rule.action, route } }
        : rule,
    );
    updateConfig({
      routerConfig: {
        ...routerConfig,
        rules: updatedRules,
      },
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

  // 处理添加规则
  const handleAddRule = () => {
    if (!adaptedConfig) return;
    const routerConfig = adaptedConfig.routerConfig as UnifiedRouterConfig;

    if (!newRule.name || !newRule.action?.route) {
      return;
    }

    const ruleToAdd: RouteRule = {
      name: newRule.name!,
      priority: newRule.priority || 10,
      enabled: newRule.enabled !== false,
      condition: newRule.condition!,
      action: {
        route: newRule.action!.route!,
        transformers: newRule.action!.transformers || [],
        description: newRule.action!.description || "",
      },
    };

    updateConfig({
      routerConfig: {
        ...routerConfig,
        rules: [...routerConfig.rules, ruleToAdd],
      },
    });

    // 重置新规则状态
    setNewRule({
      name: "",
      priority: 10,
      enabled: true,
      condition: {
        type: "fieldExists",
        field: "",
        operator: "exists",
      },
      action: {
        route: "",
        transformers: [],
        description: "",
      },
    });
    setIsAddRuleDialogOpen(false);
  };

  // 处理编辑规则
  const handleEditRule = (rule: RouteRule) => {
    setEditingRule(rule);
    setNewRule(rule);
    setIsEditRuleDialogOpen(true);
  };

  // 处理更新规则
  const handleUpdateRule = () => {
    if (!adaptedConfig || !editingRule) return;
    const routerConfig = adaptedConfig.routerConfig as UnifiedRouterConfig;

    if (!newRule.name || !newRule.action?.route) {
      return;
    }

    const updatedRules = routerConfig.rules.map((rule) =>
      rule.name === editingRule.name
        ? {
            name: newRule.name!,
            priority: newRule.priority || 10,
            enabled: newRule.enabled !== false,
            condition: newRule.condition!,
            action: {
              route: newRule.action!.route!,
              transformers: newRule.action!.transformers || [],
              description: newRule.action!.description || "",
            },
          }
        : rule,
    );

    updateConfig({
      routerConfig: {
        ...routerConfig,
        rules: updatedRules,
      },
    });

    setIsEditRuleDialogOpen(false);
    setEditingRule(null);
    setNewRule({
      name: "",
      priority: 10,
      enabled: true,
      condition: {
        type: "fieldExists",
        field: "",
        operator: "exists",
      },
      action: {
        route: "",
        transformers: [],
        description: "",
      },
    });
  };

  // 处理删除规则
  const handleDeleteRule = (ruleName: string) => {
    if (!adaptedConfig) return;
    const routerConfig = adaptedConfig.routerConfig as UnifiedRouterConfig;

    const updatedRules = routerConfig.rules.filter((rule) => rule.name !== ruleName);

    updateConfig({
      routerConfig: {
        ...routerConfig,
        rules: updatedRules,
      },
    });
  };

  // 取消编辑/添加
  const handleCancelEdit = () => {
    setIsAddRuleDialogOpen(false);
    setIsEditRuleDialogOpen(false);
    setEditingRule(null);
    setNewRule({
      name: "",
      priority: 10,
      enabled: true,
      condition: {
        type: "fieldExists",
        field: "",
        operator: "exists",
      },
      action: {
        route: "",
        transformers: [],
        description: "",
      },
    });
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

    const options = [];

    // 添加模型代号选项（只显示厂商名）
    options.push({
      value: providerName,
      label: `${providerName} (模型自动选择)`,
    });

    // 添加具体模型选项
    provider.models.forEach((model: string) => {
      options.push({
        value: `${providerName},${model}`,
        label: `${providerName}, ${model}`,
      });
    });

    return options;
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
          <RouteTargetInput
            value={routerConfig.defaultRoute}
            onChange={handleDefaultRouteChange}
            modelOptions={modelOptions}
            placeholder="选择默认路由目标"
          />
        </div>

        {/* 路由规则 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">路由规则</Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{routerConfig.rules.length} rules</Badge>
              <Button
                size="sm"
                onClick={() => setIsAddRuleDialogOpen(true)}
                className="h-8"
              >
                <Plus className="mr-1 h-4 w-4" />
                添加规则
              </Button>
            </div>
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
                              Priority: {rule.priority || 0} | Route:{" "}
                              {rule.action.route}
                            </div>
                            {rule.action.description && (
                              <div className="text-xs text-blue-600 mt-1">
                                {rule.action.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.enabled !== false}
                            onCheckedChange={(checked) => {
                              handleRuleToggle(rule.name, checked);
                            }}
                          />
                          <Badge
                            variant={
                              rule.enabled !== false ? "default" : "secondary"
                            }
                          >
                            {rule.enabled !== false ? "Enabled" : "Disabled"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRule(rule)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.name)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                          <div className="mt-1">
                            <RouteTargetInput
                              value={rule.action.route}
                              onChange={(value) => handleRuleRouteChange(rule.name, value)}
                              modelOptions={modelOptions}
                              placeholder="选择路由目标"
                            />
                          </div>
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

                        {/* 规则描述 */}
                        {rule.action.description && (
                          <div>
                            <Label className="text-xs">规则描述</Label>
                            <div className="text-sm text-gray-700 mt-1">
                              {rule.action.description}
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
              <select
                value={routerConfig.cache?.enabled !== false ? "Yes" : "No"}
                onChange={(e) => {
                  const enabled = e.target.value === "Yes";
                  updateConfig({
                    routerConfig: {
                      ...routerConfig,
                      cache: {
                        ...routerConfig.cache,
                        enabled
                      }
                    }
                  });
                }}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs mt-1"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">最大大小</Label>
              <Input
                type="number"
                value={routerConfig.cache?.maxSize || 1000}
                onChange={(e) => {
                  const maxSize = parseInt(e.target.value) || 1000;
                  updateConfig({
                    routerConfig: {
                      ...routerConfig,
                      cache: {
                        ...routerConfig.cache,
                        maxSize
                      }
                    }
                  });
                }}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">TTL (ms)</Label>
              <Input
                type="number"
                value={routerConfig.cache?.ttl || 300000}
                onChange={(e) => {
                  const ttl = parseInt(e.target.value) || 300000;
                  updateConfig({
                    routerConfig: {
                      ...routerConfig,
                      cache: {
                        ...routerConfig.cache,
                        ttl
                      }
                    }
                  });
                }}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>
        </div>

        {/* 调试配置 */}
        <div className="space-y-3 border-t pt-4">
          <Label className="text-base font-medium">调试设置</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">启用调试</Label>
              <select
                value={routerConfig.debug?.enabled ? "Yes" : "No"}
                onChange={(e) => {
                  const enabled = e.target.value === "Yes";
                  updateConfig({
                    routerConfig: {
                      ...routerConfig,
                      debug: {
                        ...routerConfig.debug,
                        enabled
                      }
                    }
                  });
                }}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs mt-1"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">日志级别</Label>
              <select
                value={routerConfig.debug?.logLevel || "info"}
                onChange={(e) => {
                  const logLevel = e.target.value as "debug" | "info" | "warn" | "error";
                  updateConfig({
                    routerConfig: {
                      ...routerConfig,
                      debug: {
                        ...routerConfig.debug,
                        logLevel
                      }
                    }
                  });
                }}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs mt-1"
              >
                <option value="debug">debug</option>
                <option value="info">info</option>
                <option value="warn">warn</option>
                <option value="error">error</option>
              </select>
            </div>
          </div>
        </div>
      </CardContent>

      {/* 添加规则对话框 */}
      <Dialog open={isAddRuleDialogOpen} onOpenChange={setIsAddRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加新规则</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>规则名称</Label>
                <Input
                  value={newRule.name || ""}
                  onChange={(e) =>
                    setNewRule({ ...newRule, name: e.target.value })
                  }
                  placeholder="例如: myRule"
                />
              </div>
              <div>
                <Label>优先级</Label>
                <Input
                  type="number"
                  value={newRule.priority || 10}
                  onChange={(e) =>
                    setNewRule({
                      ...newRule,
                      priority: parseInt(e.target.value) || 10,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>条件类型</Label>
              <select
                value={newRule.condition?.type || "fieldExists"}
                onChange={(e) => {
                  const conditionType = e.target.value as any;
                  let defaultCondition: any = { type: conditionType };

                  // 根据条件类型设置默认参数
                  switch (conditionType) {
                    case "tokenThreshold":
                      defaultCondition = {
                        type: conditionType,
                        value: 60000,
                        operator: "gt"
                      };
                      break;
                    case "modelContains":
                      defaultCondition = {
                        type: conditionType,
                        value: "haiku",
                        operator: "contains"
                      };
                      break;
                    case "toolExists":
                      defaultCondition = {
                        type: conditionType,
                        value: "web_search",
                        operator: "exists"
                      };
                      break;
                    case "fieldExists":
                      defaultCondition = {
                        type: conditionType,
                        field: "system.1.text",
                        operator: "exists"
                      };
                      break;
                    case "custom":
                      defaultCondition = {
                        type: conditionType,
                        customFunction: "modelContainsComma"
                      };
                      break;
                    case "externalFunction":
                      defaultCondition = {
                        type: conditionType,
                        externalFunction: {
                          path: "./external-rules/custom.js",
                          functionName: "customCheck"
                        }
                      };
                      break;
                  }

                  setNewRule({
                    ...newRule,
                    condition: defaultCondition,
                  });
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="fieldExists">字段存在</option>
                <option value="modelContains">模型包含</option>
                <option value="toolExists">工具存在</option>
                <option value="tokenThreshold">Token阈值</option>
                <option value="custom">自定义函数</option>
                <option value="externalFunction">外部函数</option>
              </select>
            </div>

            {/* Token阈值条件 */}
            {newRule.condition?.type === "tokenThreshold" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Token数量</Label>
                  <Input
                    type="number"
                    value={newRule.condition.value || 60000}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          value: parseInt(e.target.value) || 60000,
                        },
                      })
                    }
                    placeholder="输入Token阈值"
                  />
                </div>
                <div>
                  <Label>操作符</Label>
                  <select
                    value={newRule.condition.operator || "gt"}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          operator: e.target.value as any,
                        },
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="gt">大于</option>
                    <option value="lt">小于</option>
                    <option value="eq">等于</option>
                  </select>
                </div>
              </div>
            )}

            {/* 模型包含条件 */}
            {newRule.condition?.type === "modelContains" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>模型名包含</Label>
                  <Input
                    value={newRule.condition.value || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          value: e.target.value,
                        },
                      })
                    }
                    placeholder="例如: haiku"
                  />
                </div>
                <div>
                  <Label>操作符</Label>
                  <select
                    value={newRule.condition.operator || "contains"}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          operator: e.target.value as any,
                        },
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="contains">包含</option>
                    <option value="startsWith">startsWith</option>
                    <option value="eq">等于</option>
                  </select>
                </div>
              </div>
            )}

            {/* 工具存在条件 */}
            {newRule.condition?.type === "toolExists" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>工具名称</Label>
                  <Input
                    value={newRule.condition.value || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          value: e.target.value,
                        },
                      })
                    }
                    placeholder="例如: web_search"
                  />
                </div>
                <div>
                  <Label>操作符</Label>
                  <select
                    value={newRule.condition.operator || "exists"}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          operator: e.target.value as any,
                        },
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="exists">存在</option>
                    <option value="contains">包含</option>
                  </select>
                </div>
              </div>
            )}

            {/* 字段存在条件 */}
            {newRule.condition?.type === "fieldExists" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>字段路径</Label>
                  <Input
                    value={newRule.condition.field || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          field: e.target.value,
                        },
                      })
                    }
                    placeholder="例如: system.1.text"
                  />
                </div>
                <div>
                  <Label>操作符</Label>
                  <select
                    value={newRule.condition.operator || "exists"}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          operator: e.target.value as any,
                        },
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="exists">存在</option>
                    <option value="contains">包含</option>
                    <option value="eq">等于</option>
                  </select>
                </div>
              </div>
            )}

            {/* 自定义函数条件 */}
            {newRule.condition?.type === "custom" && (
              <div>
                <Label>自定义函数</Label>
                <select
                  value={newRule.condition.customFunction || "modelContainsComma"}
                  onChange={(e) =>
                    setNewRule({
                      ...newRule,
                      condition: {
                        ...newRule.condition!,
                        customFunction: e.target.value,
                      },
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="modelContainsComma">检查模型是否包含逗号</option>
                  <option value="directModelMapping">检查是否为provider代号</option>
                </select>
              </div>
            )}

            {/* 外部函数条件 */}
            {newRule.condition?.type === "externalFunction" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>文件路径</Label>
                  <Input
                    value={newRule.condition.externalFunction?.path || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          externalFunction: {
                            ...newRule.condition!.externalFunction!,
                            path: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="./external-rules/custom.js"
                  />
                </div>
                <div>
                  <Label>函数名</Label>
                  <Input
                    value={newRule.condition.externalFunction?.functionName || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          externalFunction: {
                            ...newRule.condition!.externalFunction!,
                            functionName: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="customCheck"
                  />
                </div>
              </div>
            )}

            {/* 当操作符为 contains 或 eq 时显示值输入框 */}
            {["fieldExists", "modelContains", "toolExists"].includes(newRule.condition?.type || "") &&
             (newRule.condition?.operator === "contains" || newRule.condition?.operator === "eq") && (
              <div>
                <Label>条件值</Label>
                <Input
                  value={newRule.condition.value || ""}
                  onChange={(e) =>
                    setNewRule({
                      ...newRule,
                      condition: {
                        ...newRule.condition!,
                        value: e.target.value,
                      },
                    })
                  }
                  placeholder="输入条件值"
                />
              </div>
            )}

            <div>
              <Label>路由目标</Label>
              <RouteTargetInput
                value={newRule.action?.route || ""}
                onChange={(value) =>
                  setNewRule({
                    ...newRule,
                    action: { ...newRule.action!, route: value },
                  })
                }
                modelOptions={modelOptions}
                placeholder="选择或输入路由目标"
              />
            </div>

            <div>
              <Label>规则描述</Label>
              <Input
                value={newRule.action?.description || ""}
                onChange={(e) =>
                  setNewRule({
                    ...newRule,
                    action: { ...newRule.action!, description: e.target.value },
                  })
                }
                placeholder="例如: 网络搜索路由：检测到web_search工具时使用特定模型"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={newRule.enabled !== false}
                onCheckedChange={(checked) =>
                  setNewRule({ ...newRule, enabled: checked })
                }
              />
              <Label>启用规则</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              <X className="mr-2 h-4 w-4" />
              取消
            </Button>
            <Button onClick={handleAddRule}>
              <Save className="mr-2 h-4 w-4" />
              添加规则
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑规则对话框 */}
      <Dialog open={isEditRuleDialogOpen} onOpenChange={setIsEditRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑规则</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>规则名称</Label>
                <Input
                  value={newRule.name || ""}
                  onChange={(e) =>
                    setNewRule({ ...newRule, name: e.target.value })
                  }
                  placeholder="例如: myRule"
                />
              </div>
              <div>
                <Label>优先级</Label>
                <Input
                  type="number"
                  value={newRule.priority || 10}
                  onChange={(e) =>
                    setNewRule({
                      ...newRule,
                      priority: parseInt(e.target.value) || 10,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>条件类型</Label>
              <select
                value={newRule.condition?.type || "fieldExists"}
                onChange={(e) => {
                  const conditionType = e.target.value as any;
                  let defaultCondition: any = { type: conditionType };

                  // 根据条件类型设置默认参数
                  switch (conditionType) {
                    case "tokenThreshold":
                      defaultCondition = {
                        type: conditionType,
                        value: 60000,
                        operator: "gt"
                      };
                      break;
                    case "modelContains":
                      defaultCondition = {
                        type: conditionType,
                        value: "haiku",
                        operator: "contains"
                      };
                      break;
                    case "toolExists":
                      defaultCondition = {
                        type: conditionType,
                        value: "web_search",
                        operator: "exists"
                      };
                      break;
                    case "fieldExists":
                      defaultCondition = {
                        type: conditionType,
                        field: "system.1.text",
                        operator: "exists"
                      };
                      break;
                    case "custom":
                      defaultCondition = {
                        type: conditionType,
                        customFunction: "modelContainsComma"
                      };
                      break;
                    case "externalFunction":
                      defaultCondition = {
                        type: conditionType,
                        externalFunction: {
                          path: "./external-rules/custom.js",
                          functionName: "customCheck"
                        }
                      };
                      break;
                  }

                  setNewRule({
                    ...newRule,
                    condition: defaultCondition,
                  });
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="fieldExists">字段存在</option>
                <option value="modelContains">模型包含</option>
                <option value="toolExists">工具存在</option>
                <option value="tokenThreshold">Token阈值</option>
                <option value="custom">自定义函数</option>
                <option value="externalFunction">外部函数</option>
              </select>
            </div>

            {/* Token阈值条件 */}
            {newRule.condition?.type === "tokenThreshold" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Token数量</Label>
                  <Input
                    type="number"
                    value={newRule.condition.value || 60000}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          value: parseInt(e.target.value) || 60000,
                        },
                      })
                    }
                    placeholder="输入Token阈值"
                  />
                </div>
                <div>
                  <Label>操作符</Label>
                  <select
                    value={newRule.condition.operator || "gt"}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          operator: e.target.value as any,
                        },
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="gt">大于</option>
                    <option value="lt">小于</option>
                    <option value="eq">等于</option>
                  </select>
                </div>
              </div>
            )}

            {/* 模型包含条件 */}
            {newRule.condition?.type === "modelContains" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>模型名包含</Label>
                  <Input
                    value={newRule.condition.value || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          value: e.target.value,
                        },
                      })
                    }
                    placeholder="例如: haiku"
                  />
                </div>
                <div>
                  <Label>操作符</Label>
                  <select
                    value={newRule.condition.operator || "contains"}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          operator: e.target.value as any,
                        },
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="contains">包含</option>
                    <option value="startsWith">startsWith</option>
                    <option value="eq">等于</option>
                  </select>
                </div>
              </div>
            )}

            {/* 工具存在条件 */}
            {newRule.condition?.type === "toolExists" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>工具名称</Label>
                  <Input
                    value={newRule.condition.value || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          value: e.target.value,
                        },
                      })
                    }
                    placeholder="例如: web_search"
                  />
                </div>
                <div>
                  <Label>操作符</Label>
                  <select
                    value={newRule.condition.operator || "exists"}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          operator: e.target.value as any,
                        },
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="exists">存在</option>
                    <option value="contains">包含</option>
                  </select>
                </div>
              </div>
            )}

            {/* 字段存在条件 */}
            {newRule.condition?.type === "fieldExists" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>字段路径</Label>
                  <Input
                    value={newRule.condition.field || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          field: e.target.value,
                        },
                      })
                    }
                    placeholder="例如: system.1.text"
                  />
                </div>
                <div>
                  <Label>操作符</Label>
                  <select
                    value={newRule.condition.operator || "exists"}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          operator: e.target.value as any,
                        },
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="exists">存在</option>
                    <option value="contains">包含</option>
                    <option value="eq">等于</option>
                  </select>
                </div>
              </div>
            )}

            {/* 自定义函数条件 */}
            {newRule.condition?.type === "custom" && (
              <div>
                <Label>自定义函数</Label>
                <select
                  value={newRule.condition.customFunction || "modelContainsComma"}
                  onChange={(e) =>
                    setNewRule({
                      ...newRule,
                      condition: {
                        ...newRule.condition!,
                        customFunction: e.target.value,
                      },
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="modelContainsComma">检查模型是否包含逗号</option>
                  <option value="directModelMapping">检查是否为provider代号</option>
                </select>
              </div>
            )}

            {/* 外部函数条件 */}
            {newRule.condition?.type === "externalFunction" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>文件路径</Label>
                  <Input
                    value={newRule.condition.externalFunction?.path || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          externalFunction: {
                            ...newRule.condition!.externalFunction!,
                            path: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="./external-rules/custom.js"
                  />
                </div>
                <div>
                  <Label>函数名</Label>
                  <Input
                    value={newRule.condition.externalFunction?.functionName || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition!,
                          externalFunction: {
                            ...newRule.condition!.externalFunction!,
                            functionName: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="customCheck"
                  />
                </div>
              </div>
            )}

            {/* 当操作符为 contains 或 eq 时显示值输入框 */}
            {["fieldExists", "modelContains", "toolExists"].includes(newRule.condition?.type || "") &&
             (newRule.condition?.operator === "contains" || newRule.condition?.operator === "eq") && (
              <div>
                <Label>条件值</Label>
                <Input
                  value={newRule.condition.value || ""}
                  onChange={(e) =>
                    setNewRule({
                      ...newRule,
                      condition: {
                        ...newRule.condition!,
                        value: e.target.value,
                      },
                    })
                  }
                  placeholder="输入条件值"
                />
              </div>
            )}

            <div>
              <Label>路由目标</Label>
              <RouteTargetInput
                value={newRule.action?.route || ""}
                onChange={(value) =>
                  setNewRule({
                    ...newRule,
                    action: { ...newRule.action!, route: value },
                  })
                }
                modelOptions={modelOptions}
                placeholder="选择或输入路由目标"
              />
            </div>

            <div>
              <Label>规则描述</Label>
              <Input
                value={newRule.action?.description || ""}
                onChange={(e) =>
                  setNewRule({
                    ...newRule,
                    action: { ...newRule.action!, description: e.target.value },
                  })
                }
                placeholder="例如: 网络搜索路由：检测到web_search工具时使用特定模型"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={newRule.enabled !== false}
                onCheckedChange={(checked) =>
                  setNewRule({ ...newRule, enabled: checked })
                }
              />
              <Label>启用规则</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              <X className="mr-2 h-4 w-4" />
              取消
            </Button>
            <Button onClick={handleUpdateRule}>
              <Save className="mr-2 h-4 w-4" />
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
