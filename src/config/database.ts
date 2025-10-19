import { PrismaClient } from "../generated/prisma";
const prisma = new PrismaClient();

prisma.$connect().catch((err) => {
  console.error("Prisma connection error:", err);
  process.exit(1);
});

export default prisma;
