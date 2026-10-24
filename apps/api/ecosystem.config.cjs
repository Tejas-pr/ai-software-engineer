const path = require("path");

module.exports = {
  apps: [
    {
      name: "ai-engineer-api",
      script: path.resolve(__dirname, "start.sh"),
      interpreter: "bash",
      cwd: __dirname,
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
