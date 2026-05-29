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

# 2. Bring up the stack (postgres + mosquitto + api + nginx)
docker compose up -d --build

# 3. Run DB migrations + seed the config tables
docker compose run --rm api alembic upgrade head
docker compose run --rm api python -m app.seed.config_seed

# 4. Health check
curl http://localhost:8000/health        # direct API
curl http://localhost/health             # via nginx
```

## Services & ports

| Service    | Container | Host port            | Notes                                  |
|------------|-----------|----------------------|----------------------------------------|
| API        | `api`     | `8000` (+ `5678`)    | FastAPI; 5678 = debugpy attach         |
| Postgres   | `postgres`| `5432`               | data in `pg_data` volume               |
| Mosquitto  | `mosquitto`| `1883`              | user/pass from `.env`; Edge connects here |
| nginx      | `nginx`   | `80`                 | reverse proxy + WebSocket upgrade      |

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
- M3 — decay / entropy / bounties / fleet-learning on APScheduler.
- M4 — full REST API + tests.
- M5 — UI1 game frontend.
- M6 — UI2 ESG dashboard + mock data generator.
- M7 — polish, healthchecks, full lint/typecheck/test green.
