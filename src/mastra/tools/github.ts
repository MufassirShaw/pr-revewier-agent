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

export const postPullRequestReview = createTool({
  id: "post-pull-request-review",
  description:
    "Publish a single GitHub Pull Request review with inline comments anchored to specific files and lines. Each line comment must target a line that appears in the PR diff.",
  inputSchema: z.object({
    owner: z.string().describe("Owner of the repository"),
    repo: z.string().describe("Name of the repo"),
    prNumber: z.number().describe("Number of the pull request"),
    event: z
      .enum(["COMMENT", "REQUEST_CHANGES", "APPROVE"])
      .describe(
        "Review verdict: COMMENT (neutral), REQUEST_CHANGES (blocking), or APPROVE",
      ),
    body: z
      .string()
      .describe("Overall review summary shown at the top of the review"),
    comments: z
      .array(
        z.object({
          path: z
            .string()
            .describe("File path relative to the repo root, as it appears in the diff"),
          line: z
            .number()
            .describe(
              "Line number in the file (in the diff's new version) the comment refers to",
            ),
          side: z
            .enum(["LEFT", "RIGHT"])
            .default("RIGHT")
            .describe(
              "RIGHT for the new version of the file, LEFT for the original",
            ),
          body: z.string().describe("The comment text for this line"),
        }),
      )
      .default([])
      .describe("Inline comments to attach to specific lines of the PR"),
  }),
  outputSchema: z.object({
    reviewId: z.number(),
    state: z.string(),
    htmlUrl: z.string(),
  }),
  execute: async (input) => {
    const { owner, repo, prNumber, event, body, comments } = input
    const response = await githubFetch(
      `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
      "application/vnd.github.v3+json",
      { method: "POST", body: { event, body, comments } },
    )
    const review = await response.json()
    return {
      reviewId: review.id,
      state: review.state,
      htmlUrl: review.html_url,
    }
  },
})
