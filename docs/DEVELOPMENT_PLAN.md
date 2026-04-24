# ReviewReel 完整开发计划

更新时间：2026-04-24

## 0. 总进度看板

状态说明：
- `已完成`：代码已落地，并完成对应验证。
- `部分完成`：该阶段已有能力落地，但计划中仍有未完成项。
- `待开始`：尚未进入实现。

| 阶段 | 状态 | 完成内容 | 验证记录 | 下一步 |
| --- | --- | --- | --- | --- |
| Phase 1：后端 Job 化与前端稳定性 | 已完成 | `/api/generate`、`/api/jobs/[id]`、`lib/jobs.ts`、前端统一调用 Job API、Job ID/耗时展示 | `npm run lint`、`npm run typecheck`、`npm run build`、`node ./scripts/smoke.mjs`、`ffprobe 1080x1920/15s` | 后续替换内存 store 为持久化 |
| Phase 2：中文与本地商家内容质量 | 已完成 | 中文脚本字段、行业识别、餐饮中文 hook/CTA、关键词提取 | 中文 `/api/generate` 通过；“拉州拉面馆”识别为 `food`；`ffprobe 1080x1920/15s` | 扩展更多行业模板和文案多样性 |
| Phase 3：图片上传与视觉模板 | 已完成 | 上传 API、上传 UI、缩略图/删除、上传图片作为视频场景背景、3 个模板和模板选择 | 上传 API smoke 通过；带上传图 `/api/generate` 通过；`warm-local` 模板生成通过；`ffprobe 1080x1920/15s`；浏览器上传/模板 UI 无错误 | 后续继续扩展更多模板 |
| Phase 4：中文 TTS 与音频体验 | 已完成 | TTS provider 抽象、本机 macOS `say` 中文语音、静音 fallback、前端展示语音 provider | 中文“拉州拉面馆”生成通过；`voiceProvider=system:Tingting`；`ffprobe 1080x1920/15s`；`npm run lint`、`npm run typecheck`、`npm run build` | 后续可接入云端 TTS provider |
| Phase 5：质量、测试与可观测性 | 部分完成 | `scripts/smoke.mjs` 已更新为 Job API 集成验证；Job metrics 已有总耗时和阶段耗时；单元测试 40 个通过覆盖 ai/jobs/templates | `node ./scripts/smoke.mjs` 通过；`npm run test` 40 pass | 增加更完整指标 |
| Phase 6：部署准备 | 部分完成 | Vercel 部署计划、`vercel.json`、`.env.example`、`.gitignore`、生产媒体护栏、storage provider、Blob 上传分支、远程 TTS adapter、远程 video renderer adapter | `npm run lint`、`npm run typecheck`、`npm run build`、`node ./scripts/smoke.mjs`、`/api/uploads` smoke | 选择实际 renderer 服务，完成线上端到端部署验证 |

## 1. 当前基线

ReviewReel 目前已经是一个可运行的 Next.js MVP。用户可以在 `/generate` 输入商家名和评论，点击生成后得到 15 秒左右的 9:16 MP4。

当前已实现能力：
- 页面入口：`app/generate/generate-client.tsx`
- 四段式前端流水线：`generate-client.tsx:90-129`
- 脚本生成：`lib/ai.ts:37-61`
- 中文脚本分支：`lib/ai.ts:50-60`
- 场景图生成：`lib/ffmpeg.ts:18-44`
- 中文场景标签：`lib/ffmpeg.ts:24-30`
- 静音音频兜底：`lib/ffmpeg.ts:46-68`
- FFmpeg 合成视频：`lib/ffmpeg.ts:70-138`
- 基础类型：`types/video.ts`

当前主要短板：
- 前端直接串联 4 个 API，缺少统一 Job 状态和错误边界。
- `VideoJob` 只是类型，没有真实 job store 或查询接口。
- 没有上传店铺图片能力，视频还是模板海报风。
- TTS 仍是静音占位，没有中文语音。
- 视频模板、品牌色、字幕样式、音乐、封面等都还不可配置。
- 没有自动化测试覆盖核心生成逻辑。
- 生产部署还不稳，FFmpeg 与 QuickLook 渲染依赖不适合直接上 Vercel Serverless。

