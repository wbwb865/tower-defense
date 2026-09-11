# 边路塔防（Edge Tower Defense）

一款基于**格子边**移动的塔防小游戏：敌人从地图左侧或上方的边出生，沿着格子边前进到出口。玩家花费金币铺设**路块**调控敌人行进路线，在格子边上安置**武器**与**防具**击杀或阻挡敌人。

## 玩法简介

- 地图为 `x × y` 的网格，敌人沿**格子边**（而非格子内部）移动，出生点与出口在网格外圈。
- 敌人可**选择任意出口**：每条生成线的敌人会寻找**最近的、可达的出口**进入，堵死某个出口后会自动改走其他出口。
- 默认地图存在一条外圈路径；玩家可以：
  - **铺路**：在格子上放置路块，改变敌人行进路线（贪心寻路实时重算）；
  - **建塔**：在格子边上放置武器 / 防具，攻击或削弱经过的敌人；
  - **拆建**：拆除已放置的方块，返还 100% 费用；**敌人正在路块/桥上行走（或穿过桥）时不可拆除**。
- 敌人到达出口会扣除生命，生命归零则失败；撑过 15 波后进入无尽模式。

### 方块类型（铺在格子上）

| 类型 | 费用 | 效果 |
| --- | --- | --- |
| 普通路块 | 10 | 基础路径，敌人可通行 |
| 减速路块 | 20 | 敌人经过时速度减半 |
| 金币路块 | 30 | 敌人每经过一次获得 2 金币 |
| 桥路块 | 40 | 敌人可沿桥边行走，也可从一条边直穿到对边 |

### 武器（安放在格子边上）

| 类型 | 费用 | 效果 |
| --- | --- | --- |
| 箭塔 | 50 | 射速快，单体伤害 |
| 炮塔 | 100 | 范围爆炸伤害 |
| 冰塔 | 75 | 命中后减速敌人 |
| 毒塔 | 90 | 命中后持续中毒 |

### 防具（安放在格子边上）

| 类型 | 费用 | 效果 |
| --- | --- | --- |
| 减速带 | 40 | 经过的敌人被减速 2 秒 |
| 路障 | 60 | 经过的敌人被阻挡 1.5 秒 |

### 敌人类型

| 类型 | 特点 |
| --- | --- |
| 小兵 | 基础敌人 |
| 疾行者 | 速度快、血量低 |
| 坦克 | 血量高、速度慢 |
| 飞行者 | 免疫减速 |
| Boss | 每 5 波出现一次，高血量高奖励 |

波次难度随波数递增（敌人血量按 `1 + (n-1) * 0.12` 缩放），击杀敌人、金币路块、波次通关均可获得金币。

## 技术栈

- **前端**：Vue 3 + Vite + Element Plus + Vue Router + Axios
- **后端**：Spring Boot 3 + MyBatis + JWT
- **数据库**：MySQL 8（utf8mb4）
- **游戏引擎**：原生 Canvas 2D 渲染，自定义网格图 + BFS 寻路（`engine.js` / `graph.js` / `renderer.js` 前后端无关，可独立测试）

## 项目结构

```
tower-defense/
├── frontend/                  # Vue 3 前端
│   ├── src/
│   │   ├── game/              # 游戏引擎（纯 JS，无框架依赖）
│   │   │   ├── config.js      # 方块/武器/防具/敌人/波次配置
│   │   │   ├── graph.js       # 网格图与 BFS 寻路
│   │   │   ├── engine.js      # 游戏逻辑（敌人/战斗/经济/波次）
│   │   │   └── renderer.js    # Canvas 渲染
│   │   ├── components/        # BuildMenu / GameCanvas / TopBar
│   │   ├── views/             # 首页 / 游戏 / 登录 / 注册 / 排行榜
│   │   ├── api/               # Axios 封装
│   │   ├── store/             # 登录态管理
│   │   └── router/            # 路由
│   └── test/engine.test.mjs   # 引擎自动化测试
└── backend/                   # Spring Boot 后端
    ├── src/main/java/com/tdgame/
    │   ├── controller/        # 认证 / 关卡 / 战绩 / 排行榜
    │   ├── service/           # 业务逻辑
    │   ├── mapper/            # MyBatis 接口
    │   ├── entity/            # 实体类
    │   ├── config/            # JWT 拦截器
    │   └── common/            # JwtUtil / Result / UserContext
    ├── src/main/resources/    # application.yml + mapper XML
    └── sql/schema.sql         # 建库建表 + 种子关卡
```

## 快速开始

### 1. 初始化数据库

```bash
mysql -uroot -p < backend/sql/schema.sql
```

默认连接 `localhost:3306/tower_defense`，账号 `root`，密码可通过环境变量 `MYSQL_PASSWORD` 覆盖（默认 `111111`）。

### 2. 启动后端

```bash
cd backend
mvn spring-boot:run
```

服务运行在 `http://localhost:8080`。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`。Vite 已配置代理，`/api` 请求转发到后端 8080。

### 4. 运行引擎测试

```bash
cd frontend
node --test test/engine.test.mjs
```

覆盖寻路、铺路改道、堵路、波次、经济、塔攻击、拆除返还等 15 项核心机制。

## 后端 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录，返回 JWT |
| GET | `/api/levels` | 关卡列表 |
| POST | `/api/records` | 提交战绩（需登录） |
| GET | `/api/records/my` | 我的战绩（需登录） |
| GET | `/api/leaderboard` | 排行榜（每关每人取最高分） |

## 简历亮点

- 自研**网格图 + BFS 寻路**引擎，支持动态改道与实时路径重算，逻辑与渲染分离、可独立单元测试；
- 完整**前后端分离**架构：Vue 3 组件化 UI + Spring Boot REST API + MyBatis 持久化 + JWT 认证；
- 覆盖**游戏经济系统**（建造 / 击杀 / 波次奖励 / 拆除返还）与**波次难度曲线**设计。
