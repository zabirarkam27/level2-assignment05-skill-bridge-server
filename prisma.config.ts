import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema",
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
