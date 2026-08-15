# comrade-harness-dsh-minimal

deepseek-harness「极简模式」（`minimal` agent preset）的**活体 core**——comrade-harness 的第二个模板，与 standard 并列。本仓库是它的远端，项目内 checkout 在 `cores/dsh-minimal`（根仓库的 git submodule）。

## 铁律：完全对标 dsh 的极简模式，别的什么都没有

极简模式的存在理由只有一个——**DeepSeek v4 对这句 role 过拟合**：

> You are a helpful software engineer assistant.

在这句 role 上模型性能有巨大提升，所以极简 = **把其他一切废话全删**：没有环境信息、没有工具指南、没有历史注入、没有 harness 运行契约。

因此本 core 的模型可见层只有两样东西，两个不变量都不可违背（违背 = 污染，过拟合效果被破坏）：

1. **system prompt = 纯 `PERSONA_TEXT` 一句，零拼接。**
   不拼 `buildSystemPrompt`（harness 契约）、不注入模板身份/工作区规则/任何运行时上下文。工具用法由工具 schema 自带描述，不需要 system prompt 教。

2. **工具 = 只有 `minimalTools()` 两个（bash + str_replace_editor）。**
   不拼 lib 的 `toolsCore()`——那 10 个 harness 控制工具的描述（"在你自己的 core 目录里执行…""改动前先 read_file 了解现状…"）对模型同样是"别的 prompt"，一样是污染。

模型可见层的一切（工具描述、参数 schema、错误消息、退出码格式）逐字对齐上游 preset。**改动前先问自己：这会不会让模型看到"极简一句 + 两个工具"以外的东西？**

> 注意：过拟合是模型属性（DeepSeek v4）。换模型（如走聚合网关）后极简效果会消失，行为会"看起来像被注入"——这不是 core 的 bug，是模型不对。验证极简行为请用 DeepSeek v4。

## 模板语义（📦，不是任何人的私有资产）

- **可运行**的参考实现 + 迁移源：可设为 UI、可聊天；用户 fork 它（壳右键菜单 / daemon `/api/fork`），让模板 agent 把最新代码同步到用户的 fork core。
- **禁止 commit**（daemon 对模板拒绝 snapshot）；**不要修改自己**（改动会被项目仓库覆盖/回滚）；要修改先让用户 fork——fork 出的副本随便改。
- 模板识别没有标记文件：目录位于项目 `cores/` 之下即模板（位置即语义）。

## 数据流（src/index.ts，就这么短）

```ts
// 数据流 = lib 的 standardFlow 子图（与 standard 同构）；
// system = PERSONA_TEXT（唯一段落，无拼接）——覆盖 standardFlow 的默认 buildSystemPrompt
const flow: Flow = standardFlow({ systemPrompt: PERSONA_TEXT });

// 工具 = 极简双工具（bash + str_replace_editor）——不拼 toolsCore
tools: [...minimalTools({ cwd: process.env.CORE_DIR })],
```

`standardFlow` 内部是 `loadContext`（默认全量历史进上下文，含 step 过程痕迹——按标准 message 格式重建：think 步 → assistant 文本，tool 步 → assistant.tool_calls + tool 角色消息对；那是模型自己的轨迹，不是外来注入）→ `agentLoop`（LLM↔工具循环）→ `saveTurn`（写回历史）。lib 的 `createHarness` 只是 HTTP 壳 + 资源注入，不藏任何编排；三个子图都是普通函数，可逐层深入定制（选项 → hooks → 整层换函数 → 手拼子图）。

## 依赖

- `comrade-harness-lib`（git 依赖 + commit id）：节点/子图（`standardFlow`）+ 运行时壳。**只 import 需要的子图**，工具包（`toolsCore`）不要带进来。
- `dsh-minimal`（git 依赖 + commit id）：极简模式的 persona 与双工具，模型可见层单一定义源。
- 本地开发：`bun run local:on` 生成 gitignored 的 `local.override.json`（lib 与 dsh-minimal 都指到本地路径），package.json 的 postinstall 钩子（scripts/local-link.ts）每次 install 后自动重链 junction——package.json 始终是 git 依赖，改 lib/库即时生效；`local:off` 删 marker 还原 GitHub 安装。

## 开发

```bash
bunx tsc --noEmit -p tsconfig.json   # 验证改动
```

- 改代码后**重启 daemon 生效**——模板不可 reload（daemon 拒绝，模板改动由项目维护者管理），与 standard 同规则。
- 提交：本仓库 commit → 根仓库 `git add cores/dsh-minimal` 再 commit（bump gitlink），否则别人拿到的是旧版。
- 发布工作流（与 root/lib/dsh-minimal 库同规则）：单 commit v0.1.0，后续更新 `git commit --amend` + force push main 与 tag，不新建 commit、不 bump 版本。
