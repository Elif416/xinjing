import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn：合并 Tailwind class，避免冲突
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
