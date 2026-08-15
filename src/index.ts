import { createHarness, loadModelResources, sqliteSessionStore, standardFlow } from "comrade-harness-lib";
import { minimalTools, PERSONA_TEXT } from "dsh-minimal";
import type { Flow } from "comrade-harness-lib";

// dsh-minimal core —— deepseek-harness「极简模式」的活体演示。
// 数据流 = lib 的 standardFlow（子图，普通函数）：loadContext → agentLoop → saveTurn（与 standard 同构，
// 定制阶梯见 standard/src/index.ts 注释）。对话历史跟随 lib 默认：全量进上下文（含 step 过程痕迹，
// 按标准 message 格式重建——think 步 → assistant 文本，tool 步 → assistant.tool_calls + tool 角色消息对；
// 那是模型自己的轨迹，不是外来注入）。
//
// ★ system prompt 就是极简模式的完整 persona，恰好一句，什么都不注入。
// 上游语义（minimal preset 的 `complete: true`）：persona 段落是完整 system prompt，
// 压掉 global identity / Web orientation / tool guidance / runtime context 所有其他段落。
// 动机：DeepSeek v4 对这句 role 过拟合——在这句上性能巨大提升，废话全删。
// standardFlow 的默认 buildSystemPrompt（harness 契约）在这里被 systemPrompt 选项覆盖——
// 别把它拼回来，那会重新注入一整套"别的 prompt"。
// 工具同样只有极简双工具（bash + str_replace_editor），不拼 toolsCore——
// lib 的 harness 控制工具自带一套指令性描述（"在自己目录执行""改动前先 read_file"……），
// 对模型也是"别的 prompt"，会破坏过拟合的极简行为。
// 工具用法由工具 schema 自带描述，不需要 system prompt 教。

const flow: Flow = standardFlow({
  systemPrompt: PERSONA_TEXT, // 纯 persona 一句，零注入
});

// 资源组装（"被加载"的部分，参数组合就够了）：
// LLM 提供者优先取公共资源库（~/.agents/models.json，RESOURCES_DIR 可覆盖），UI 可通过 /api/models 切换
// provider/模型（选择器委托给当前选中项，流不用改）；公共库缺失/全失败时回落 LLM_* 环境变量。
const { llm, modelSelector } = await loadModelResources();
createHarness({
  flow, // 数据流（harness 的灵魂）——standardFlow 一行配置
  llm, // LLM 提供者：公共库选择器（UI 可切换）或 LLM_* 环境变量
  modelSelector, // 供 UI 的 /api/models 切换端点
  tools: [...minimalTools({ cwd: process.env.CORE_DIR })], // 极简双工具（bash + str_replace_editor）——不拼 toolsCore，见顶部注释
  ui: { dir: "public" }, // 对话 UI（public/ 静态资源，普通网页）
  memory: sqliteSessionStore(process.env.DB_PATH), // 会话化消息历史：消息池 + 会话引用列表（多会话；DB_PATH 由 daemon 注入）
});