## 2. 产品目标

把 ReviewReel 从“可演示的本地 MVP”推进到“本地商家可以实际生成可用短视频”的工具。

核心体验目标：
1. 用户输入商家信息和评论。
2. 可选上传店铺图片。
3. 一键生成 15 秒 9:16 营销短视频。
4. 输出可预览、可下载、中文友好。
5. 出错时能清楚知道失败阶段，并尽量给出兜底结果。

## 3. 非目标

短期不做：
- 多用户协作。
- 浏览器内时间线式视频编辑器。
- 社媒自动发布。
- 付费系统完整闭环。
- 云端队列/worker 集群。

## 4. 架构决策

### 4.1 短期架构

使用 Next.js App Router + Node.js API routes：
- 前端只调用一个统一生成接口。
- 后端内部执行脚本、图片、音频、视频四阶段。
- 使用本地内存 Job Store 记录状态。
- 生成文件仍写入 `public/generated`。

### 4.2 中期架构

引入持久化与异步任务：
- Job Store 从内存替换为 SQLite/Postgres。
- 视频生成迁移到后台 worker。
- 前端轮询 `/api/jobs/:id`。
- 文件存储迁移到对象存储或 CDN。

### 4.3 生产架构

生产目标是部署到 Vercel，但把重媒体处理拆到外部服务：
- Vercel 承载 Next.js 页面、API 编排、Job 查询和上传入口。
- Vercel Blob 或等价对象存储保存上传图片、音频和 MP4。
- QuickLook 目前依赖 macOS，本地可以用；生产应替换为跨平台渲染器或远程 video renderer。
- macOS `say` 仅作为本地 TTS；生产使用云端 TTS provider。
- FFmpeg 合成建议放到 Cloud Run/Fly/Render/Railway/AWS Lambda container 等外部 worker，再把结果写入 Blob。

## 5. 分阶段开发路线

## Phase 1：后端 Job 化与前端稳定性（已完成）

目标：让生成流程有统一入口、可追踪状态和更稳的错误处理。

### 1.1 新增统一生成 API

文件：
- `app/api/generate/route.ts`
- `lib/jobs.ts`
- `types/video.ts`

步骤：
1. 扩展 `VideoJob`：
   - 增加 `steps` 字段：script/images/voice/video 的状态。
   - 增加 `error` 字段。
   - 增加 `output.script/images/audioUrl/videoUrl`。
   - 增加 `updatedAt`。
2. 新增内存 Job Store：
   - `createVideoJob(input)`
   - `updateVideoJob(id, patch)`
   - `getVideoJob(id)`
   - `listVideoJobs()`
3. 新增 `POST /api/generate`：
   - 输入：`businessName`、`reviews`
   - 创建 job。
   - 顺序执行：script -> images -> voice -> video。
   - 每一步更新 job 状态。
   - 成功返回完整 job。
   - 失败返回 job + error。

验收：
- 空 reviews 返回 400。
- 正常输入返回 `status: "done"`。
- 返回中包含 `job.id`、`output.script`、`output.videoUrl`。
- 任一步失败时 job 状态为 `failed`，且有错误信息。

### 1.2 新增 Job 查询 API

文件：
- `app/api/jobs/[id]/route.ts`

步骤：
1. `GET /api/jobs/:id` 返回单个 job。
2. 未找到返回 404。
3. 为后续异步任务保留接口形状。

验收：
- 生成成功后可通过 id 查询到相同 job。

### 1.3 前端改为调用统一生成 API

文件：
- `app/generate/generate-client.tsx`

步骤：
1. 把前端四段 `postJson` 调用替换为一次 `/api/generate`。
2. 用返回的 `job.steps` 更新四个状态卡。
3. 显示 job id、错误阶段和可下载视频。
4. 保留本地输入自动保存。

验收：
- 点击一次 Generate 即可完成生成。
- 页面不会刷新。
- 完成后自动滚动到预览区。
- 可以看到 job id。

