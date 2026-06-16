import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { docClient, TABLE_NAME } from "./lib/dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Judge Access",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
        passcode: { label: "Passcode", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const emailStr = credentials.email as string;
        const nameStr = (credentials.name as string) || "Guest Judge";
        const passcodeStr = (credentials.passcode as string) || "";
        let role = "buyer";
        const isAdminOrJudge = emailStr.includes("admin") || emailStr.includes("judge");
        const isSeller = emailStr.includes("seller");
        if (isAdminOrJudge || isSeller) {
          const correctPasscode = process.env.JUDGE_PASSCODE || "pulse-judge-2026";
          if (passcodeStr !== correctPasscode) return null;
          role = isAdminOrJudge ? "ADMIN" : "seller";
        }
        return {
          id: emailStr.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase(),
          name: nameStr,
          email: emailStr,
          role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const userId = user.id || user.email.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
      try {
        const existing = await docClient.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: `USER#${userId}`, SK: "PROFILE" },
        }));
        if (!existing.Item) {
          const role = (user as { role?: string }).role || "buyer";
          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: `USER#${userId}`,
              SK: "PROFILE",
              name: user.name || "Guest User",
              email: user.email,
              role,
              createdAt: new Date().toISOString(),
            },
          }));
        }
        return true;
      } catch {
        return true;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "buyer";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { id?: string; role?: string };
        u.id = token.id as string;
        u.role = token.role as string;
      }
      return session;
    },
  },
  pages: { signIn: "/auth/signin" },
});
