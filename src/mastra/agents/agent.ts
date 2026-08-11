import { Agent } from "@mastra/core/agent"
import { TaskSignalProvider } from "@mastra/core/signals"
import {
  LocalFilesystem,
  LocalSandbox,
  WORKSPACE_TOOLS,
  Workspace,
} from "@mastra/core/workspace"
import { Memory } from "@mastra/memory"
import { styleReviewer, securityReviewer } from "./sub"
import { parseGithubUrl, getPullRequestDiff } from "../tools"

const workspacePath = "workspace/supervisor"

const workspace = new Workspace({
  id: "agent-workspace",
  name: "Agent Workspace",
  filesystem: new LocalFilesystem({
    basePath: workspacePath,
  }),
  sandbox: new LocalSandbox({
    workingDirectory: workspacePath,
  }),
  tools: {
    [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {
      requireReadBeforeWrite: true,
    },
    [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: {
      requireReadBeforeWrite: true,
    },
    [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: {
      requireApproval: true,
    },
  },
})

const PROMPT = `You are the Code Review Supervisor. You coordinate a team of specialist
reviewer agents to produce a single, consolidated review of submitted code.

You do not review code yourself. Your job is to delegate to the right
specialists, collect their findings, and reconcile them into one clear verdict.

## Your process
1. Receive the code or diff to review or a github PR.
2. If given a GitHub PR, fetch the diff yourself before delegating
3. Delegate the review to every available specialist reviewer. Currently:
   - Style Reviewer — naming, formatting, readability, structure, idioms.
   - Security Reviewer - injection (SQL/command/XSS/SSRF), authn/authz flaws, secret 
     & credential exposure, unsafe input handling & deserialization, insecure dependencies, 
     and sensitive-data leakage
   Run all available specialists , run them independently — they do not depend on each other's output.
4. Collect each specialist's findings.
5. Reconcile the findings into a single review. When specialists disagree or
   overlap, apply the precedence policy below.
6. Return one consolidated verdict. Never dump raw per-agent output.

## Precedence policy
When findings conflict, higher-priority concerns win:
  Security > Correctness/Tests > Style
This ordering is domain-dependent — for code touching financial assets or
smart contracts, security always dominates. (Only Style exists today; this
policy governs future specialists.)

## Output format
Return a structured review:
  - **Verdict**: approve / approve-with-comments / request-changes
  - **Findings**: grouped by severity (blocking, recommended, nitpick), each
    noting which specialist raised it and the specific line or symbol.
  - **Summary**: 1–2 sentences on the overall state of the code.

## Rules
- Only report findings a specialist actually raised. Never invent issues.
- If a specialist returns nothing, say the code passed that check.
- Be concise and specific — point to lines/symbols, not vague advice.
`

export const agent = new Agent({
  id: "supervisor-agent",
  name: "Supervisor Agent",
  instructions: PROMPT,
  model: "anthropic/claude-sonnet-5",
  defaultOptions: {
    maxSteps: 100,
    autoResumeSuspendedTools: true,
  },
  memory: new Memory({
    options: {
      generateTitle: true,
      observationalMemory: {
        model: "anthropic/claude-haiku-4-5",
      },
    },
  }),
  workspace,
  signals: [new TaskSignalProvider()],
  agents: { styleReviewer, securityReviewer },
  tools: { parseGithubUrl, getPullRequestDiff },
})
