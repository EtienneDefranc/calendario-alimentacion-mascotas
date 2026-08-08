import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { name, username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Usuario y contraseña son requeridos' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return NextResponse.json({ message: 'El nombre de usuario ya está en uso' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
      }
    });

    return NextResponse.json({ message: 'Usuario creado exitosamente', user: { id: newUser.id, username: newUser.username } }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
