/**
 * One-off script to remove Tag records that are no longer associated with any recipe.
 * Run with: npm run db:cleanup-tags
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.DATABASE_URL ?? "file:./prisma/data/recipes.db";
const adapter = new PrismaLibSql({ url });
const db = new PrismaClient({ adapter });

async function main() {
  const { count } = await db.tag.deleteMany({ where: { recipes: { none: {} } } });
  console.log(`Deleted ${count} orphaned tag(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
