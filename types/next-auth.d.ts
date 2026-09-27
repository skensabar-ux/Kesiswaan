import type { AppRole } from "@/lib/roles";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: AppRole;
    username: string;
    mustChangePassword: boolean;
  }
  interface Session {
    user: {
      id: string;
      role: AppRole;
      username: string;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    username: string;
    mustChangePassword: boolean;
  }
}
