import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    tokenBalance: number;
    bonusAwarded: number | null;
    accessToken: string;
    refreshToken: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      tokenBalance: number;
      bonusAwarded: number | null;
      accessToken: string;
    };
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    tokenBalance: number;
    bonusAwarded: number | null;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiry: number;
    error?: string;
  }
}
