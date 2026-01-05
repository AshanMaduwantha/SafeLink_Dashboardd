// src/types/next-auth.d.ts
import "next-auth";
import { JWT as _JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role?: "admin" | "super_admin";
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role?: "admin" | "super_admin";
  }
}

declare module "next-auth/jwt" {
  interface _JWT {
    id: string;
    email: string;
    name: string;
    role?: "admin" | "super_admin";
    exp?: number;
  }
}
