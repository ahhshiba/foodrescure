# ⚡ Glitch Salvage: Neon Feast (破圖回收：霓虹盛宴)

> **將校園剩食救援轉化為賽博龐克風格的資源回收與養成遊戲，結合邊緣 AI、物聯網與車隊學習（Fleet Learning）的 ESG 解決方案。**

## 📖 專案簡介

「破圖回收：霓虹盛宴」是一個為了解決校園與活動餐盒剩食浪費而生的即時轉讓系統。我們打破傳統「領取剩食」的社交標籤壓力，將其包裝成一款具備科技樹升級、資源管理與全域狀態連動的真實世界放置收集遊戲。

每一次的剩食救援，不僅是減少碳排放，更是透過使用者的事後回饋，為「真實世界剩食衰減預測模型」進行資料標註，實現越多人使用越聰明的資料飛輪（Data Flywheel）。

## 🏗️ 系統架構

本系統分為三大核心節點，透過 **Tailscale** 虛擬區域網路與 **Nginx** 反向代理進行通訊橋接：

1. **邊緣端 (Edge Node) - 樹梅派 + 實體智慧櫃**
   - **硬體**：Raspberry Pi 4/5、RFID RC522 讀卡機、繼電器 + 電磁鎖、USB 攝影機。
   - **AI 推論**：YOLOv8n (TFLite)，負責辨識放入餐盒的品項與數量。
   - **通訊**：MQTT 客戶端，斷線自動重連，負責向雲端回報狀態與接收開鎖指令。

2. **雲端後端 (Cloud Server) - 狀態指揮中心**
   - **核心**：Node.js (Express) 或 FastAPI，搭配 PostgreSQL。
   - **熱力學衰減引擎 (Decay Engine)**：動態計算食物健康度，溫度過高時呈指數衰減。
   - **通訊橋接 (The Bridge)**：內建 MQTT 訂閱邊緣端狀態，並透過 WebSocket 即時廣播給前端 App。

3. **應用前端 (Client UI) - 遊戲 App 與戰情室**
   - **UI 1 (玩家 App)**：全新升級的 3 欄式 Cyber-Grid 賽博龐克風格介面。支援完整的 i18n 雙語（中/英）無縫切換，並具備 Canvas 即時渲染的皮可敏 (Nanos) 收集動畫、硬體級 Context 數據面板、雷射雷達掃描 (Lidar Ping)、微型工作檯升級與即時脈衝動畫。
   - **UI 2 (ESG Dashboard)**：指揮中心視角，展示即時減碳量、網路拓樸與車隊預測模型準確度。

## ✨ 核心亮點功能

* **虛實資源轉換 (Deconstruct)**：實體餐盒 (如：排骨便當) 經 AI 辨識後，轉換為遊戲內的生化原料 (蛋白質、碳水化合物)，供玩家升級「奈米除蟲器 (Nanos)」。
* **熱力學急迫性**：食物健康度隨環境溫濕度動態衰減，健康度過低將轉化為「生化毒素」，需要高等級的 Nanos 才能處理。
* **全球熵值連動 (Global Entropy)**：系統剩食總量與衰減度會影響遊戲介面，熵值過高會導致畫面出現「破圖 (Glitch)」特效。
* **事後標註回饋 (Feedback Loop)**：領取食物兩小時後，系統推播請求玩家評分，完成 AI 訓練的資料閉環。

## 🚀 部署與啟動

詳細的環境設定與啟動步驟，請參閱下方的「如何開始 (Getting Started)」。

# Glitch Salvage: Neon Feast — Backend / Frontend / Infra

Campus surplus-food redistribution + fleet-learning system, disguised as a
cyberpunk resource-salvage game. Three parties:

```
Edge (Raspberry Pi smart cabinet, EXTERNAL team)  <—MQTT—>  Server (this repo)  <—REST/WS—>  Client (this repo)
```

