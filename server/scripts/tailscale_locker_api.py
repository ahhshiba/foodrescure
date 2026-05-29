# -*- coding: utf-8 -*-
"""樹莓派智慧置物櫃中控中心 (模擬腳本)

本腳本用來模擬智慧置物櫃地端樹莓派的運作邏輯：
1. 接收來自伺服器端推送的線上預約卡片 UID。
2. 模擬使用者刷卡開門。
3. 模擬超音波感測器偵測剩食是否被取走，並將結果回傳給伺服器端。

【安裝與執行指令】
在樹莓派上執行以下指令：

1. 安裝套件：
   pip install fastapi uvicorn httpx

2. 啟動服務（請將 host 綁定在 0.0.0.0 或樹莓派的 Tailscale 內網 IP）：
   python tailscale_locker_api.py
   或使用 uvicorn 直接啟動：
   uvicorn tailscale_locker_api:app --host 0.0.0.0 --port 8000 --reload
"""

import logging
import asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
import httpx

# 設置日誌
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("LockerHub")

app = FastAPI(
    title="樹莓派智慧置物櫃模擬器",
    description="智慧置物櫃地端中控系統 API",
    version="1.0.0"
)

# 模擬地端記憶體：儲存目前被預約的卡片 UID
# 格式：{"card_uid": "node_id"}
active_reservations = {}

# 預設伺服器位址 (請根據您實際的伺服器 Tailscale IP 進行修改)
SERVER_URL = "http://localhost:8000"


class ReservePayload(BaseModel):
    uid: str
    node_id: str


class SimulateSwipePayload(BaseModel):
    uid: str
    server_ip: Optional[str] = None  # 可選，手動指定中央伺服器 IP


@app.post("/api/reserve")
async def receive_reservation(payload: ReservePayload):
    """
    【API 1】接收伺服器端推送的預約資訊。
    當後端玩家觸發線上預約時，伺服器會主動向樹莓派發送此 POST 請求。
    """
    uid = payload.uid
    node_id = payload.node_id
    
    # 記錄至地端快取
    active_reservations[uid] = node_id
    log.info(f"【預約成功】已記錄預約卡號 UID: {uid} (櫃位節點: {node_id})")
    
    return {
        "status": "success",
        "message": f"卡片 {uid} 已成功於置物櫃 {node_id} 完成預約登記。"
    }


@app.post("/api/simulate_swipe")
async def simulate_swipe(payload: SimulateSwipePayload):
    """
    【模擬測試 API】模擬使用者到機台刷卡取貨。
    本 API 會觸發開門，並藉由模擬超音波偵測，將結果回報給中央伺服器。
    """
    uid = payload.uid
    server_host = payload.server_ip or SERVER_URL

    # 檢查是否有該卡號的預約
    if uid not in active_reservations:
        log.warning(f"【刷卡拒絕】未授權的卡號 {uid} 嘗試刷卡。")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="此卡號無效或未在該置物櫃登記預約項目。"
        )

    node_id = active_reservations[uid]
    log.info(f"【刷卡授權】卡號 {uid} 驗證通過，執行開門繼電器控制... 櫃門已解鎖開啟！")

    # 模擬實體動作與超音波偵測 (超音波感測器通常會有短暫延遲偵測物品狀態)
    await asyncio.sleep(1.0) 

    # 這裡我們隨機或默認模擬「成功取走貨物 (90%)」或「忘記拿走物品 (10%)」
    # 在實際硬體上，您會讀取樹莓派的 GPIO 超音波感測器數值
    import random
    pickup_success = random.random() < 0.9  # 90% 成功機率

    result_status = "success" if pickup_success else "failed"

    if pickup_success:
        log.info("【超音波偵測】貨物已被安全取走，櫃門已安全鎖上。")
    else:
        log.warning("【超音波警告】物品仍在櫃內！櫃門強行關閉上鎖，發出警報！")

    # 移除地端預約
    del active_reservations[uid]

    # 【API 2】向伺服器端回報狀態
    report_url = f"{server_host}/api/report_status"
    log.info(f"【狀態回報】正在向伺服器發送狀態回報: POST {report_url}")
    
    report_data = {
        "uid": uid,
        "result": result_status
    }

    # 加上 ngrok-skip-browser-warning 標頭，防止回報時被 ngrok 的安全阻擋頁面攔截
    headers = {
        "ngrok-skip-browser-warning": "true"
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(report_url, json=report_data, headers=headers, timeout=5.0)
            if resp.status_code == 200:
                log.info(f"【回報成功】伺服器已成功接收結果並完成結算。")
                return {
                    "status": "success",
                    "pickup_result": result_status,
                    "server_response": resp.json()
                }
            else:
                log.error(f"【回報失敗】伺服器回應錯誤碼: {resp.status_code}")
                return {
                    "status": "warning",
                    "pickup_result": result_status,
                    "message": f"狀態已送出，但伺服器回傳狀態碼: {resp.status_code}"
                }
    except Exception as e:
        log.error(f"【連線失敗】無法連線至中央伺服器 {server_host}: {e}")
        return {
            "status": "connection_error",
            "pickup_result": result_status,
            "message": f"無法連線至伺服器: {e}"
        }


@app.get("/api/active_reservations")
async def list_reservations():
    """查看目前置物櫃中已快取的預約卡號清單。"""
    return active_reservations


if __name__ == "__main__":
    import uvicorn
    # 啟動 FastAPI 伺服器
    uvicorn.run(app, host="0.0.0.0", port=8001)
