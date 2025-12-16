import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useConfig } from "./ConfigProvider";
import { useConfigAdapter } from "@/hooks/useConfigAdapter";
import { UnifiedRouter } from "./UnifiedRouter";
import { isUnifiedFormat } from "@/lib/configUtils";
import type { UnifiedRouterConfig } from "@/types";

export function Router() {
  const { t } = useTranslation();
  const { config, setConfig } = useConfig();
  const adaptedConfig = useConfigAdapter(config);

  // Handle case where config is null or undefined
  if (!config || !adaptedConfig) {
    return (
      <Card className="flex h-full flex-col rounded-lg border shadow-sm">
        <CardHeader className="border-b p-4">
          <CardTitle className="text-lg">{t("router.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center p-4">
          <div className="text-gray-500">Loading router configuration...</div>
        </CardContent>
      </Card>
    );
  }

  // 检测是否为统一路由引擎格式
  const isUnified = isUnifiedFormat(adaptedConfig.routerConfig);

  return (
    <Card className="flex h-full flex-col rounded-lg border shadow-sm">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-lg">{t("router.title")}</CardTitle>
        <div className="flex items-center gap-2 mt-2">
          {isUnified ? (
            <>
              <Badge variant="default">Unified Router Engine</Badge>
              <span className="text-sm text-gray-500">Advanced routing with rules</span>
            </>
          ) : (
            <>
              <Badge variant="secondary">Legacy Router</Badge>
              <span className="text-sm text-gray-500">Basic routing configuration</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        {isUnified ? (
          // 统一路由引擎界面
          <UnifiedRouter />
        ) : (
          // 传统路由界面
          <LegacyRouter />
        )}
      </CardContent>
    </Card>
  );
}

// 传统路由配置组件
function LegacyRouter() {
  const { t } = useTranslation();
  const { config, setConfig } = useConfig();
  const adaptedConfig = useConfigAdapter(config);

  if (!config || !adaptedConfig) {
    return (
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="text-gray-500">Loading router configuration...</div>
      </div>
    );
  }

  // 使用适配器获取传统格式的配置
  const routerConfig = adaptedConfig.routerConfig as any;
  const providers = adaptedConfig.providers;

  const handleRouterChange = (field: string, value: string | number) => {
    const newRouter = { ...routerConfig, [field]: value };
    setConfig({ ...config, Router: newRouter });
  };

  const handleForceUseImageAgentChange = (value: boolean) => {
    setConfig({ ...config, forceUseImageAgent: value });
  };

  const modelOptions = providers.flatMap((provider) => {
    if (!provider || !provider.models) return [];
    const providerName = provider.name || "Unknown Provider";
    return provider.models.map((model: string) => ({
      value: `${providerName},${model}`,
      label: `${providerName}, ${model}`,
    }));
  });

  return (
    <div className="flex-grow space-y-5 overflow-y-auto p-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          您正在使用传统路由配置。建议升级到统一路由引擎以获得更好的功能和性能。
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>{t("router.default")}</Label>
        <select
          value={routerConfig.default || ""}
          onChange={(e) => handleRouterChange("default", e.target.value)}
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
      <div className="space-y-2">
        <Label>{t("router.background")}</Label>
        <select
          value={routerConfig.background || ""}
          onChange={(e) => handleRouterChange("background", e.target.value)}
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
      <div className="space-y-2">
        <Label>{t("router.think")}</Label>
        <select
          value={routerConfig.think || ""}
          onChange={(e) => handleRouterChange("think", e.target.value)}
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
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label>{t("router.longContext")}</Label>
            <select
              value={routerConfig.longContext || ""}
              onChange={(e) => handleRouterChange("longContext", e.target.value)}
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
          <div className="w-48">
            <Label>{t("router.longContextThreshold")}</Label>
            <Input
              type="number"
              value={routerConfig.longContextThreshold || 60000}
              onChange={(e) => handleRouterChange("longContextThreshold", parseInt(e.target.value) || 60000)}
              placeholder="60000"
            />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("router.webSearch")}</Label>
        <select
          value={routerConfig.webSearch || ""}
          onChange={(e) => handleRouterChange("webSearch", e.target.value)}
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
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label>{t("router.image")} (beta)</Label>
            <select
              value={routerConfig.image || ""}
              onChange={(e) => handleRouterChange("image", e.target.value)}
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
          <div className="w-48">
            <Label htmlFor="forceUseImageAgent">{t("router.forceUseImageAgent")}</Label>
            <select
              id="forceUseImageAgent"
              value={config.forceUseImageAgent ? "true" : "false"}
              onChange={(e) => handleForceUseImageAgentChange(e.target.value === "true")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="false">{t("common.no")}</option>
              <option value="true">{t("common.yes")}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
