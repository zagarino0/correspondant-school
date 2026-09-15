import { buildApp } from "./app/buildApp.js";
import { env } from "./config/env.js";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    app.log.info(
      `School Connect API running on http://localhost:${env.PORT}`
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();