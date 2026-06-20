import { prisma } from "@sandcastle/db";
import { seedDatabase } from "../../../packages/db/src/seed";

await seedDatabase()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
