export async function githubFetch(
  path: string,
  accept = "application/vnd.github.v3+json",
  init?: { method?: string; body?: unknown },
): Promise<Response> {
  const token = process.env.GH_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN environment variable is not set")

  const response = await fetch(`https://api.github.com${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
      "User-Agent": "my-pr-reviewer",
      ...(init?.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub API error ${response.status}: ${body}`)
  }

  return response
}
