import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { company, name, email, password } = await req.json();
    if (!company || !name || !email || !password) {
      return NextResponse.json({ error: "Alle Felder sind erforderlich." }, { status: 400 });
    }
    // Firma suchen oder anlegen
    let dbCompany = await prisma.company.findUnique({ where: { name: company } });
    if (!dbCompany) {
      dbCompany = await prisma.company.create({ data: { name: company } });
    }
    // Prüfen, wie viele User es für diese Firma gibt
    const userCount = await prisma.user.count({ where: { companyId: dbCompany.id } });
    const role = userCount === 0 ? 'ADMIN' : 'USER';
    // Prüfen, ob User mit E-Mail und Firma schon existiert
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        companyId: dbCompany.id,
      },
    });
    if (existingUser) {
      return NextResponse.json({ error: "User existiert bereits für diese Firma." }, { status: 400 });
    }
    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 10);
    // User anlegen
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        companyId: dbCompany.id,
        role,
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Etwas ist schiefgelaufen." }, { status: 500 });
  }
} 