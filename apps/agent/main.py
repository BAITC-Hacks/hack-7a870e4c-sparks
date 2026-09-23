from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import APIConnectionError, APIStatusError, APITimeoutError

from agent.advisor import Advisor
from agent.openai_agent import OpenAIConfigurationError, generate_reply
from agent.schemas import ChatRequest, PlanRequest


load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="Career Quest Agent", version="0.1.0")
origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/advisor/plan")
def career_plan(request: PlanRequest) -> dict:
    try:
        return Advisor(request.context).plan()
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/api/v1/advisor/chat")
async def chat(request: ChatRequest) -> dict:
    try:
        advisor = Advisor(request.context)
        plan = advisor.plan()
        reply = await generate_reply(advisor, plan, request.message, request.conversation_history)
        return {
            "employee_id": request.context.employee.employee_id,
            "reply": reply,
            "plan": plan,
        }
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except OpenAIConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except APITimeoutError as error:
        raise HTTPException(status_code=504, detail="Таймаут ответа OpenAI") from error
    except (APIConnectionError, APIStatusError) as error:
        raise HTTPException(status_code=502, detail="Не удалось получить ответ OpenAI") from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail="OpenAI не вернул текстовый ответ") from error
