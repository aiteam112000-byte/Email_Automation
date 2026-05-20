import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const segments = await prisma.segment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(segments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, filterType, filterValue, contacts } = await req.json();
  if (!name || !filterType) {
    return NextResponse.json({ error: "name and filterType required" }, { status: 400 });
  }

  let finalFilterValue: string | null = filterValue ?? null;

  if (filterType === "manual") {
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "contacts required for manual segments" }, { status: 400 });
    }

    const emails = new Set<string>();
    for (const contact of contacts) {
      if (!contact.email) continue;
      const email = String(contact.email).trim().toLowerCase();
      if (!email) continue;
      emails.add(email);
      await prisma.contact.upsert({
        where: { email_userId: { email, userId: session.user.id } },
        create: {
          email,
          name: contact.name ?? null,
          phone: contact.phone ?? null,
          company: contact.company ?? null,
          tags: contact.tags ?? null,
          userId: session.user.id,
        },
        update: {
          name: contact.name ?? undefined,
          phone: contact.phone ?? undefined,
          company: contact.company ?? undefined,
          tags: contact.tags ?? undefined,
        },
      });
    }

    finalFilterValue = JSON.stringify(Array.from(emails));
  }

  const segment = await prisma.segment.create({
    data: { name, filterType, filterValue: finalFilterValue, userId: session.user.id },
  });
  return NextResponse.json(segment, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.segment.delete({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
