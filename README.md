# pr-reviewer-agent

An AI code reviewer that runs a team of specialist agents over your code and hands back a single, reconciled verdict — instead of a pile of overlapping opinions.

A **Supervisor** agent receives the code or diff, delegates it to independent specialist reviewers, and merges their findings into one review with a clear approve / request-changes decision.

## The review team

| Agent | Reviews for |
|-------|-------------|
| **Supervisor** | Orchestration only — delegates, reconciles conflicts, and produces the final verdict. Does not review code itself. |
| **Security Reviewer** | Injection, input validation, authn/authz, hardcoded secrets, sensitive-data exposure, unsafe deserialization, and untrusted source → dangerous sink flows. |
| **Style Reviewer** | Naming, formatting, readability, nesting/function length, and language idioms. |

Specialists run **independently** — they don't see each other's output. When findings conflict or overlap, the Supervisor applies a fixed precedence:

```
Security  >  Correctness / Tests  >  Style
```

So a hardcoded live key or SQL injection always outranks a naming nitpick in the final call.

## What you get back

Every review comes back in the same shape:

- **Verdict** — `approve` / `approve-with-comments` / `request-changes`
- **Findings** — grouped by severity (blocking, recommended, nitpick), each tagged with which specialist raised it and the exact line or symbol
- **Summary** — 1–2 sentences on the overall state of the code

See [`workspace/supervisor/code-review.md`](src/mastra/public/workspace/supervisor/code-review.md) for a full worked example (a broken Express `/user` route).

## Running it

Set your Anthropic key, then start the dev server:

```shell
export ANTHROPIC_API_KEY=sk-...   # or put it in .env
pnpm run dev
```

Open [http://localhost:4111](http://localhost:4111), select the **Supervisor Agent**, and paste in code or a diff:

```
Review this route:

app.get('/user', function(req, res) {
  var q = "SELECT * FROM users WHERE id = " + req.query.id
  db.query(q, function(e, r) { ... })
})
```

The Supervisor fans the code out to the Security and Style reviewers and returns one consolidated review.

## Adding a specialist

The team is meant to grow. To add, say, a Correctness or Test-coverage reviewer:

1. Create the agent in `src/mastra/agents/sub/` (copy `style-reviewer.ts` as a template and rewrite its prompt to define one tight scope).
2. Export it from `src/mastra/agents/sub/index.ts`.
3. Register it in the Supervisor's `agents` map in `src/mastra/agents/agent.ts`, and list it in the Supervisor's delegation instructions.

Keep each specialist in a single lane — the Supervisor relies on non-overlapping scopes to reconcile cleanly.

## Configuration

- **Models** — each agent runs on `anthropic/claude-sonnet-5`; observational memory uses `anthropic/claude-haiku-4-5`. Change these per agent in their definition files.
- **Storage** — agent memory and threads live in a local libSQL database (`file:./mastra.db`). For hosted storage, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
- **Observability** — traces go to DuckDB and the Mastra platform, with a `SensitiveDataFilter` scrubbing span output. Configured in `src/mastra/index.ts`.

## Safety note

The Supervisor's workspace (`workspace/supervisor/`) is sandboxed to that directory for file operations — writes require a prior read and deletes require approval — but `LocalSandbox` does **not** provide OS-level isolation for shell commands. Review command approvals carefully and don't expose this behind an unauthenticated public endpoint.
