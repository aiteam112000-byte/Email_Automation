import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/segments/:id/contacts — resolve segment to matching contacts
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const segment = await prisma.segment.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const where: Record<string, unknown> = { userId: session.user.id, unsubscribed: false };

  if (segment.filterType === "tag" && segment.filterValue) {
    // Contacts whose tags string contains the tag value
    where.tags = { contains: segment.filterValue };
  } else if (segment.filterType === "status") {
    if (segment.filterValue === "unsubscribed") where.unsubscribed = true;
    else if (segment.filterValue === "bounced") where.bouncedAt = { not: null };
    else if (segment.filterValue === "active") {
      where.unsubscribed = false;
      where.bouncedAt = null;
    }
  } else if (segment.filterType === "date" && segment.filterValue) {
    // filterValue = number of days, e.g. "30" = added in last 30 days
    const days = parseInt(segment.filterValue);
    if (!isNaN(days)) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: since };
    }
  } else if (segment.filterType === "manual" && segment.filterValue) {
    try {
      const emailList = JSON.parse(segment.filterValue) as string[];
      if (Array.isArray(emailList) && emailList.length > 0) {
        const normalized = emailList.map((email) => String(email).toLowerCase().trim()).filter(Boolean);
        const contacts = await prisma.contact.findMany({
          where: { userId: session.user.id, unsubscribed: false, email: { in: normalized } },
          select: { id: true, email: true, name: true, tags: true },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ contacts, count: contacts.length });
      }
    } catch (error) {
      // fall back to empty result
    }
  }

  const contacts = await prisma.contact.findMany({
    where,
    select: { id: true, email: true, name: true, tags: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ contacts, count: contacts.length });
}