This repo contains the **Server** (FastAPI), the **Client** (React: UI1 game + UI2
ESG dashboard), and **Infra** (Postgres / Mosquitto / nginx). The Raspberry Pi
Edge code is delivered separately — we integrate only through the frozen MQTT
contract in [`server/app/schemas/mqtt.py`](server/app/schemas/mqtt.py) and ship
`server/scripts/sim_edge.py` to simulate it.

> Dev environment: **Windows 11 + VS Code + Docker Desktop (WSL2)**. All shell
> commands below are **PowerShell**.

---

## Quick start

```powershell
# 1. Configure
Copy-Item .env.example .env
#   then edit .env — set real POSTGRES_PASSWORD / MQTT_PASSWORD / JWT_SECRET

# 2. Build + bring up the whole stack
#    (postgres + mosquitto + api + nginx; nginx also BUILDS both frontends)
docker compose up -d --build

# 3. Migrate + seed
docker compose run --rm api alembic upgrade head
docker compose run --rm api python -m app.seed.config_seed         # tunable constants
docker compose run --rm api python -m app.seed.mock_data --reset    # 30 days of demo data
docker compose run --rm api python -m app.seed.dev_seed             # 'neo' smoke account + card

# 4. Open it
#    Player game (UI1):  http://localhost/
#    ESG war room (UI2):  http://localhost/dashboard/
#    API health:          http://localhost/health
```

Then drive a live round (see the unlock pulse + resource credit in UI1):

```powershell
docker compose run --rm api python scripts/sim_edge.py --swipe
```

## Services & ports

| Service    | Container   | Host port         | Notes                                                  |
|------------|-------------|-------------------|--------------------------------------------------------|
| nginx      | `nginx`     | `80`              | serves UI1 at `/`, UI2 at `/dashboard/`; proxies `/api` + `/ws` |
| API        | `api`       | `8000` (+ `5678`) | FastAPI; 5678 = debugpy attach                         |
| Postgres   | `postgres`  | `5432`            | data in `pg_data` volume                               |
| Mosquitto  | `mosquitto` | `1883`            | user/pass from `.env`; the external Edge connects here |

> **Re-running** `docker compose up -d --build` rebuilds the frontends into the
> nginx image. For hot-reload UI development use the Vite dev servers instead
> (`npm run dev` / `npm run dev:dashboard`, see below).

## Tests / lint

```powershell
# Backend
docker compose run --rm api pytest
docker compose run --rm api ruff check .
docker compose run --rm api black --check .
docker compose run --rm api mypy app

# Frontend
cd web
npm install
npm run build:contracts
npm test
npm run lint
npm run typecheck
```

## Frontend — UI1 player game (`web/apps/game`)

Cyberpunk React app (recently overhauled to a 3-column native-scrolling grid): entropy-driven map glitch, Lidar ping, Nanos workbench, full i18n support (English/Traditional Chinese), a dedicated Canvas-based Nanos gathering simulation, unlock/credit animations, and auto-reconnecting WebSocket. Dev server proxies
`/api` + `/ws` to the backend on `:8000`.

```powershell
cd web
npm install
npm run dev          # http://localhost:5173  (game)
# other gates:
npm run typecheck    # contracts + game
npm run lint
npm test             # contracts + game store
npm run build        # production bundle (served by nginx in M7)
```

Log in by registering a new operator, or use the dev seed account
(`neo` / `password123`). Then drive `sim_edge.py` to see the unlock pulse,
Nanos swarm, resource credit, entropy glitch, bounty + purity events live.

## Frontend — UI2 ESG war room (`web/apps/dashboard`)

Big-screen ops dashboard (recharts, auto-refresh 8s): CO₂/cost/meals KPIs,
entropy trace, node topology, fleet-model accuracy gauge, leaderboard, live
salvage feed. Public data — no login.

```powershell
cd web
npm run dev:dashboard   # http://localhost:5174
```

Seed rich demo data first (30 days, ~750 transactions, hourly entropy):

```powershell
docker compose run --rm api python -m app.seed.mock_data --reset
```

## `sim_edge.py` (simulated Raspberry Pi)

