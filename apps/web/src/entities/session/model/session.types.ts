import type { GetSession200 } from "@/shared/api/generated";

export type SessionUser = GetSession200;
export type UserRole = SessionUser["role"];
