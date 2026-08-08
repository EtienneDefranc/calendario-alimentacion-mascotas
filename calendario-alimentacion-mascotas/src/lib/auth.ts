import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // Default 30 days. We can override on client side if needed
  },
  pages: {
    signIn: '/', // Using custom sign-in page on root
  },
  providers: [
    CredentialsProvider({
      name: "Usuario y Contraseña",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
        remember: { label: "Recordarme", type: "checkbox" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Falta usuario o contraseña");
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username }
        });

        if (!user || !user.password) {
          throw new Error("Usuario no encontrado");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Contraseña incorrecta");
        }

        // Return user object without password
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};
