import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [Credentials({ credentials: { email: {}, password: {} }, authorize: async (raw) => {
    const parsed = loginSchema.safeParse(raw); if (!parsed.success) return null;
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user?.active || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  } })],
  callbacks: {
    jwt({ token, user }) { if (user) { token.id = user.id!; token.role = user.role; } return token; },
    session({ session, token }) { session.user.id = String(token.id); session.user.role = token.role as "ADMIN" | "OPERATOR"; return session; },
    authorized({ auth, request }) { const publicPath = request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/api/auth"); return publicPath || !!auth?.user; }
  }
});
