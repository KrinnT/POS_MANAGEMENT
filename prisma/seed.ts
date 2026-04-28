import { PrismaClient, KitchenStation } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "../src/lib/auth/password";

function decodePrismaDevApiKeyToDatabaseUrl(apiKey: string): string | null {
  try {
    const json = Buffer.from(apiKey, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    if (typeof parsed?.databaseUrl === "string") {
      return parsed.databaseUrl.replace("localhost", "127.0.0.1");
    }
    return null;
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
  throw new Error("No usable Postgres URL found.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString })),
});

async function main() {
  console.log("🌱 Seeding Enterprise Data...");

  // 1. Hierarchy
  const hq = await prisma.hQ.upsert({
    where: { name: "KrinnT Group" },
    update: {},
    create: { name: "KrinnT Group" },
  });

  const region = await prisma.region.create({
    data: { hqId: hq.id, name: "Vietnam North" },
  });

  const branch = await prisma.branch.upsert({
    where: { name: "Main Branch" },
    update: { regionId: region.id },
    create: { name: "Main Branch", regionId: region.id, timezone: "Asia/Ho_Chi_Minh", currency: "VND" },
  });

  // 2. Roles & Permissions
  const adminRole = await prisma.userRole.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  });

  // 3. User
  const adminPass = "Admin@123";
  await prisma.user.upsert({
    where: { phone: "0900000000" },
    update: { roleId: adminRole.id, branchId: branch.id },
    create: {
      phone: "0900000000",
      email: "admin@krinnt.local",
      roleId: adminRole.id,
      passcode: "1234",
      passwordHash: await hashPassword(adminPass),
      branchId: branch.id,
    },
  });

  // 4. Tax
  const taxFood = await prisma.taxCategory.upsert({
    where: { name: "Food" },
    update: {},
    create: { name: "Food" },
  });
  
  await prisma.taxRule.upsert({
    where: { regionId_taxCategoryId: { regionId: region.id, taxCategoryId: taxFood.id } },
    update: { rate: 0.08 }, // 8% VAT
    create: { regionId: region.id, taxCategoryId: taxFood.id, rate: 0.08 },
  });

  // 5. Category & Products
  const catBev = await prisma.category.upsert({ where: { name: "Beverage" }, update: {}, create: { name: "Beverage" } });
  const catFood = await prisma.category.upsert({ where: { name: "Food" }, update: {}, create: { name: "Food" } });

  const products = [
    { name: "Cà phê sữa", categoryId: catBev.id, taxCategoryId: taxFood.id, station: KitchenStation.BAR },
    { name: "Americano", categoryId: catBev.id, taxCategoryId: taxFood.id, station: KitchenStation.BAR },
    { name: "Gà chiên", categoryId: catFood.id, taxCategoryId: taxFood.id, station: KitchenStation.HOT },
  ];

  const priceBook = await prisma.priceBook.create({
    data: { name: "Standard Price Book", branchId: branch.id },
  });

  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        categoryId: p.categoryId,
        taxCategoryId: p.taxCategoryId,
        kitchenStation: p.station,
      },
    });

    const variant = await prisma.productVariant.create({
      data: { productId: product.id, sku: `SKU-${p.name.toUpperCase()}`, name: "Standard" },
    });

    await prisma.priceBookEntry.create({
      data: { priceBookId: priceBook.id, variantId: variant.id, price: 35000 + Math.random() * 10000 },
    });
  }

  // 6. Materials & BOM
  const beans = await prisma.material.upsert({ where: { name: "Coffee beans" }, update: {}, create: { name: "Coffee beans", unit: "g" } });
  
  await prisma.inventoryBalance.upsert({
    where: { branchId_materialId: { branchId: branch.id, materialId: beans.id } },
    update: { quantity: 10000 },
    create: { branchId: branch.id, materialId: beans.id, quantity: 10000 },
  });

  // 7. Tables
  const tableNames = ["Table 01", "Table 02"];
  for (const name of tableNames) {
    await prisma.table.upsert({
      where: { qrToken: name.replace(" ", "") },
      update: {},
      create: { name, qrToken: name.replace(" ", ""), branchId: branch.id },
    });
  }

  console.log("✅ Seed completed.");
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
