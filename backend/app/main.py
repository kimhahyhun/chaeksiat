from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app.routers import children, books, analysis, goals, career


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="책씨앗 API",
    description="아이의 독서 습관을 자라나게 하는 맞춤형 성장 플랫폼",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
        "https://chaeksiat.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(children.router, prefix="/api")
app.include_router(books.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(career.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "책씨앗 API 서버가 실행 중이에요 🌱"}
