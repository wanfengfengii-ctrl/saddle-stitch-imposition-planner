# 骑马钉拼版推演台

街边数码印店接骑马钉小册子急单时，操作员若凭经验手排页码，一张纸放反就会让整本书页码倒序。
本工具是一个**纯前端拼版推演台**：输入成品总页数 P，实时算出每张纸正/背面从左至右应放的页码，
并做页码完整性校验。只有当 1…P 每个页码恰好出现一次时才显示 **PASS**，操作员可直接照屏装版；
任何异常都显示 **INVALID / INTERNAL ERROR**，且不输出可打印拼版。

- 技术栈：TypeScript + React 19 + Vite 7 + 原生 CSS
- 无后端、无网络请求：所有页码均由浏览器端公式实时计算，**没有任何固定结果表**
- 校验：Vitest 验证排列公式与完整性统计；Playwright 验证输入校验、正背面/纸张切换与打印稿

---

## 一、印刷与拼版约定（务必先读）

- 成品总页数 **P**：只接受 **4–64 的整数且必须被 4 整除**。一张对折纸（一个书帖）出 4 个成品页，共 **P/4 张纸**。
- 纸张按**装订后由外到内**编号，`i = 0 … P/4−1`（第 1 张是最外帖）。
- 设备方向约定：**观察者始终站在纸张同一侧，左右位置不做镜像翻转**。每张纸展示为：

  | 面     | 左       | 右        |
  | ------ | -------- | --------- |
  | 正面（左→右） | `P−2i`   | `1+2i`    |
  | 背面（左→右） | `2+2i`   | `P−1−2i`  |

- 示例 **P = 8（2 张纸）**：
  - 第 1 张（外，i=0）：正面 `8 · 1`，背面 `2 · 7`
  - 第 2 张（内，i=1）：正面 `6 · 3`，背面 `4 · 5`
  - 页码 1–8 各出现一次。
- 完整性规则：程序逐槽位统计出现次数，检查**缺失 / 重复 / 越界 / 槽位总数**。
  全部通过才显示 PASS；否则显示 **INTERNAL ERROR** 且页面上不渲染打印稿。
- 打印样式（浏览器“打印/另存为 PDF”）：隐藏全部交互界面，只输出按由外到内次序排列的纸张，
  每张纸正、背面各占一页，每页严格保持左右两栏、方向不镜像。

> 非法输入（越界、不能被 4 整除、非十进制整数等）显示 **INVALID**，同时**清空全部纸张**。
> 错误提示中的“最接近的合法值”是根据当前输入实时推算的，不是写死的文案。

---

## 二、本地开发与运行（不用 Docker）

需要 Node.js ≥ 20（开发验证使用 Node 22）。

```bash
npm install          # 安装依赖（生成 node_modules）

npm run dev          # 开发服务器，默认 http://localhost:5173
npm run build        # 类型检查 + 产出静态文件到 dist/
npm run preview      # 本地静态预览 dist/，默认 http://localhost:4173
```

验证命令：

```bash
npm run typecheck    # 仅 TypeScript 类型检查
npm run test:unit    # Vitest：排列公式 + 完整性统计（55 个用例）
npx playwright install chromium   # 首次运行 E2E 前下载浏览器
npm run e2e          # 先 build，再跑 Playwright（自动起 vite preview 承载 dist）
npm test             # 单元测试 + E2E 全量验收
```

Playwright 默认连本地 `http://127.0.0.1:4173`（由 `vite preview` 自动启动）；
也可用环境变量 `PLAYWRIGHT_BASE_URL` 指向任意已部署的静态地址（此时不会自起服务）。

---

## 三、Docker Compose（只承载静态 Web）

Compose 只包含两个服务，应用本身没有任何应用服务器：

| 服务     | 镜像 / 构成                          | 作用 |
| -------- | ------------------------------------ | ---- |
| `web`    | 多阶段构建：Node 构建 → nginx 承载 `dist/` | 仅提供静态 Web，容器内监听 80 |
| `verify` | 官方 Playwright 镜像（一次性容器）   | 跑类型检查、Vitest、构建和 Playwright，**退出码即验收结果**，跑完即退出 |

### 启动静态 Web（宿主端口由 WEB_PORT 覆盖）

```bash
# 默认宿主端口 8080
docker compose up --build -d web
# 打开 http://localhost:8080

# 覆盖宿主端口，例如 9000
WEB_PORT=9000 docker compose up --build -d web
# 打开 http://localhost:9000
```

端口映射为 `"${WEB_PORT:-8080}:80"`，不设置 `WEB_PORT` 时用 8080。
停止：`docker compose down`。

### 一次性验收服务 verify

`verify` 会等待 `web` 健康检查通过后，在官方 Playwright 容器内执行
`npm ci → 类型检查 → Vitest → vite build → Playwright（指向 http://web:80 实测静态站点）`：

```bash
docker compose run --build --rm verify
```

- 全部通过：退出码 0；
- 任一环节失败：退出码非 0，可直接接入 CI 作为门禁。
- 该服务是“run-and-exit”，不会长期驻留；也可用 `docker compose up --build --abort-on-container-exit verify` 触发。

---

## 四、界面与操作

1. 在“成品总页数 P”输入框输入页数，状态徽章实时显示 `IDLE / INVALID / PASS / INTERNAL ERROR`。
2. PASS 后：
   - **高亮区**一次突出一张纸，可用“正面/背面”切换、上一张/下一张浏览，并显示当前套用的公式与代入值；
   - **全部纸张摘要**按由外到内列出每张纸正背面页码，点击任意一行即可跳转到该张；
   - **页码完整性检查**列出槽位总数、缺失/重复/越界页码明细。
3. 浏览器打印（Ctrl/Cmd+P）时只输出按序排列、左右分栏的拼版稿；INVALID 或 INTERNAL ERROR 时打印稿不存在，无法误印。

---

## 五、目录结构

```
src/
  lib/imposition.ts          # 纯函数：输入校验、排列公式、完整性统计（错误反馈来自真实计算）
  lib/imposition.test.ts     # Vitest 单测
  components/                # 高亮纸张、摘要、完整性、打印稿组件
  App.tsx                    # 状态编排与 PASS/INVALID/INTERNAL ERROR 判定
  styles.css                 # 屏幕样式 + @media print 打印样式
e2e/app.spec.ts              # Playwright：输入、正背面/纸张切换、摘要、打印稿次序
Dockerfile.web               # 静态 Web 多阶段镜像（build → nginx）
docker-compose.yml           # web（WEB_PORT 覆盖）+ 一次性 verify
playwright.config.ts         # 本地自起 preview；容器内通过 PLAYWRIGHT_BASE_URL 指向 web
```

## 六、判定语义（实现约束）

- 输入合法且完整性通过 → **PASS**，渲染交互界面与打印稿。
- 输入非法 → **INVALID**，清空全部纸张，不渲染打印稿。
- 输入合法但完整性统计未通过（理论上不应发生）→ **INTERNAL ERROR**，不渲染打印稿。

页码与错误明细全部来自 `src/lib/imposition.ts` 的实时计算，禁止在组件中写入固定结果。
