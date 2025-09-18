import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getApiUrl = () => {
  switch (process.env.VERCEL_ENV) {
    case "production":
      console.log("Using production API URL");
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    case "preview":
      console.log("Using preview API URL");
      return `https://${process.env.VERCEL_BRANCH_URL}`;
    default:
      console.log("Using local API URL");
      return "http://localhost:3002";
  }
};