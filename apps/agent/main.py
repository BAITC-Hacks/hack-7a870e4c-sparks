from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent.advisor import Advisor
from agent.openai_agent import recommend
from agent.schemas import ChatRequest, PlanRequest, Recommendations

load_dotenv()

app = FastAPI(title="Career Quest Agent", version="0.2.0")
origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


class ChatResponse(BaseModel):
    employee_id: str
    reply: str
    plan: dict[str, Any]
    recommendations: Recommendations


def _advisor(request: PlanRequest | ChatRequest) -> Advisor:
    try:
        return Advisor(request.context)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/advisor/plan")
def career_plan(request: PlanRequest) -> dict:
    return _advisor(request).plan()


@app.post("/api/v1/advisor/recommendations", response_model=Recommendations)
async def recommendations(request: PlanRequest) -> Recommendations:
    return await recommend(_advisor(request))


@app.post("/api/v1/advisor/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    advisor = _advisor(request)
    result = await recommend(advisor, request.message, request.conversation_history)
    return ChatResponse(
        employee_id=request.context.employee.employee_id,
        reply=result.message,
        plan=advisor.plan(result.recommendations),
        recommendations=result,
    )
