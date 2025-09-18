import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getApiUrl = () => {
  switch (process.env.VERCEL_ENV) {
    case "production":
      return process.env.VERCEL_PROJECT_PRODUCTION_URL;
    case "preview":
      return process.env.VERCEL_BRANCH_URL;
    default:
      return "http://localhost:3002";
  }
};