## Phase 2：中文与本地商家内容质量（已完成）

目标：让中文短视频更自然，更像给真实餐馆/门店用的广告。

### 2.1 中文脚本增强

文件：
- `lib/ai.ts`

步骤：
1. 抽取关键词：口味、服务、速度、环境、价格、分量。
2. 中文 hook 模板改为多样化：
   - “这家{品类}，附近人都在夸”
   - “{商家名}，午饭别错过”
   - “想吃{关键词}？试试{商家名}”
3. CTA 根据品类调整：
   - 餐饮：今天来吃一碗/现在就去试试
   - 服务类：现在预约/马上咨询
4. 输出增加 `language`、`tone`、`keywords`。

验收：
- “拉州拉面馆”生成的脚本不再中英混杂。
- 三条 social proof 都来自评论事实。
- hook 不超过 14 个中文字。

### 2.2 行业识别

文件：
- `lib/ai.ts`

步骤：
1. 根据商家名和评论识别行业：餐饮、美容、维修、健身、教育、通用。
2. 为不同行业设置 CTA 与视觉文案。
3. 类型中加入 `businessCategory`。

验收：
- “拉面馆”识别为餐饮。
- “修车店”不生成“吃一碗”这种 CTA。

## Phase 3：图片上传与视觉模板（已完成）

目标：让视频使用真实店铺素材，而不是纯模板。

### 3.1 图片上传 UI

文件：
- `app/generate/generate-client.tsx`
- `app/api/uploads/route.ts`
- `lib/uploads.ts`

步骤：
1. 增加图片上传 input，支持 1-5 张。
2. 限制文件类型：jpg/png/webp。
3. 限制单张大小，如 8MB。
4. 上传到 `public/generated/uploads`。
5. 前端显示缩略图和删除按钮。

验收：
- 用户可以上传图片。
- 上传后图片能进入生成流程。

状态：已完成。

完成记录：
- 新增 `app/api/uploads/route.ts`
- 新增 `lib/uploads.ts`
- `app/generate/generate-client.tsx` 增加图片上传、缩略图和删除按钮
- 限制 1-5 张、JPG/PNG/WEBP、单张 8MB

### 3.2 视频场景使用用户图片

文件：
- `lib/ffmpeg.ts`
- `lib/png.ts`

步骤：
1. 如果用户上传图片，则优先使用图片作为背景。
2. 给图片加暗色蒙层、文字卡片和品牌角标。
3. 不足 3 张时用模板海报补齐。
4. 保持 9:16 裁切安全。

验收：
- 上传店铺图片后，最终视频中能看到真实图片。
- 中文文字不遮挡主体内容。

状态：已完成。

完成记录：
- `GeneratePipelineInput` 增加 `imageUrls`
- `/api/generate` 接收 `imageUrls`
- `lib/ffmpeg.ts` 把上传图片传入海报生成
- `lib/png.ts` 支持把上传图片嵌入 SVG 背景，并叠加暗色蒙层和文字卡片

### 3.3 模板系统

文件：
- `lib/templates.ts`
- `types/video.ts`

步骤：
1. 定义模板：
   - `bold-food`
   - `clean-service`
   - `warm-local`
2. 每个模板包含颜色、字体大小、文案位置、标签文案。
3. 前端增加模板选择。

验收：
- 用户可以切换模板。
- 不同模板生成的视频视觉明显不同。

状态：已完成。

完成记录：
- 新增 `lib/templates.ts`
- 支持 `bold-food`、`clean-service`、`warm-local`
- `GeneratePipelineInput` 增加 `templateId`
- `/api/generate` 接收并保存 `templateId`
- `lib/ffmpeg.ts` 根据模板选择场景色、标签和海报参数
- `lib/png.ts` 支持模板化 footer、图片蒙层和文字卡片透明度
- `app/generate/generate-client.tsx` 增加模板选择 UI，并保存用户选择

## Phase 4：中文 TTS 与音频体验（已完成）

目标：把静音占位替换成可用中文配音。

### 4.1 TTS Provider 抽象

文件：
- `lib/tts.ts`
- `types/video.ts`

