import axios from "axios";
import { ApiError } from "../../utils/ApiError";

interface GfgApiResponse {
  status: string;
  result: Record<string, Record<string, any>>;
  count: number;
}

interface GfgFormattedResponse {
  totalSolved: number;
  solvedSlugs: string[];
}

export async function fetchGfgData(
  handle: string
): Promise<GfgFormattedResponse> {

  const response = await axios.post<GfgApiResponse>(
    "https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/",
    { handle },
    {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0"
      }
    }
  );

  const data = response.data;

  if (data.status !== "success") {
    throw new ApiError(400, "Invalid GFG handle");
  }

  const totalSolved = data.count;

  const solvedSlugs: string[] = [];

  // result contains: Easy, Medium, Hard, Basic
  for (const difficulty in data.result) {

    const problemsObject = data.result[difficulty];

    // Each difficulty contains problemId as key
    for (const problemId in problemsObject) {

      const problem = problemsObject[problemId];

      if (problem.slug) {
        solvedSlugs.push(problem.slug);
      }

    }
  }

  return {
    totalSolved,
    solvedSlugs
  };
}