<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Task delivery and tracker workflow

- The project task tracker is the Notion Tasks database at
  `https://app.notion.com/p/3b3ba7af1f5a80f49276eb9a34497cc6`.
- Before beginning a tracker task, fetch its Notion page and use its goal and
  acceptance criteria as the implementation contract. Set its status to **In
  progress** when work begins.
- When the acceptance criteria and relevant verification are complete, set the
  task status to **Done** and write the resulting GitHub PR URL to its `PR`
  property.
- Unless the task explicitly needs user review or the user asks otherwise,
  complete the full delivery loop autonomously: create a `codex/` branch,
  implement and verify the change, commit it, push it, open a PR against
  `main`, merge it into `main`, then update the corresponding Notion task.
- Git metadata changes are protected in this workspace. For branch creation,
  commits, pushes, and merges, request the required elevated permission using
  the narrowest command prefix and a target-specific justification on the first
  attempt. Do not retry a broad or rejected Git permission request unchanged.
