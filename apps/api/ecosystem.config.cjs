const path = require("path");

module.exports = {
  apps: [
    {
      name: "ai-engineer-api",
      script: path.resolve(__dirname, ".venv/bin/uvicorn"),
      args: "app.main:app --host 0.0.0.0 --port 8000",
      cwd: __dirname,
      interpreter: "none",
      env: {
        ENVIRONMENT: "production",
      },
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true,
      time: true,
    },
  ],
};
