
import { GoogleGenAI, Type } from "@google/genai";
import { BrainstormMode } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const generateIdeas = async (
  goal: string,
  mode: BrainstormMode,
  count: number,
  context: string = ""
) => {
  const modelName = 'gemini-3-flash-preview';
  
  const systemInstructions = `
    你是一个顶级的创意顾问。
    目标：${goal}
    模式：${mode}
    数量：请生成 ${count} 个创意。
    语言：必须使用中文。
    
    规则：
    1. 创意需具备落地性与独特性。
    2. 返回 JSON 格式。
  `;

  const prompt = `基于上下文生成 ${count} 个创意。上下文：${context}`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: systemInstructions,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            category: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "content", "category"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return [];
  }
};

export const generatePRD = async (ideaTitle: string, ideaContent: string) => {
  const modelName = 'gemini-3-pro-preview';
  const prompt = `为以下创意编写一份专业的需求文档（PRD）：
    标题：${ideaTitle}
    描述：${ideaContent}
    
    要求包含：产品概述、目标用户、核心功能、技术可行性、风险评估。
    语言：中文。使用 Markdown 结构。
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: "你是一个资深产品经理，擅长编写逻辑严密的需求文档。返回纯文本 Markdown 格式。",
    }
  });

  return response.text;
};

export const generateWebPRD = async (originalPRD: string) => {
  const modelName = 'gemini-3-pro-preview';
  const prompt = `请将以下通用需求文档（PRD）转换为专门针对 **Web 网站实现** 的技术需求文档。
    
    原始内容：
    ${originalPRD}
    
    要求包含以下 Web 特有部分：
    1. Web 功能清单：具体到页面的功能点。
    2. UI/UX 规范：视觉风格建议、Web 交互逻辑。
    3. 前端技术选型：框架、库、响应式策略。
    4. 性能与 SEO 优化建议。
    5. 浏览器兼容性要求。
    
    语言：中文。使用 Markdown 格式。
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: "你是一个资深 Web 架构师和产品经理，专注于 Web 端的体验和实现细节。返回纯文本 Markdown 格式。",
    }
  });

  return response.text;
};

export const expandIdea = async (ideaTitle: string, ideaContent: string) => {
  const modelName = 'gemini-3-flash-preview';
  const prompt = `扩展创意：
    标题：${ideaTitle}
    内容：${ideaContent}
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: "将创意细化为具体方案。返回 JSON。",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          executionSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
          variants: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              }
            } 
          }
        }
      }
    }
  });

  return JSON.parse(response.text);
};
