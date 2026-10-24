module.exports = {
  apps: [
    {
      name: "ai-engineer-api",
      script:
        process.env.UV_BIN ||
        (process.env.HOME ? `${process.env.HOME}/.local/bin/uv` : "uv"),
      args: "run uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1",
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
