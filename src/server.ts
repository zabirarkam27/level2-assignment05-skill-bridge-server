import app from "./app";
import "./routes";
import { prisma } from "./lib/prisma";
import "dotenv/config";

const PORT = process.env.PORT || 5000;
async function main() {
  try {
    await prisma.$connect();
    console.log("Database connected successfully.");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
