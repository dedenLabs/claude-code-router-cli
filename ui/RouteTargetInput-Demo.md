# RouteTargetInput 组件演示文档

## 功能概述

RouteTargetInput 是一个智能的路由目标输入组件，结合了输入框和下拉选择的功能，允许用户：

1. **手动输入**：直接输入自定义的路由目标
2. **选择预设变量**：从预设变量列表中选择
3. **选择模型**：从可用模型列表中选择

## 预设变量

组件内置了以下预设变量：

### 1. ${userModel} - 用户指定模型
- **描述**：使用用户请求中原始指定的模型
- **使用场景**：当需要保持用户原始模型选择时

### 2. ${subagent} - 子代理模型
- **描述**：从系统消息中提取的子代理模型
- **使用场景**：当需要根据子代理动态选择模型时

### 3. ${mappedModel} - 映射模型
- **描述**：将提供商代号映射到具体模型
- **使用场景**：当需要根据提供商自动选择默认模型时

## 使用示例

### 在统一路由引擎中的应用

#### 1. 默认路由配置
```typescript
<RouteTargetInput
  value={routerConfig.defaultRoute}
  onChange={handleDefaultRouteChange}
  modelOptions={modelOptions}
  placeholder="选择默认路由目标"
/>
```

#### 2. 规则路由配置
```typescript
<RouteTargetInput
  value={rule.action.route}
  onChange={(value) => handleRuleRouteChange(rule.name, value)}
  modelOptions={modelOptions}
  placeholder="选择路由目标"
/>
```

#### 3. 添加/编辑规则对话框
```typescript
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
```

## 组件特性

### 交互方式

1. **输入框模式**：
   - 直接在输入框中输入自定义值
   - 支持所有文本输入

2. **下拉选择模式**：
   - 点击右侧箭头图标打开下拉菜单
   - 下拉菜单分为两个部分：
     - 预设变量（带中文描述）
     - 可用模型列表

3. **只读模式**：
   - 设置 `readOnly={true}` 启用
   - 用于显示模式，不允许编辑

### 智能显示

组件会根据当前值智能显示不同的文本：

- **预设变量**：显示为 `${变量名} (中文描述)`
- **模型选项**：显示为 `提供商, 模型名`
- **自定义输入**：直接显示输入的文本

## 优势

1. **用户体验提升**：
   - 提供了清晰的预设选项指导
   - 中文描述帮助用户理解变量用途
   - 支持手动输入增加灵活性

2. **开发效率提升**：
   - 减少记忆负担，无需记住所有变量名
   - 自动完成功能（通过下拉选择）
   - 类型安全，支持 TypeScript

3. **维护性提升**：
   - 统一组件，复用率高
   - 易于扩展，可添加新的预设变量
   - 清晰的代码结构

## 技术实现

### 核心组件结构

```typescript
interface RouteTargetInputProps {
  value: string;                    // 当前值
  onChange: (value: string) => void; // 值变化回调
  modelOptions: ModelOption[];      // 模型选项列表
  readOnly?: boolean;               // 是否只读
  placeholder?: string;             // 占位符文本
}
```

### 状态管理

- **isOpen**：控制下拉菜单显示/隐藏
- **inputValue**：输入框的当前值
- **点击外部关闭**：自动处理点击外部事件

### 预设变量定义

```typescript
const PRESET_VARIABLES: RouteVariable[] = [
  {
    value: "${userModel}",
    label: "用户指定模型",
    description: "使用用户请求中原始指定的模型"
  },
  // ... 更多变量
];
```

## 部署说明

该组件已集成到统一路由引擎的以下位置：

1. **主界面默认路由选择**
2. **规则列表中的路由目标显示**
3. **添加规则对话框**
4. **编辑规则对话框**

所有位置都使用相同的组件，确保了一致的用户体验。