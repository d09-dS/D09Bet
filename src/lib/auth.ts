import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { generateAccessToken, generateRefreshToken, verifyToken } from "./jwt";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
          });

          if (!user) return null;
          if (!user.isActive) return null;

          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) return null;

          // Daily bonus logic
          let bonusAwarded: number | null = null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
          const lastLoginDay = lastLogin ? new Date(lastLogin.setHours(0, 0, 0, 0)) : null;
          const alreadyClaimed = lastLoginDay && lastLoginDay.getTime() === today.getTime();

          if (!alreadyClaimed) {
            const bonusEnabled = await prisma.systemSetting
              .findUnique({ where: { key: "daily_bonus_enabled" } })
              .then((s) => s?.value === "true");

            if (bonusEnabled !== false) {
              const bonusAmount = await prisma.systemSetting
                .findUnique({ where: { key: "daily_bonus_amount" } })
                .then((s) => (s ? Number(s.value) : 2));

              const newBalance = Number(user.tokenBalance) + bonusAmount;

              await prisma.$transaction([
                prisma.user.update({
                  where: { id: user.id },
                  data: {
                    tokenBalance: newBalance,
                    lastLoginAt: new Date(),
                  },
                }),
                prisma.tokenTransaction.create({
                  data: {
                    userId: user.id,
                    type: "DAILY_BONUS",
                    amount: bonusAmount,
                    balanceAfter: newBalance,
                    referenceType: "SYSTEM",
                    description: "Daily bonus",
                  },
                }),
              ]);

              bonusAwarded = bonusAmount;
              user.tokenBalance = newBalance as unknown as typeof user.tokenBalance;
            }
          }

          // Re-fetch for accurate balance
          const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
          const balance = Number(freshUser?.tokenBalance ?? user.tokenBalance);

          const accessToken = await generateAccessToken(user.id, user.username, user.role);
          const refreshToken = await generateRefreshToken(user.id, user.username, user.role);

          return {
            id: user.id,
            name: user.username,
            email: user.email,
            role: user.role,
            tokenBalance: balance,
            bonusAwarded,
            accessToken,
            refreshToken,
          };
        } catch (e) {
          console.error("Auth error:", e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tokenBalance = user.tokenBalance;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.bonusAwarded = user.bonusAwarded;
        token.accessTokenExpiry = Date.now() + 8 * 60 * 60 * 1000;
      }

      if (Date.now() < (token.accessTokenExpiry as number ?? 0)) {
        return token;
      }

      // Token expired - refresh using our JWT lib
      try {
        const payload = await verifyToken(token.refreshToken as string);
        if (!payload || payload.type !== "refresh") {
          return { ...token, error: "RefreshAccessTokenError" };
        }

        const dbUser = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!dbUser) return { ...token, error: "RefreshAccessTokenError" };

        const newAccessToken = await generateAccessToken(dbUser.id, dbUser.username, dbUser.role);
        const newRefreshToken = await generateRefreshToken(dbUser.id, dbUser.username, dbUser.role);

        return {
          ...token,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          tokenBalance: Number(dbUser.tokenBalance),
          accessTokenExpiry: Date.now() + 8 * 60 * 60 * 1000,
          error: undefined,
        };
      } catch {
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.tokenBalance = token.tokenBalance;
      session.user.bonusAwarded = token.bonusAwarded;
      session.user.accessToken = token.accessToken;
      if (token.error === "RefreshAccessTokenError") {
        session.error = "RefreshAccessTokenError";
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
