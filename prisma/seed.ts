import { PrismaClient, Role, TableStatus, KitchenStation } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "../src/lib/auth/password";

function decodePrismaDevApiKeyToDatabaseUrl(apiKey: string): string | null {
  try {
    const json = Buffer.from(apiKey, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    return typeof parsed?.databaseUrl === "string" ? parsed.databaseUrl : null;
  } catch {
    return null;
  }
}

function resolvePgConnectionString(): string | null {
  const pgUrl = process.env["PG_DATABASE_URL"];
  if (pgUrl) return pgUrl;

  const dbUrl = process.env["DATABASE_URL"];
  if (!dbUrl) return null;
  if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) return dbUrl;

  if (dbUrl.startsWith("prisma+postgres://") || dbUrl.startsWith("prisma+postgresql://")) {
    try {
      const url = new URL(dbUrl);
      const apiKey = url.searchParams.get("api_key");
      if (!apiKey) return null;
      return decodePrismaDevApiKeyToDatabaseUrl(apiKey);
    } catch {
      return null;
    }
  }

  return null;
}

const connectionString = resolvePgConnectionString();
if (!connectionString) {
  throw new Error(
    "No usable Postgres URL found. Set PG_DATABASE_URL (preferred) or use a prisma dev DATABASE_URL with api_key.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString })),
});

async function main() {
  const branch = await prisma.branch.upsert({
    where: { name: "Main Branch" },
    update: {},
    create: { name: "Main Branch", timezone: "Asia/Ho_Chi_Minh", currency: "VND" },
  });

  const adminPhone = "0900000000";
  const adminEmail = "admin@krinnt.local";
  const adminPass = "Admin@123";
  await prisma.user.upsert({
    where: { phone: adminPhone },
    update: { role: Role.ADMIN, branchId: branch.id, email: adminEmail },
    create: {
      phone: adminPhone,
      email: adminEmail,
      role: Role.ADMIN,
      passcode: "1234",
      passwordHash: await hashPassword(adminPass),
      branchId: branch.id,
    },
  });

  const tables = [
    { name: "Table 01", qrToken: "T01" },
    { name: "Table 02", qrToken: "T02" },
    { name: "Table 03", qrToken: "T03" },
    { name: "Table 04", qrToken: "T04" },
  ];
  for (const t of tables) {
    await prisma.table.upsert({
      where: { qrToken: t.qrToken },
      update: { name: t.name },
      create: { name: t.name, qrToken: t.qrToken, status: TableStatus.AVAILABLE, branchId: branch.id },
    });
  }

  const inv = await Promise.all([
    prisma.inventory.upsert({
      where: { ingredient: "Coffee beans" },
      update: {},
      create: { ingredient: "Coffee beans", stockQuantity: 5000, unit: "g", minThreshold: 500, branchId: branch.id },
    }),
    prisma.inventory.upsert({
      where: { ingredient: "Milk" },
      update: {},
      create: { ingredient: "Milk", stockQuantity: 20000, unit: "ml", minThreshold: 2000, branchId: branch.id },
    }),
    prisma.inventory.upsert({
      where: { ingredient: "Chicken" },
      update: {},
      create: { ingredient: "Chicken", stockQuantity: 10000, unit: "g", minThreshold: 1500, branchId: branch.id },
    }),
    prisma.inventory.upsert({
      where: { ingredient: "Lettuce" },
      update: {},
      create: { ingredient: "Lettuce", stockQuantity: 3000, unit: "g", minThreshold: 300, branchId: branch.id },
    }),
  ]);

  const productData = [
    { name: "Cà phê sữa", price: 39000, category: "Beverage", station: KitchenStation.BAR },
    { name: "Americano", price: 35000, category: "Beverage", station: KitchenStation.BAR },
    { name: "Salad gà", price: 69000, category: "Food", station: KitchenStation.COLD },
    { name: "Gà chiên", price: 89000, category: "Food", station: KitchenStation.HOT },
  ];

  for (const p of productData) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: { price: p.price, category: p.category, station: p.station },
      create: { name: p.name, price: p.price, category: p.category, station: p.station, branchId: branch.id },
    });
  }

  const products = await prisma.product.findMany();
  const invByName = new Map(inv.map((i) => [i.ingredient, i]));
  const prodByName = new Map(products.map((p) => [p.name, p]));

  // Recipes (per 1 item)
  const recipes: Array<{ product: string; ingredient: string; amount: number }> = [
    { product: "Cà phê sữa", ingredient: "Coffee beans", amount: 18 },
    { product: "Cà phê sữa", ingredient: "Milk", amount: 120 },
    { product: "Americano", ingredient: "Coffee beans", amount: 18 },
    { product: "Salad gà", ingredient: "Chicken", amount: 120 },
    { product: "Salad gà", ingredient: "Lettuce", amount: 60 },
    { product: "Gà chiên", ingredient: "Chicken", amount: 200 },
  ];

  for (const r of recipes) {
    const product = prodByName.get(r.product);
    const inventory = invByName.get(r.ingredient);
    if (!product || !inventory) continue;
    await prisma.recipe.upsert({
      where: { productId_inventoryId: { productId: product.id, inventoryId: inventory.id } },
      update: { amount: r.amount },
      create: { productId: product.id, inventoryId: inventory.id, amount: r.amount },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