Drives a full round (swipe → unlock → status → credit) against the broker so the
whole data flow is validated without physical hardware. Run the dev seed first
(creates the test player `neo`, a claimed card, nodes, foods, and prints a JWT):

```powershell
docker compose run --rm api python -m app.seed.dev_seed

# Terminal A — watch WebSocket events for user 1
docker compose run --rm api python scripts/ws_listen.py --user-id 1

# Terminal B — simulate one card swipe at node-01
docker compose run --rm api python scripts/sim_edge.py --swipe --items "porkchop_bento:2,chicken_bento:1"
```

The listener should print `unlock_success` → `resource_credited` → `entropy_update`.
From the Windows host instead of a container, add `--host localhost` to `sim_edge`
and `--url ws://localhost:8000/ws` to `ws_listen` (needs `pip install aiomqtt websockets pydantic`).

## External Edge onboarding

Hand the Edge team: the broker host/IP, `MQTT_USER` + `MQTT_PASSWORD` from
`.env`, and their assigned `node_id`. They publish/subscribe per the frozen
contract; the backend needs no changes.

## Windows / Docker Desktop notes

- `uvicorn --reload` file-watching over Windows bind mounts is unreliable — we
  set `WATCHFILES_FORCE_POLLING=true` in `.env`. Alternatively keep the repo
  inside the WSL2 filesystem for native reload.
- All code uses forward-slash paths; never hardcode Windows backslashes.
- In Docker Desktop, enable file sharing for the `D:` drive (Settings →
  Resources → File sharing) so the bind mounts work.
- `.gitattributes` forces LF on `*.sh` / Dockerfile / yaml / conf so CRLF never
  breaks the Linux containers.

## Milestones

- **M1** ✅ Contracts & skeleton — compose up, migrations, seed, contract types/tests.
- **M2** ✅ MQTT bridge + WS manager + deconstruct + `sim_edge.py` (full flow verified).
- **M3** ✅ decay engine + entropy snapshots + daily bounties + fleet-learning purity prompts on APScheduler.
- **M4** ✅ full REST API (auth, account, nodes, inventory, nanos upgrade, bounties, feedback, ESG/stats) + integration tests.
- **M5** ✅ UI1 game frontend — map glitch, Lidar ping, Nanos workbench, unlock/credit animations, auto-reconnect WS. (Overhauled: 3-column layout, canvas-based simulation, full i18n, ultra-detailed Game Manual).
- **M6** ✅ UI2 ESG dashboard (recharts war room) + 30-day mock data generator.
- **M7** ✅ nginx serves both built frontends + WS upgrade, healthchecks, full lint/typecheck/test green.

## Repo layout

```
glitch-salvage/
├── docker-compose.yml          # postgres · mosquitto · api · nginx(+frontends)
├── infra/
│   ├── nginx/{nginx.conf,Dockerfile}   # reverse proxy + multi-stage web build
│   └── mosquitto/{mosquitto.conf,entrypoint.sh}
├── server/                     # FastAPI backend
│   ├── app/
│   │   ├── schemas/            # contracts: mqtt (frozen) · ws · rest (Pydantic)
│   │   ├── db/models.py        # SQLAlchemy 2.0 schema (single source of truth)
│   │   ├── bridge/mqtt_bridge.py   # MQTT ↔ DB ↔ WS core
│   │   ├── engine/             # decay · economy · entropy · bounties (pure + repo)
│   │   ├── ws/                 # WebSocket manager + router
│   │   ├── api/                # REST routers (/api/v1)
│   │   ├── scheduler.py        # APScheduler jobs
│   │   └── seed/               # config_data + config/dev/mock seeders
│   ├── scripts/{sim_edge.py,ws_listen.py}
│   ├── alembic/                # migrations
│   └── tests/                  # pytest (contracts · economy · decay · bounties · api)
└── web/                        # npm workspaces monorepo
    ├── packages/contracts/     # @glitch/contracts — TS mirror of backend contracts
    └── apps/{game,dashboard}/  # UI1 player game · UI2 ESG war room
```
#