步骤：
1. 定义 `TtsProvider` 接口。
2. 保留 `silent` provider 作为 fallback。
3. 增加环境变量配置：
   - `TTS_PROVIDER`
   - provider API key
4. 输出音频时记录 provider。

验收：
- 没有 API key 时仍能生成静音视频。
- 有 provider 时输出真实语音。

状态：已完成。

完成记录：
- `lib/tts.ts` 增加 provider 选择，默认使用本机系统语音，`TTS_PROVIDER=silent` 时强制静音 fallback
- 中文默认使用 macOS `Tingting`，英文默认使用 `Samantha`
- `types/video.ts` 在 Job 输出中记录 `voiceProvider`
- `/api/generate` 和 `/api/generate-voice` 返回实际语音文件和 provider
- `app/generate/generate-client.tsx` 在结果区展示 voiceover provider
- `lib/ffmpeg.ts` 合成时不再因较短音频提前截断视频，保持 15 秒输出

### 4.2 中文语音策略

步骤：
1. 自动识别中文脚本。
2. 中文默认女声/清晰口播。
3. 控制语速，目标 15 秒内读完。
4. 过长脚本自动压缩。

验收：
- “拉州拉面馆”能生成中文语音。
- 视频时长仍在 12-20 秒。

状态：已完成。

完成记录：
- 中文脚本自动传入 `generateVoiceover(..., { language: "zh" })`
- 中文口播文本会压缩到适合 15 秒以内的长度
- 本地验证中“拉州拉面馆”生成 `voiceProvider=system:Tingting`
- `ffprobe` 验证输出 MP4 为 1080x1920，含 H.264 视频流和 AAC 音频流，时长 15.000000 秒

## Phase 5：质量、测试与可观测性（部分完成）

目标：减少回归，生成结果可追踪。

### 5.1 单元测试

文件：
- `lib/*.test.ts`

步骤：
1. 测试 `normalizeReviews`。
2. 测试中文脚本生成。
3. 测试行业识别。
4. 测试 Job Store 状态流转。

验收：
- 核心纯函数有测试覆盖。

状态：已完成。

完成记录：
- 新增 `vitest.config.ts`，配置路径别名和测试目录
- `package.json` 增加 `test` 和 `test:watch` 脚本
- `lib/ai.test.ts`：18 个测试覆盖 normalizeReviews、英文/中文脚本生成、6 种行业识别、关键词提取、CTA 生成
- `lib/jobs.test.ts`：14 个测试覆盖 createVideoJob、getVideoJob、updateVideoJob、markJobStep 状态流转、listVideoJobs
- `lib/templates.test.ts`：8 个测试覆盖 getVideoTemplate、默认模板、模板结构完整性
- `npm run test` 全部 40 pass

### 5.2 API 集成测试

文件：
- `scripts/smoke.mjs`

步骤：
1. 更新 smoke 脚本为 `/api/generate`。
2. 校验返回 job done。
3. 校验 MP4 存在。
4. 调用 ffprobe 校验宽高和时长。

验收：
- 一条命令能验证完整生成链路。

### 5.3 运行指标

步骤：
1. 记录每一步耗时。
2. 记录成功/失败。
3. 前端展示总耗时。

验收：
- job 返回 `metrics.totalMs` 和每一步耗时。

状态：已完成。

完成记录：
- `lib/jobs.ts` `markJobStep` 计算每个步骤 `durationMs`
- `app/api/generate/route.ts` 记录 `metrics.totalMs`
- `app/generate/generate-client.tsx` 展示每个步骤耗时和总耗时

## Phase 6：部署准备（部分完成）

目标：为部署到 Vercel 扫清障碍，同时把不适合 Vercel Functions 的媒体处理拆出来。

### 6.1 Vercel 部署护栏

文件：
- `vercel.json`
- `.gitignore`
- `.env.example`
- `docs/VERCEL_DEPLOYMENT.md`
- `lib/deployment.ts`

