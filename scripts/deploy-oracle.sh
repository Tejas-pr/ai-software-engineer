#!/usr/bin/env bash
set -e

# ==============================================================================
# Oracle VM Deployment & Setup Script for AI Software Engineer Backend
# Run this directly on the Oracle Cloud instance or execute via SSH:
#   ssh oracle 'bash -s' < scripts/deploy-oracle.sh
# ==============================================================================

echo "========================================================"
echo "🚀 Setting up AI Software Engineer API on Oracle VM"
echo "========================================================"

APP_DIR="${APP_DIR:-$HOME/ai-software-engineer}"

# 1. Install Astral UV (Fast Python package manager) if not installed
if ! command -v uv &> /dev/null && [ ! -f "$HOME/.local/bin/uv" ]; then
  echo "📦 Installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi

export PATH="$HOME/.local/bin:$PATH"

# 2. Clone or update repository
if [ ! -d "$APP_DIR" ]; then
  echo "📥 Cloning repository into $APP_DIR..."
  git clone https://github.com/Tejas-pr/ai-software-engineer.git "$APP_DIR"
fi

cd "$APP_DIR"
echo "🔄 Pulling latest main branch..."
git fetch origin main
git checkout main
git reset --hard origin/main
chmod +x "$APP_DIR/apps/api/start.sh" "$APP_DIR/scripts/deploy-oracle.sh" 2>/dev/null || true

# 3. Install Python 3.13 and dependencies
cd "$APP_DIR/apps/api"
echo "🐍 Syncing Python 3.13 virtual environment..."
uv python install 3.13
uv sync

# 4. Check for .env file
if [ ! -f "$APP_DIR/apps/api/.env" ]; then
  echo "⚠️  No .env file found at $APP_DIR/apps/api/.env!"
  echo "📄 Creating a template .env file..."
  cp "$APP_DIR/apps/api/.env.example" "$APP_DIR/apps/api/.env"
  echo "👉 Please edit $APP_DIR/apps/api/.env with your Neon PostgreSQL URL and GitHub OAuth credentials."
fi

# 5. Run database migrations if .env exists
if [ -f "$APP_DIR/apps/api/.env" ]; then
  echo "🗄️ Running Alembic database migrations..."
  uv run alembic upgrade head || echo "⚠️ Migration skipped (check DATABASE_URL in .env)"
fi

# 6. Ensure firewall allows port 8000
echo "🛡️ Verifying firewalld rule for port 8000/tcp..."
if command -v firewall-cmd &> /dev/null; then
  sudo firewall-cmd --permanent --add-port=8000/tcp || true
  sudo firewall-cmd --reload || true
fi

# 7. Start or restart backend with PM2
echo "⚡ Managing process with PM2..."
chmod +x "$APP_DIR/apps/api/start.sh" 2>/dev/null || true
pm2 delete ai-engineer-api 2>/dev/null || true
pm2 start "$APP_DIR/apps/api/ecosystem.config.cjs"
pm2 save

echo "========================================================"
echo "✅ AI Software Engineer API is running on port 8000!"
echo "📡 Check status with: pm2 status"
echo "📋 View logs with:    pm2 logs ai-engineer-api"
echo "========================================================"

