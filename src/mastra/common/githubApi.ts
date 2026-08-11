export async function githubFetch(
  path: string,
  accept = "application/vnd.github.v3+json",
): Promise<Response> {
  const token = process.env.GH_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN environment variable is not set")

  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
      "User-Agent": "my-pr-reviewer",
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub API error ${response.status}: ${body}`)
  }

  return response
}