步骤：
1. 新增 Vercel 函数配置，为生成接口预留更长执行时间和内存。
2. 忽略 `.next`、`node_modules`、`public/generated`、本地 env 文件。
3. 增加环境变量示例。
4. 编写 Vercel 部署计划文档。
5. 在 Vercel 环境中，如果还未接入 Blob/云 TTS/远程 renderer，媒体 API 返回明确配置错误。

验收：
- 本地生成流程不受影响。
- Vercel 未完成媒体服务接入前不会误调用 `qlmanage` / `say` / 本地磁盘输出。

状态：部分完成。

完成记录：
- 新增 `vercel.json`
- 新增 `.gitignore`
- 新增 `.env.example`
- 新增 `docs/VERCEL_DEPLOYMENT.md`
- 新增 `lib/deployment.ts`
- `/api/generate`、`/api/generate-images`、`/api/generate-voice`、`/api/generate-video`、`/api/uploads` 已接入生产媒体护栏

### 6.2 文件存储

步骤：
1. 抽象 storage provider。
2. 本地存储为 default。
3. 预留 S3/R2 provider。

验收：
- 生成文件 URL 不依赖硬编码路径。

状态：部分完成。

完成记录：
- 新增 `lib/storage.ts`
- `lib/fs.ts` 改为兼容导出，避免大范围破坏旧调用点
- 上传图片改为通过 `saveGeneratedAsset`
- 新增 `@vercel/blob`，生产配置 `STORAGE_PROVIDER=blob` 且存在 `BLOB_READ_WRITE_TOKEN` 时，上传图片可写入 Vercel Blob
- 场景图、静音音频、TTS 音频、最终 MP4 改为通过 `generatedPath` / `publicGeneratedUrl` 生成路径和 URL

剩余工作：
- 把音频、场景图和视频输出也接入 Blob
- 支持从 Blob URL 读取 renderer 输入，避免生产环境依赖本地文件路径
- 与远程 renderer 打通最终 MP4 Blob URL

### 6.3 云端 TTS

步骤：
1. 保留本地 `system` provider。
2. 新增 `cloud` provider。
3. 使用 `TTS_API_KEY` 生成中文语音。
4. 失败时返回明确错误或降级为静音。

验收：
- Vercel 上不依赖 macOS `say`。
- 中文“拉州拉面馆”能生成真实语音。

状态：部分完成。

完成记录：
- `lib/tts.ts` 新增 `cloud` / `remote` provider
- 生产环境默认 provider 从 `system` 切到 `cloud`
- 远程 TTS 请求使用 `TTS_ENDPOINT_URL` 和 `TTS_API_KEY`
- 远程 TTS 响应支持 `audioUrl`，也支持 `audioBase64` + `contentType`
- `audioBase64` 响应会通过 storage provider 保存，本地写 `public/generated`，生产可写 Blob
- `/api/generate-voice` 在 Vercel 上配置云端 TTS 后可单独放行

剩余工作：
- 选择实际 TTS 供应商或自建 TTS endpoint
- 为云端 TTS 增加 provider-specific 错误映射和重试
- 在远程 renderer 接入后，把 `/api/generate` 的完整生产链路放行

### 6.4 远程视频渲染服务

步骤：
1. 定义 `VIDEO_RENDERER_URL` 请求协议。
2. Vercel API 把 script、image URLs、audio URL、templateId、subtitles 发给 renderer。
3. Renderer 负责 FFmpeg 合成并返回 MP4 URL。
4. 前端继续只调用 `/api/generate`。

验收：
- Vercel 上最终返回可下载 MP4。
- 输出仍为 1080x1920，12-20 秒。

状态：部分完成。

完成记录：
- 新增 `lib/video-renderer.ts`
- 本地默认继续使用 `local:ffmpeg`
- 配置 `VIDEO_RENDERER_URL` 和 `VIDEO_RENDERER_TOKEN` 后切换为远程 renderer
- `/api/generate` 在远程 renderer 模式下跳过本地场景图生成，避免 Vercel 调用 `qlmanage`
- `/api/generate` 会把 businessName、reviews、script、imageUrls、audioUrl、subtitles、templateId 和 1080x1920/15s 输出要求发给 renderer
- `/api/generate-video` 支持远程 renderer，并返回 renderer provider
- Vercel 媒体护栏支持完整远程 pipeline 放行，也支持单独 video renderer 放行

