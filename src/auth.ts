import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { docClient, TABLE_NAME } from "./lib/dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET,
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY || "re_mock_key",
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    }),
    Credentials({
      name: "Judge Access",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
        passcode: { label: "Passcode (Required for Admin/Seller)", type: "password" },
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
          if (passcodeStr !== correctPasscode) {
            // Explicit failure — surfaces as a sign-in error in the UI instead of silently demoting
            return null;
          }
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
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const userId = user.id || user.email.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

      const userProfileKey = {
        PK: `USER#${userId}`,
        SK: "PROFILE",
      };

      try {
        const existingProfile = await docClient.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: userProfileKey,
          })
        );

        if (!existingProfile.Item) {
          const role = (user as { role?: string }).role || (
            user.email.includes("admin") || user.email.includes("judge")
              ? "ADMIN"
              : user.email.includes("seller")
              ? "seller"
              : "buyer"
          );
          await docClient.send(
            new PutCommand({
              TableName: TABLE_NAME,
              Item: {
                ...userProfileKey,
                name: user.name || "Guest User",
                email: user.email,
                role,
                createdAt: new Date().toISOString(),
              },
            })
          );
        }
        return true;
      } catch (error) {
        console.error("Error checking/creating user profile in DynamoDB during sign-in:", error);
        // Allow sign-in to succeed even if DynamoDB profile seeding fails so we don't block access
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
  pages: {
    signIn: "/auth/signin",
  },
});
