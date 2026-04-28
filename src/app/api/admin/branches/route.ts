import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guard";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requirePermission("admin.read");
  if (!guard.ok) return guard.response;

  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ branches });
}

const CreateSchema = z.object({
  name: z.string().min(2),
});

export async function POST(request: Request) {
  const guard = await requirePermission("admin.write");
  if (!guard.ok) return guard.response;
  const auth = guard.auth;

  const parsed = CreateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const region = await prisma.region.findFirst();
  if (!region) return Response.json({ error: "No region found. Create a region first." }, { status: 400 });

  const branch = await prisma.branch.create({
    data: {
      name: parsed.data.name,
      regionId: region.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      branchId: branch.id,
      userId: auth.userId,
      action: "branch.create",
      entity: "Branch",
      entityId: branch.id,
      newValue: { name: branch.name },
    },
  });

  return Response.json({ branch });
}