剩余工作：
- 选择实际 renderer 部署平台
- 实现 renderer 服务端 FFmpeg 合成
- renderer 输出 MP4 写入 Blob 或外部对象存储
- 使用 Vercel 环境变量跑线上完整端到端验证

## 6. 当前执行顺序

优先执行：
1. Phase 1.1：统一生成 API + Job Store。
2. Phase 1.2：Job 查询 API。
3. Phase 1.3：前端改为调用统一生成 API。
4. Phase 5.2：更新 smoke 脚本。

然后执行：
5. Phase 2.1：中文脚本增强。
6. Phase 2.2：行业识别。
7. Phase 3：图片上传和模板系统。
8. Phase 4：中文 TTS 与音频体验。

当前已完成 Phase 1-4，Phase 6 已开始。Phase 6.2 已完成 storage 抽象和上传图片 Blob 分支，Phase 6.3 已完成远程 TTS adapter，Phase 6.4 已完成远程 video renderer adapter。下一阶段建议实现实际 renderer 服务并跑 Vercel 线上端到端验证。

## 7. 风险与缓解

风险：内存 Job Store 重启丢失。
缓解：短期接受；中期切换 SQLite/Postgres。

风险：QuickLook 只适合 macOS 本地。
缓解：生产阶段替换为跨平台渲染器。

风险：同步生成请求可能超过生产函数限制。
缓解：Phase 1 先稳定接口形状，Phase 6 改 worker。

风险：真实 TTS/图片生成带来成本。
缓解：保留 fallback provider，增加 provider 配置和失败降级。

## 8. 验证清单

每次阶段完成后至少运行：
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- 本地浏览器打开 `/generate`
- 使用中文样例“兰州拉面馆”生成视频
- `ffprobe` 校验 MP4 为 1080x1920，时长 12-20 秒

## 9. 当前执行记录

- [x] Phase 1.1 统一生成 API + Job Store
  - 新增 `lib/jobs.ts`
  - 新增 `app/api/generate/route.ts`
  - 扩展 `types/video.ts` 中的 `VideoJob`
- [x] Phase 1.2 Job 查询 API
  - 新增 `app/api/jobs/[id]/route.ts`
- [x] Phase 1.3 前端改为统一生成 API
  - `app/generate/generate-client.tsx` 已改为一次调用 `/api/generate`
  - 页面显示 job id、总耗时、各阶段耗时
- [x] Phase 5.2 更新 smoke 脚本
  - `scripts/smoke.mjs` 已改为验证 `/api/generate` 和 `/api/jobs/:id`
- [x] Phase 1 验证
  - `npm run lint` 通过
  - `npm run typecheck` 通过
  - `node ./scripts/smoke.mjs` 通过
  - `ffprobe` 验证最新 MP4 为 1080x1920，15.000000 秒

下一步：进入 Phase 2.1，增强中文脚本质量和行业识别。

- [x] Phase 2.1 中文脚本增强
  - `lib/ai.ts` 已加入中文 tone、keywords 输出
  - 餐饮中文 hook 优先使用口味关键词，例如“汤头香”
  - 中文 social proof 使用“食客都夸”表达
- [x] Phase 2.2 行业识别
  - `lib/ai.ts` 已加入 food/beauty/repair/fitness/education/general 分类
  - 餐饮 CTA 会生成“今天就去...吃一碗”
- [x] Phase 2 验证
  - “拉州拉面馆”识别为 `food`
  - hook 输出“拉州拉面馆，汤头香别错过”
  - `/api/generate` 中文完整链路通过
  - `ffprobe` 验证最新中文 MP4 为 1080x1920，15.000000 秒

下一步：进入 Phase 3.1，增加店铺图片上传 UI 与上传 API。

- [x] Phase 3.1 图片上传 UI
  - 新增上传 API 和上传文件保存逻辑
  - 前端支持最多 5 张 JPG/PNG/WEBP 图片上传
  - 前端显示缩略图和删除按钮
