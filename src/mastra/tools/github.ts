import { createTool } from "@mastra/core/tools"
import z from "zod"

import { githubUrlParserSchema } from "../common/schema"
import { githubFetch } from "../common/githubApi"

export const parseGithubUrl = createTool({
  id: "parse-github-pr-url",
  description:
    "Parse a GitHub Pull Request URL into its owner, repo, and pull number components.",
  inputSchema: z.object({
    url: z
      .string()
      .describe("A GitHub PR URL, e.g. https://github.com/owner/repo/pull/123"),
  }),
  outputSchema: githubUrlParserSchema,
  execute: async (inputData) => {
    const match = inputData.url.match(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/,
    )
    if (!match) {
      throw new Error(
        `Invalid GitHub PR URL: "${inputData.url}". Expected format: https://github.com/owner/repo/pull/123`,
      )
    }
    return {
      user: match[1],
      repoName: match[2],
      prNumber: parseInt(match[3], 10),
    }
  },
})

export const getPullRequestDiff = createTool({
  id: "get-pull-request-diff",
  description: "Fetch the raw unified diff for a GitHub Pull Request.",
  inputSchema: z.object({
    prNumber: z.number().describe("Number of the pull request"),
    owner: z.string().describe("Owner of the repository"),
    repo: z.string().describe("Name of the repo"),
  }),
  outputSchema: z.object({
    diff: z.string(),
  }),
  execute: async (input) => {
    const { owner, repo, prNumber } = input
    const response = await githubFetch(
      `/repos/${owner}/${repo}/pulls/${prNumber}`,
      "application/vnd.github.diff",
    )
    return { diff: await response.text() }
  },
})
