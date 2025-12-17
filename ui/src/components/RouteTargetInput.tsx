import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface RouteVariable {
  value: string;
  label: string;
  description: string;
}

interface ModelOption {
  value: string;
  label: string;
}

interface RouteTargetInputProps {
  value: string;
  onChange: (value: string) => void;
  modelOptions: ModelOption[];
  readOnly?: boolean;
  placeholder?: string;
}

// 预设变量定义
const PRESET_VARIABLES: RouteVariable[] = [
  {
    value: "${userModel}",
    label: "用户指定模型",
    description: "使用用户请求中原始指定的模型"
  },
  {
    value: "${subagent}",
    label: "子代理模型",
    description: "从系统消息中提取的子代理模型"
  },
  {
    value: "${mappedModel}",
    label: "映射模型",
    description: "将提供商代号映射到具体模型"
  }
];

export function RouteTargetInput({
  value,
  onChange,
  modelOptions,
  readOnly = false,
  placeholder = "选择或输入路由目标"
}: RouteTargetInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // 处理输入框变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  // 处理选择变化
  const handleSelectChange = (selectedValue: string) => {
    setInputValue(selectedValue);
    onChange(selectedValue);
    setIsOpen(false);
  };

  // 处理预设变量选择
  const handleVariableSelect = (variable: RouteVariable) => {
    setInputValue(variable.value);
    onChange(variable.value);
    setIsOpen(false);
  };

  // 处理模型选择
  const handleModelSelect = (model: ModelOption) => {
    setInputValue(model.value);
    onChange(model.value);
    setIsOpen(false);
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 判断当前值是否为预设变量
  const isPresetVariable = (val: string) => {
    return PRESET_VARIABLES.some(v => v.value === val);
  };

  // 获取当前值的显示文本
  const getDisplayText = (val: string) => {
    if (!val) return placeholder;

    // 检查是否为预设变量
    const variable = PRESET_VARIABLES.find(v => v.value === val);
    if (variable) {
      return `${variable.label} (${variable.value})`;
    }

    // 检查是否为模型选项
    const model = modelOptions.find(m => m.value === val);
    if (model) {
      return model.label;
    }

    // 自定义输入
    return val;
  };

  if (readOnly) {
    return (
      <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
        {getDisplayText(value)}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pr-10"
          onFocus={() => setIsOpen(true)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
          {/* 预设变量部分 */}
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 mb-2">预设变量</div>
            {PRESET_VARIABLES.map((variable) => (
              <div
                key={variable.value}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                onClick={() => handleVariableSelect(variable)}
              >
                <div className="font-medium text-sm">{variable.label}</div>
                <div className="text-xs text-gray-500">{variable.description}</div>
                <div className="text-xs text-blue-600 mt-1 font-mono">{variable.value}</div>
              </div>
            ))}
          </div>

          {/* 分隔线 */}
          <div className="border-t border-gray-200"></div>

          {/* 模型选项部分 */}
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 mb-2">可用模型</div>
            {modelOptions.length > 0 ? (
              modelOptions.map((option) => (
                <div
                  key={option.value}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                  onClick={() => handleModelSelect(option)}
                >
                  <div className="text-sm">{option.label}</div>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-gray-500">暂无可用模型</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}