import { Platform } from "@prisma/client";

export const detectPlatform = (link: string): Platform => {
  const normalized = link.toLowerCase();

  if (normalized.includes("leetcode.com"))
    return Platform.LEETCODE;

  if (normalized.includes("geeksforgeeks.org"))
    return Platform.GFG;

  if (normalized.includes("interviewbit.com"))
    return Platform.INTERVIEWBIT;

  return Platform.OTHER;
};
