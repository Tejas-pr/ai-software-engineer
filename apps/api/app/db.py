from sqlmodel import Session, create_engine

from app.config import settings

# create_engine establishes a connection pool to PostgreSQL.
# echo=True prints SQL statements to the console (useful in development).
engine = create_engine(settings.DATABASE_URL, echo=True)

# Dependency to provide a database session per request
def get_session():
    with Session(engine) as session:
        yield session
