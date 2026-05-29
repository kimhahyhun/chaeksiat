from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    library_api_key: str
    database_url: str = "sqlite+aiosqlite:///./chaeksiat.db"

    class Config:
        env_file = ".env"

settings = Settings()
