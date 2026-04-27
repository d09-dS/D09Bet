import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const url = process.env.DATABASE_URL!;

let prisma: PrismaClient;
if (url.startsWith("prisma+postgres://") || url.startsWith("prisma://")) {
  prisma = new PrismaClient({ accelerateUrl: url });
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg");
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

async function main() {
  console.log("Seeding database...");

  // Categories
  const categories = [
    { name: "Sport", nameEn: "Sports", slug: "sport", iconName: "trophy", sortOrder: 1 },
    { name: "E-Sport", nameEn: "E-Sports", slug: "esport", iconName: "gamepad-2", sortOrder: 2 },
    { name: "Unternehmen", nameEn: "Company", slug: "company", iconName: "building", sortOrder: 3 },
    { name: "Fun", nameEn: "Fun", slug: "fun", iconName: "party-popper", sortOrder: 4 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log("  Categories seeded.");

  // System settings
  const settings = [
    { key: "initial_tokens", value: "1000", description: "Tokens allocated to new users on registration", dataType: "DECIMAL" },
    { key: "daily_bonus_amount", value: "2", description: "Daily login bonus amount", dataType: "DECIMAL" },
    { key: "daily_bonus_enabled", value: "true", description: "Whether daily login bonus is enabled", dataType: "BOOLEAN" },
    { key: "min_bet_stake", value: "0.5", description: "Minimum bet stake", dataType: "DECIMAL" },
    { key: "max_bet_stake", value: "100", description: "Maximum bet stake per single bet", dataType: "DECIMAL" },
    { key: "odds_min", value: "1.01", description: "Minimum allowed odds value", dataType: "DECIMAL" },
    { key: "odds_max", value: "50.0", description: "Maximum allowed odds value", dataType: "DECIMAL" },
    { key: "default_margin_factor", value: "0.95", description: "Default house margin factor for new markets (< 1 = house edge)", dataType: "DECIMAL" },
    { key: "default_virtual_pool", value: "100", description: "Default virtual liquidity pool for new markets (higher = more stable odds)", dataType: "DECIMAL" },
    { key: "min_bets_for_dynamic_odds", value: "5", description: "Minimum total bets on a market before odds start adjusting dynamically", dataType: "INTEGER" },
    { key: "leaderboard_enabled", value: "true", description: "Whether leaderboards are visible", dataType: "BOOLEAN" },
    { key: "daily_odds_change_percent", value: "5", description: "Daily percentage change applied to odds by the cron job (favourite decreases, others increase)", dataType: "DECIMAL" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log("  System settings seeded.");

  // Dev users
  const passwordHash = await bcrypt.hash("dotbet_dev", 10);
  const devUsers = [
    { id: "00000000-0000-0000-0000-000000000001", username: "admin", email: "admin@dotbet.dev", role: "ADMIN" as const, tokenBalance: 1000 },
    { id: "00000000-0000-0000-0000-000000000003", username: "user", email: "user@dotbet.dev", role: "USER" as const, tokenBalance: 1000 },
  ];

  for (const u of devUsers) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { ...u, passwordHash },
    });
  }
  console.log("  Dev users seeded (password: dotbet_dev).");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
