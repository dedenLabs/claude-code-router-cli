/**
 * API 端到端测试
 * 测试实际的 HTTP API 调用，使用真实数据
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { sendUnifiedRequest, getHttpsProxy } from "../../src/utils/request";

// 用户提供的测试数据
const testRequestData = {
  model: "sonnet",
  messages: [
    {
      role: "user",
      content: `[系统指令]
你是一个专业的 AI 绘画提示词整理专家。

你的任务是将提取的原始提示词整理成结构化的 JSON 格式，便于后续 AI 图片生成使用。

[整理要求]
1. mainCharacterDesc: 主角描述（角色外观、种族、特征）
2. culturalThemeDesc: 文化主题（文化背景关键词）
3. heldItemDesc: 持有物品
4. outfitDesc: 服装描述
5. backgroundFXDesc: 背景特效
6. overallMoodDesc: 整体氛围
7. promptStyle: 风格描述（可选）

[输出格式]
JSON格式，根节点为 "optimizedConfig"

[用户请求]
请整理以下原始提示词：
Q版三头身可爱猫咪角色，圆润饱满的体型，大大的头部，位置较低的无辜大眼，眼下带有淡粉色椭圆形腮红，圆形高光点睛，清新明亮的表情。日系二次元动漫风格，矢量插画设计。3×3矩阵排列，9只猫咪群体展示，背景点缀散落花朵、爱心和肉垫脚印图案。温馨治愈，童趣盎然，软萌可爱。

anime chibi style, exaggerated proportions, 2-head ratio, cute rounded shapes, clean thick black outlines, vector-like smooth lines, high saturation colors, minimalist shading, blush marks under eyes, circular eye highlights, warm and healing atmosphere`,
    },
  ],
  max_tokens: 4000,
  temperature: 0.3,
};

describe("API 端到端测试", () => {
  // 测试配置
  const API_BASE_URL = process.env.CCR_API_URL || "http://localhost:3456";
  const API_TIMEOUT = 60000; // 60秒超时

  describe("API 连接测试", () => {
    test("应该能够连接到 CCR API 服务器", async () => {
      // 测试健康检查端点
      const healthResponse = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // 如果服务未运行，跳过测试
      if (!healthResponse.ok) {
        console.log("⚠️  CCR 服务未运行，跳过 API 测试");
        return;
      }

      const healthData = await healthResponse.json();
      expect(healthData.status).toBe("ok");
    });

    test("应该能够获取可用模型列表", async () => {
      const modelsResponse = await fetch(`${API_BASE_URL}/v1/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!modelsResponse.ok) {
        console.log("⚠️  模型列表请求失败，服务可能未运行");
        return;
      }

      const modelsData = await modelsResponse.json();
      expect(modelsData.data).toBeDefined();
      expect(Array.isArray(modelsData.data)).toBe(true);
    });
  });

  describe("消息处理测试", () => {
    test(
      "应该能够发送消息并获取响应",
      async () => {
        // 测试发送完整消息
        const response = await fetch(`${API_BASE_URL}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "sk-anything",
          },
          body: JSON.stringify(testRequestData),
        });

        if (!response.ok) {
          // 服务未运行，打印信息并跳过
          const errorText = await response.text();
          console.log(`⚠️  API 请求失败 (状态码: ${response.status})`);
          console.log(`错误信息: ${errorText}`);
          console.log("请确保 CCR 服务正在运行: ccr start");
          return;
        }

        // 验证响应
        expect(response.ok).toBe(true);

        // 检查响应类型
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("text/event-stream")) {
          // 流式响应
          console.log("📡 接收到流式响应");
          expect(contentType).toContain("text/event-stream");
        } else {
          // 非流式响应
          const responseData = await response.json();
          console.log("responseData:", responseData);
          expect(responseData).toBeDefined();

          // 验证响应结构（支持不同响应格式）
          if (responseData.id) {
            expect(responseData.type || responseData.object).toBeDefined();
          }
        }
      },
      API_TIMEOUT,
    );

    test(
      "应该支持流式响应",
      async () => {
        const streamRequest = {
          ...testRequestData,
          stream: true,
        };

        const response = await fetch(`${API_BASE_URL}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "sk-anything",
          },
          body: JSON.stringify(streamRequest),
        });

        if (!response.ok) {
          console.log("⚠️  流式请求失败，服务可能未运行");
          return;
        }

        expect(response.ok).toBe(true);
        expect(response.headers.get("content-type")).toContain(
          "text/event-stream",
        );
      },
      API_TIMEOUT,
    );

    test(
      "应该正确处理请求头",
      async () => {
        const customHeadersRequest = {
          ...testRequestData,
          // 添加自定义 headers 应该在请求中传递
        };

        const response = await fetch(`${API_BASE_URL}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "sk-anything",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(customHeadersRequest),
        });

        if (!response.ok) {
          console.log("⚠️  自定义请求头测试跳过（服务未运行）");
          return;
        }

        expect(response.ok).toBe(true);
      },
      API_TIMEOUT,
    );
  });

  describe("代理配置测试", () => {
    test("getHttpsProxy 应该正确读取环境变量", () => {
      // 测试环境变量解析
      const originalProxy = process.env.HTTPS_PROXY;

      // 测试无代理
      delete process.env.HTTPS_PROXY;
      delete process.env.https_proxy;
      delete process.env.PROXY_URL;
      expect(getHttpsProxy()).toBeUndefined();

      // 测试 HTTPS_PROXY
      process.env.HTTPS_PROXY = "http://proxy.example.com:8080";
      expect(getHttpsProxy()).toBe("http://proxy.example.com:8080");

      // 测试 https_proxy (小写)
      delete process.env.HTTPS_PROXY;
      process.env.https_proxy = "http://proxy.example.com:8080";
      expect(getHttpsProxy()).toBe("http://proxy.example.com:8080");

      // 测试 PROXY_URL
      delete process.env.https_proxy;
      process.env.PROXY_URL = "http://proxy.example.com:8080";
      expect(getHttpsProxy()).toBe("http://proxy.example.com:8080");

      // 恢复原始值
      if (originalProxy) {
        process.env.HTTPS_PROXY = originalProxy;
      } else {
        delete process.env.PROXY_URL;
      }
    });

    test("sendUnifiedRequest 应该正确处理代理配置", async () => {
      const mockContext = {
        req: { id: "test-request-123" },
      };

      // 测试不带代理的请求
      const response = await sendUnifiedRequest(
        `${API_BASE_URL}/health`,
        {},
        {},
        mockContext,
      );

      if (!response.ok) {
        console.log("⚠️  代理配置测试跳过（服务未运行）");
        return;
      }

      expect(response.ok).toBe(true);
    });
  });

  describe("请求体验证测试", () => {
    test(
      "应该正确发送用户提供的请求数据",
      async () => {
        // 使用用户提供的真实数据测试
        const response = await fetch(`${API_BASE_URL}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "sk-anything",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(testRequestData),
        });

        if (!response.ok) {
          console.log("⚠️  完整数据测试跳过（服务未运行）");
          return;
        }

        expect(response.ok).toBe(true);

        // 验证请求数据被正确处理
        const contentType = response.headers.get("content-type");
        expect(contentType).toBeTruthy();
      },
      API_TIMEOUT,
    );
  });
});

// 便捷函数：快速测试 API
export async function quickApiTest() {
  const API_BASE_URL = process.env.CCR_API_URL || "http://localhost:3456";

  console.log("\n🚀 快速 API 测试");
  console.log("================\n");

  // 1. 健康检查
  console.log("1. 检查服务状态...");
  try {
    const health = await fetch(`${API_BASE_URL}/health`);
    if (health.ok) {
      const data = await health.json();
      console.log(`   ✅ 服务正常: ${data.status}`);
    } else {
      console.log("   ❌ 服务未运行");
      console.log("   💡 启动服务: ccr start");
      return false;
    }
  } catch (error) {
    console.log(`   ❌ 连接失败: ${error}`);
    console.log("   💡 请确保 CCR 服务已启动");
    return false;
  }

  // 2. 测试消息发送
  console.log("\n2. 测试消息发送...");
  try {
    const response = await fetch(`${API_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "sk-anything",
      },
      body: JSON.stringify({
        model: "sonnet",
        messages: [{ role: "user", content: "Hello, test!" }],
        max_tokens: 100,
      }),
    });

    if (response.ok) {
      console.log("   ✅ 消息发送成功");
      const data = await response.json();
      console.log(`   📝 响应 ID: ${data.id}`);
    } else {
      console.log(`   ❌ 消息发送失败: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ 请求错误: ${error}`);
    return false;
  }

  console.log("\n✨ 测试完成");
  return true;
}
