export interface User {
  id: string;
  username: string;
  email: string;
  role: "GUEST" | "USER" | "MODERATOR" | "ADMIN";
  tokenBalance: number;
  avatarUrl?: string;
  bio?: string;
  locale: string;
  isActive?: boolean;
}

export interface AuthResponse {
  userId: string;
  username: string;
  email: string;
  role: string;
  tokenBalance: number;
  accessToken: string;
  refreshToken: string;
}

export interface Category {
  id: number;
  name: string;
  nameEn?: string;
  slug: string;
  description?: string;
  descriptionEn?: string;
  iconName?: string;
  sortOrder: number;
}

export type EventStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "OPEN"
  | "CLOSED"
  | "SETTLED"
  | "CANCELED";

export interface BetEvent {
  id: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  category?: Category;
  status: EventStatus;
  startTime?: string;
  endTime?: string;
  imageUrl?: string;
  isFeatured: boolean;
  markets: Market[];
}

export type MarketType = "WINNER" | "OVER_UNDER" | "YES_NO" | "CUSTOM";
export type MarketStatus = "OPEN" | "LOCKED" | "SETTLED" | "CANCELED";

export interface Market {
  id: string;
  name: string;
  nameEn?: string;
  type: MarketType;
  status: MarketStatus;
  marginFactor: number;
  virtualPool: number;
  oddsScaleFactor: number;
  outcomes: Outcome[];
}

export type OutcomeResult = "PENDING" | "WON" | "LOST" | "VOID";

export interface Outcome {
  id: string;
  name: string;
  nameEn?: string;
  initialOdds: number;
  currentOdds: number;
  totalStaked: number;
  resultStatus: OutcomeResult;
}

export type BetStatus = "PENDING" | "WON" | "LOST" | "VOID";

export interface Bet {
  id: string;
  outcome: Outcome;
  stake: number;
  oddsAtPlacement: number;
  potentialWin: number;
  status: BetStatus;
  settledAt?: string;
  createdAt: string;
}

export type TransactionType =
  | "INITIAL_ALLOCATION"
  | "BET_PLACED"
  | "BET_WON"
  | "BET_VOID"
  | "DAILY_BONUS"
  | "CHALLENGE_REWARD"
  | "ADMIN_ADJUSTMENT";

export interface TokenTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  profit: number;
  totalBets: number;
  winRate: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
