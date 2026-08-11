import z from "zod"

export const githubUrlParserSchema = z.object({
  user: z.string().describe("Owner of the repository"),
  repoName: z.string().describe("Name of the repository"),
  prNumber: z.number().describe("Number of the pull request"),
})
