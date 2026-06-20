import bcrypt from "bcryptjs";
import { prisma } from "./client";

const defaultChannels = [
  ["general", "Daily conversation and everything else."],
  ["sports", "Games, takes, fantasy, and watch parties."],
  ["gaming", "Squads, queues, patches, and clips."],
  ["plans", "Actual plans that need decisions."],
  ["memes", "Low-stakes chaos."]
] as const;

export async function seedDatabase() {
  for (const [name, topic] of defaultChannels) {
    await prisma.channel.upsert({
      where: { name },
      update: { topic, isDefault: true },
      create: { name, topic, isDefault: true }
    });
  }

  await seedOwner();
}

async function seedOwner() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Skipping owner seed; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create the first invite owner.");
    return;
  }

  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      displayName: process.env.SEED_ADMIN_NAME ?? "Organizer",
      role: "owner",
      passwordHash: await bcrypt.hash(password, 12)
    },
    create: {
      email,
      displayName: process.env.SEED_ADMIN_NAME ?? "Organizer",
      role: "owner",
      passwordHash: await bcrypt.hash(password, 12),
      emailVerifiedAt: new Date(),
      profile: { create: {} },
      notificationPrefs: { create: {} }
    }
  });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id }
  });
  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id }
  });

  console.log(`Seeded owner account ${email}.`);
}