- [x] Phase 3.2 视频场景使用用户图片
  - `/api/generate` 支持 `imageUrls`
  - 生成场景图时优先把上传图片作为背景
  - 不足 3 张时复用第一张图片并保留模板兜底
- [x] Phase 3 局部验证
  - 上传 API smoke 通过
  - 带上传图片的 `/api/generate` 完整链路通过
  - `ffprobe` 验证 MP4 为 1080x1920，15.000000 秒
  - 浏览器确认上传 UI 可见且无 console error

- [x] Phase 3.3 模板系统
  - 新增 `bold-food`、`clean-service`、`warm-local` 三套模板
  - 前端支持模板选择并保存到 localStorage
  - 后端按模板控制场景颜色、中文/英文标签、图片蒙层和 footer
- [x] Phase 3 完整验证
  - `warm-local` 模板 `/api/generate` 通过
  - `ffprobe` 验证模板视频为 1080x1920，15.000000 秒
  - 浏览器确认模板 UI 可见且无 console error

已执行：进入 Phase 4.1，抽象 TTS provider，并完成真实中文语音接入。

- [x] Phase 4.1 TTS Provider 抽象
  - `lib/tts.ts` 支持 `system` 和 `silent` provider
  - `TTS_PROVIDER=silent` 可强制使用静音 fallback
  - Job 输出记录 `voiceProvider`
  - 前端结果区展示实际语音 provider
- [x] Phase 4.2 中文语音策略
  - 中文脚本默认使用 macOS `Tingting` 语音
  - 英文脚本默认使用 macOS `Samantha` 语音
  - 口播文本自动压缩，避免中文脚本过长
  - TTS 失败时自动回退为静音音轨
- [x] Phase 4 验证
  - 中文“拉州拉面馆”完整 UI 生成通过
  - 页面显示 `Voiceover provider: system:Tingting`
  - `ffprobe` 验证中文 MP4 为 1080x1920，15.000000 秒，含 AAC 音频流
  - `npm run lint`、`npm run typecheck`、`npm run build` 均通过

下一步：进入 Phase 5.1，补核心纯函数和 Job Store 的单元测试。

- [x] Phase 5.1 单元测试
  - 新增 `vitest.config.ts`，配置 `@` 路径别名和 `lib/*.test.ts` 测试目录
  - `package.json` 增加 `npm run test` 和 `npm run test:watch` 脚本
  - `lib/ai.test.ts`：18 个测试覆盖 normalizeReviews、英文/中文脚本生成、6 种行业识别（food/beauty/repair/fitness/education/general）、关键词提取、CTA 生成
  - `lib/jobs.test.ts`：14 个测试覆盖 createVideoJob、getVideoJob、updateVideoJob（top-level/output/metrics/steps 合并）、markJobStep（processing/done/failed/skipped 状态流转和 durationMs 计算）、listVideoJobs
  - `lib/templates.test.ts`：8 个测试覆盖 getVideoTemplate 有效/无效 ID、默认模板、模板结构完整性（3 色彩/3 标签/透明度范围）
  - `npm run test` 全部 40 pass

下一步：进入 Phase 5.3 运行指标增强，或进入 Phase 6 完成部署准备。

- [x] Phase 5.3 运行指标
  - `lib/jobs.ts` `markJobStep` 计算每个步骤 `durationMs`
  - `app/api/generate/route.ts` 记录 `metrics.totalMs`
  - `app/generate/generate-client.tsx` 展示每个步骤耗时和总耗时

- [x] Phase 6.1 Vercel 部署验证
  - Vercel 项目 `reviewreel` 已创建并成功部署
  - 前端 `/generate` 正常渲染（HTTP 200）
  - `/api/generate` 在未配置远程服务时正确返回 501 `MEDIA_RUNTIME_NOT_CONFIGURED`
  - 移除 `vercel.json` 中被忽略的 `memory` 配置
  - 生产 URL: https://reviewreel-tau.vercel.app

下一步：配置 Vercel 环境变量（Blob + 云 TTS + 远程 renderer）以打通完整生产链路。
