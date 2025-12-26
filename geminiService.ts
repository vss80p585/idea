
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
    模式：${mode} (请严格遵守该思维模式的逻辑：SCAMPER代表替代、合并、改进等；SIX_HATS代表六顶思考帽平行思维；RANDOM代表随机碰撞)
    数量：请生成 ${count} 个创意。
    语言：必须使用中文。
    
    规则：
    1. 每个创意标题必须精炼，内容必须包含具体的执行痛点或亮点。
    2. 返回 JSON 格式。
  `;

  const prompt = `基于用户输入的构想：“${context}”，在当前脑暴模式下生成 ${count} 个相关联但具备差异化的创意点子。`;

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
    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI Ideas", e);
    return [];
  }
};

export const generatePRD = async (ideaTitle: string, ideaContent: string) => {
  const modelName = 'gemini-3-pro-preview';
  const prompt = `为以下构想编写一份专业且具备实操价值的通用需求文档（PRD）：
    标题：${ideaTitle}
    描述：${ideaContent}
    
    必须包含以下结构：
    1. 产品愿景与核心价值
    2. 目标用户画像与痛点
    3. 核心功能路线图
    4. 业务逻辑与主要流程
    5. 性能与成功指标
    6. 风险评估与对策
    
    语言：中文。使用 Markdown 结构。
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: "你是一个资深产品经理，擅长编写逻辑严密、结构清晰的PRD。返回纯文本 Markdown 格式。",
    }
  });

  return response.text || "生成失败，请重试。";
};

export const generateWebPRD = async (originalPRD: string) => {
  const modelName = 'gemini-3-flash-preview';
  const prompt = `请深度分析以下通用需求文档（PRD），并将其转化为一份详尽的 **Web 网站技术落地文档**。
    
    原始内容：
    ${originalPRD}
    
    必须涵盖 Web 特有的实现细节：
    1. 网站架构设计：前端选用框架 (如 React/Next.js)、状态管理、API 交互。
    2. 核心页面原型描述：页面层级、每个页面的核心功能点。
    3. UI/UX 视觉规范：针对 Web 端的主题色、排版、交互动效建议。
    4. 核心 Web 功能实现方案：如复杂组件逻辑。
    5. 性能、SEO 及 跨平台响应式策略。
    
    要求：深度结合 Web 平台的特性，而非笼统描述。
    语言：中文。使用 Markdown 格式。
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: "你是一个资深 Web 架构师，专注于将业务需求转化为高质量的技术实现路径。返回纯文本 Markdown 格式。",
    }
  });

  return response.text || "网站技术文档生成失败，请重试。";
};

export const expandIdea = async (ideaTitle: string, ideaContent: string) => {
  const modelName = 'gemini-3-flash-preview';
  const prompt = `细化创意：
    标题：${ideaTitle}
    内容：${ideaContent}
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: "将创意拆解为具体的执行清单。返回 JSON。",
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

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { executionSteps: [], variants: [] };
  }
};
