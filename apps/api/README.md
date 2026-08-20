# FastAPI Backend API

This is the backend API for the AI Software Engineer workspace, built with FastAPI, SQLModel, and PostgreSQL (with pgvector support).

---

## Database Migrations (Alembic)

Database schemas are managed using **Alembic** migrations. In development and production, you should always use Alembic to make database schema changes instead of letting SQLModel drop and recreate tables.

### 1. How to Add a New Model / Table

To add a new table to the database, follow these steps:

1. **Create the Model File**: Create a new file under `app/models/` (e.g., `app/models/item.py`) and declare your model class:
   ```python
   from datetime import datetime, timezone
   from sqlmodel import Field, SQLModel


   class Item(SQLModel, table=True):
       __tablename__ = "items"

       id: int | None = Field(default=None, primary_key=True)
       name: str = Field(index=True)
       description: str | None = Field(default=None)
       created_at: datetime = Field(
           default_factory=lambda: datetime.now(timezone.utc), nullable=False
       )
   ```

2. **Register the Model**: Import and register your model class in [`app/models/__init__.py`](file:///c:/Users/tejas/Documents/ai-software-engineer/apps/api/app/models/__init__.py) so that it is included in SQLModel's metadata when Alembic runs:
   ```python
   # app/models/__init__.py
   from app.models.project import Project
   from app.models.user import User
   from app.models.token import RefreshToken
   from app.models.item import Item  # <-- Add this import

   __all__ = ["Project", "User", "RefreshToken", "Item"]  # <-- Add to __all__
   ```

---

### 2. How to Create and Apply a Migration

Once your model has been created and registered, you need to generate a migration script and apply it to the database:

1. **Auto-Generate the Migration Script**:
   Run the following command in the `apps/api` directory:
   ```bash
   uv run alembic revision --autogenerate -m "add items table"
   ```
   *This will inspect your registered models, compare them to your running database, and generate a new Python script under `migrations/versions/`.*

2. **Check for Code-Gen NameErrors (Gotcha)**:
   Alembic sometimes generates types like `sqlmodel.sql.sqltypes.AutoString()` without importing `sqlmodel` at the top of the version script.
   
   Open the newly created migration file under `migrations/versions/` and verify that:
   ```python
   import sqlmodel
   ```
   is imported at the top if the script references `sqlmodel` (e.g. `sqlmodel.sql.sqltypes.AutoString`).

3. **Apply the Migration**:
   Run this command to execute the migration SQL and create the table:
   ```bash
   uv run alembic upgrade head
   ```

---

### 3. Alembic Command Cheat Sheet

You can run these commands directly using `uv` (from the `apps/api` directory) or via the shortcut scripts defined in `package.json` (from the root or `apps/api` directory):

| Action | Bun Script | Raw Command |
| :--- | :--- | :--- |
| **Generate migration** | `bun run db:generate -m "description"` | `uv run alembic revision --autogenerate -m "description"` |
| **Apply migrations** | `bun run db:migrate` | `uv run alembic upgrade head` |
| **Revert last migration** | `bun run db:rollback` | `uv run alembic downgrade -1` |
| **Check current revision** | `bun run db:status` | `uv run alembic current` |
| **View migration history** | *N/A* | `uv run alembic history --verbose` |

