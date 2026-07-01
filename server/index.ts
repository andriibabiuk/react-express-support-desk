import express from "express";
import { prisma } from "./src/lib/prisma.ts";

const app = express();
const port = process.env.PORT ?? 4000;

app.use(express.json());

app.get("/api/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok", db: "connected" });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
