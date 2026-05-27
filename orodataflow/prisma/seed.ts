import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@dataflow.local";
  const password = process.env.ADMIN_PASSWORD || "changeme123";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin user already exists:", email);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { email, passwordHash } });
    console.log("Seeded admin user:", email);
  }

  await prisma.appConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  console.log("AppConfig ready.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
