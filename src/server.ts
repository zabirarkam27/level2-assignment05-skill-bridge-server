import app from "./app";
import "./routes";
import { prisma } from "./lib/prisma";
import "dotenv/config";

const PORT = process.env.PORT || 5000;

async function main() {
  try {
    await prisma.$connect();

    app.listen(PORT, () => {
      if (process.env.NODE_ENV === "development") {
        process.stdout.write(`Server is running on http://localhost:${PORT}\n`);
      }
    });
  } catch {
    await prisma.$disconnect();
    process.exit(1);
  }
}

main().catch(() => {
  process.exit(1);
});
