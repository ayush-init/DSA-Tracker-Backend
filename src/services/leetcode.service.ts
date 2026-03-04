// src/services/leetcode.service.ts

import axios from "axios";

interface LeetcodeSubmission {
  titleSlug: string;
  statusDisplay: string;
}

interface LeetcodeResponse {
  totalSolved: number;
  submissions: LeetcodeSubmission[];
}

export async function fetchLeetcodeData(
  username: string
): Promise<LeetcodeResponse> {

  const response = await axios.post(
    "https://leetcode.com/graphql",
    {
      query: `
        query userProfileData($username: String!) {
          matchedUser(username: $username) {
            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
              }
            }
          }

          recentSubmissionList(username: $username) {
            titleSlug
            statusDisplay
          }
        }
      `,
      variables: { username }
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://leetcode.com",
        "Origin": "https://leetcode.com"
      }
    }
  );

  const data = response.data.data;

  if (!data.matchedUser) {
    throw new Error("Invalid LeetCode username");
  }

  const stats = data.matchedUser.submitStatsGlobal.acSubmissionNum;

  const totalSolved =
    stats.find((s: any) => s.difficulty === "All")?.count || 0;

  return {
    totalSolved,
    submissions: data.recentSubmissionList
  };
}