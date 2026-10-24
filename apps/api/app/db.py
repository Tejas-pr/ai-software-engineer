from sqlmodel import Session, create_engine

from app.config import settings

# create_engine establishes a connection pool to PostgreSQL.
# pool_pre_ping=True ensures stale connections (e.g. Neon serverless idle) are health-checked.
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT.lower() != "production",
    pool_pre_ping=True,
)


# Dependency to provide a database session per request
def get_session():
    with Session(engine) as session:
        yield session
