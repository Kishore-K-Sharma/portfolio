---
title: "Claude Code Hooks I Built: The Five That Actually Earned Their Place in settings.json"
description: "Hooks turn Claude Code from a chatbot into a system you control. Five hooks I wrote and kept — what each does, when it fires, the failure mode it prevents, and the code."
date: "2026-06-24"
category: "engineering"
tags: ["claude-code", "ai", "developer-tools", "hooks", "automation"]
---

A hook in Claude Code is a shell command the harness runs at a defined moment in the loop. Not the model — the harness. The model doesn't *call* a hook; the harness *invokes* one around a tool call, a user prompt, or a session boundary. The hook can permit, block, modify, or simply observe.

That sounds boring until you realise what it lets you do: enforce policy the model can't override, inject context the model didn't ask for, and shape behaviour that "tell the model to do X in a prompt" cannot reliably deliver. Prompts are advisory. Hooks are deterministic.

This post is the five hooks I actually run, in order of how much grief they've saved. Each one has a defined trigger, a defined outcome, and a reason it exists. No theoretical hooks I haven't shipped.

## What a hook can do, in one mental model

Six event types. Three useful axes.

The events: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SessionStart`, `Stop`, `Notification`. (There are more, but these are the load-bearing five.)

The axes:

- **Allow / block.** Exit code `2` from a hook blocks the action; the model gets the stderr as feedback and decides whether to retry. Exit `0` allows.
- **Observe.** Exit `0`, side effects elsewhere — log to disk, send to a metrics endpoint, post to Slack. The session continues unaffected.
- **Inject.** Print to stdout from `UserPromptSubmit` or `SessionStart`; the harness appends that text as additional context. The model sees it as if it came from the user.

![Three concentric rings labeled with the three things a hook can do. Inner: ALLOW/BLOCK (exit 2 blocks · stderr feeds back to model · use for policy). Middle: OBSERVE (exit 0 · side effects only · use for logging/metrics). Outer: INJECT (stdout becomes additional context · use for SessionStart and UserPromptSubmit · model treats it like user-supplied text). Around the rings, six event labels: PreToolUse, PostToolUse, UserPromptSubmit, SessionStart, Stop, Notification. Footer: hooks are deterministic. Prompts are advisory.](/writing/claude-code-hook-mental-model.svg "Three things a hook can do, and six events it can attach to. Pick the event for the trigger, pick the axis for the outcome.")

The trick is matching the event to the desired outcome. `PreToolUse` is for blocking; `PostToolUse` is for reacting; `UserPromptSubmit` is for shaping every turn; `SessionStart` is for shaping the whole session.

The five below all matter to me daily. The code is real; the failure mode each one prevents is real.

## Hook 1: block destructive commands the model wasn't authorised for

**Event:** `PreToolUse` matching `Bash`.

**Why:** The model is generally cautious but not infallible. The cost of a wrong `rm -rf`, a wrong `git push --force`, a wrong `DROP TABLE` is not "the model apologises" — it's lost work, broken history, or worse. A hook costs nothing to add and removes the failure mode entirely.

**What it does:** Parses the proposed `Bash` command. If it matches a denylist *and* the session hasn't been marked "destructive-ok," exits `2` with a stderr telling the model what's blocked and how to escalate. The model relays the block to me; I either fix the request or unlock the session.

The denylist isn't long: `rm -rf /`, `git push --force` to protected branches, `git reset --hard` followed by a push, `chmod -R 777`, anything operating on `~/.ssh` or `~/.aws`. The list is short because it covers the *unrecoverable* class of actions, not "things I'd prefer not to do."

```bash
#!/usr/bin/env bash
# .claude/hooks/block-destructive.sh
# Triggered on PreToolUse for Bash. Exits 2 to block.

cmd=$(jq -r '.tool_input.command // ""')

denylist=(
  'rm[[:space:]]+-rf[[:space:]]+/'
  'git[[:space:]]+push[[:space:]]+.*--force.*(main|master|production)'
  'chmod[[:space:]]+-R[[:space:]]+777'
  'DROP[[:space:]]+TABLE'
)

for pat in "${denylist[@]}"; do
  if [[ "$cmd" =~ $pat ]]; then
    echo "BLOCKED: matches denylist pattern '$pat'." >&2
    echo "If this is intentional, run /unlock-destructive in chat first." >&2
    exit 2
  fi
done

exit 0
```

I would not run Claude Code on a real machine without this hook. The total time to write it is fifteen minutes; the worst-case event it prevents is hours.

## Hook 2: auto-format on write

**Event:** `PostToolUse` matching `Write` or `Edit` on language-shaped extensions.

**Why:** Reduces the diff back to "what changed semantically" by killing every whitespace difference at the source. The model writes; the formatter normalises; the diff is meaningful.

**What it does:** Reads the file path the tool wrote to. If the extension matches a known formatter, runs it. If formatting changes anything, the file is silently updated. The model gets no feedback because there's nothing to feed back — the formatter is idempotent.

```bash
#!/usr/bin/env bash
# .claude/hooks/format-on-write.sh
# Triggered on PostToolUse for Write/Edit.

path=$(jq -r '.tool_input.file_path // ""')
[[ -z "$path" || ! -f "$path" ]] && exit 0

case "$path" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md) prettier --write "$path" >/dev/null 2>&1 ;;
  *.py)                              ruff format "$path"   >/dev/null 2>&1 ;;
  *.go)                              gofmt -w "$path"      >/dev/null 2>&1 ;;
  *.java)                            google-java-format -i "$path" >/dev/null 2>&1 ;;
esac

exit 0
```

The value isn't "the model can't format" — the model can. The value is *I don't have to ask for it*, and the diff stays clean across the model writing thirty files in a session.

## Hook 3: inject project context at session start

**Event:** `SessionStart`.

**Why:** The model needs to know things about the project it can't infer from one file: which branch is "production," which folders are auto-generated, which commands you actually use to run tests. `CLAUDE.md` carries some of this, but `CLAUDE.md` is static. Stuff that changes — the current sprint, the active feature flag, today's deploy status — wants to be dynamic.

**What it does:** Prints a short block of "current project state" to stdout. The harness appends that to the session. The model sees it before the first user message.

```bash
#!/usr/bin/env bash
# .claude/hooks/session-context.sh
# Triggered on SessionStart. Stdout becomes session context.

cat <<EOF
PROJECT STATE (auto-injected $(date -u +%Y-%m-%dT%H:%M:%SZ)):
- Active branch: $(git branch --show-current 2>/dev/null || echo "?")
- Uncommitted changes: $(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
- Last 3 commits:
$(git log --oneline -3 2>/dev/null | sed 's/^/  /')
- Active feature flags (today): $(cat .feature-flags.local 2>/dev/null || echo "none")
EOF
```

The model now opens every session knowing what the repo looks like *right now*, not what `CLAUDE.md` said two weeks ago. Saves the model a `git status` call on turn one. More importantly, saves me from realising on turn six that the model has been operating on stale assumptions.

## Hook 4: log every tool invocation for offline analysis

**Event:** `PostToolUse` matching all tools.

**Why:** Post-session, I want to know what the model actually did. Not what it claimed to do. The transcript already shows tool calls, but it's a wall of JSON across hours of work. A structured log lets me grep, count, audit, and — most usefully — find tool patterns I could automate.

**What it does:** Appends one line per tool invocation to a daily log file. Tool name, file path or command, exit code, duration if available.

```bash
#!/usr/bin/env bash
# .claude/hooks/log-tool-use.sh
# Triggered on PostToolUse, all tools. Side effect only.

log_dir="$HOME/.claude/logs/$(date -u +%Y-%m-%d)"
mkdir -p "$log_dir"

payload=$(cat)
tool=$(echo "$payload" | jq -r '.tool_name')
target=$(echo "$payload" | jq -r '
  .tool_input.file_path // .tool_input.command // .tool_input.pattern // ""
' | head -c 120)
exit_code=$(echo "$payload" | jq -r '.tool_response.exit_code // ""')

ts=$(date -u +%H:%M:%S)
echo "$ts | $tool | $exit_code | $target" >> "$log_dir/tools.log"

exit 0
```

What I do with it: a weekly `awk` pass tells me the top 10 commands the model ran. The top 10 is *always* enlightening — half of them are things I could turn into a slash command or skill so the model doesn't have to derive them from scratch each time. The hook pays for itself by feeding the next hook I write.

![A flow diagram showing the feedback loop. Box 1: log-tool-use hook writes every tool call to a daily file. Arrow to Box 2: weekly awk/sort finds the top 10 repeated patterns. Arrow to Box 3: turn the top patterns into slash commands or skills. Arrow loops back to Box 1: model now uses the new commands · log records the new pattern · next week's top 10 is different. Footer caption: the hook isn't valuable in isolation. It's valuable because it feeds the next hook you'd write.](/writing/claude-hook-feedback-loop.svg "Logging is not the goal. The goal is to discover the patterns worth promoting into slash commands so the model stops deriving them.")

## Hook 5: cost guardrail — alert when a session burns more than a threshold

**Event:** `PostToolUse` (any), checked against a counter.

**Why:** A runaway loop is rare but expensive. A model that misreads a task and starts spawning subagents, or a session that grows past sensible context bounds, both manifest the same way: tokens climb fast. I want to know before it's $30, not after it's $300.

**What it does:** Tracks a per-session counter of output tokens (from the tool response payload). When the counter crosses a threshold I set per project, posts a `notify-send` / macOS notification / Slack DM. Does not block — I want the freedom to decide.

```bash
#!/usr/bin/env bash
# .claude/hooks/cost-guardrail.sh
# Triggered on PostToolUse. Observes; alerts; does not block.

SESSION_ID=$(jq -r '.session_id // "unknown"')
COUNTER_FILE="$HOME/.claude/state/cost-$SESSION_ID"
THRESHOLD_TOKENS=200000  # tune per project

usage=$(jq -r '.tool_response.usage.output_tokens // 0')
[[ "$usage" =~ ^[0-9]+$ ]] || exit 0

total=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
new=$(( total + usage ))
echo "$new" > "$COUNTER_FILE"

# Only alert once, when crossing the threshold.
if (( total < THRESHOLD_TOKENS )) && (( new >= THRESHOLD_TOKENS )); then
  osascript -e "display notification \"Session crossed ${THRESHOLD_TOKENS} output tokens.\" with title \"Claude Code\""
fi

exit 0
```

It's saved me from at least two long-loop overruns. The alert turns *"oh I should probably check"* into *"a thing is asking me to check."*

## The patterns these all share

Five different hooks, but the same shape:

- **Each fires at one defined event.** Not "do this when X happens conceptually" — *PreToolUse-on-Bash*, *PostToolUse*, *SessionStart*. Pick the event first.
- **Each has one job.** Block destructive commands. Format on write. Inject session state. Log tool calls. Alert on cost. None of them try to do two things.
- **Each fails open.** A hook that errors out should not destroy the session. I write hooks with `exit 0` as the default and the blocking exit `2` only on the matching pattern. The cost of a misbehaving hook should be "no enforcement," not "session dead."
- **Each is short.** None of these scripts is more than 25 lines. If a hook needs more, it should be a real program checked into the repo, not a `.claude/hooks/*.sh`.

If a hook idea doesn't fit those four properties, it's probably the wrong shape and should be a slash command or a skill instead.

![A 2x2 matrix on two axes. X axis: "stateful ↔ stateless." Y axis: "blocks loop ↔ observes only." Quadrants populated: top-left (blocks · stateless) = block-destructive; top-right (blocks · stateful) = "rarely a good shape — most blocks should be stateless"; bottom-left (observes · stateless) = format-on-write, log-tool-use; bottom-right (observes · stateful) = session-context-injection, cost-guardrail. Footer caption: hooks belong in three of four quadrants. The fourth — stateful blocking — is where complexity bites.](/writing/claude-hook-shape-matrix.svg "Good hooks live in three of four quadrants. Stateful blocking hooks are where complexity creeps in — prefer stateless blocks and stateful observers.")

## What I tried and removed

To balance the keeper list — three hooks I built and uninstalled within a week:

- **A "warn before file delete" hook.** Sounded prudent. In practice the model rarely deletes files unsolicited, and the warning interrupted legitimate cleanup. Net negative on flow.
- **A "rewrite tone on every output" hook.** I wanted the model's prose more terse. A `Stop` hook tried to enforce style by transforming the final message. It made the output worse — the model and the transformer drifted on what "terse" meant. I switched to a *mode plugin* (caveman) instead, which shapes the prose at generation time.
- **A "lint TypeScript on every Write" hook that ran the full project lint.** Wall-clock cost on a big repo: 8 seconds per write. That added up to minutes per session of just waiting. I switched to `prettier --write` only (formatter is fast) and let CI handle the lint.

The pattern in what got removed: a hook that runs slowly, runs often, or fights the model is a hook to uninstall. A hook is a tool, not a tax.

## How to start

If you've never written a hook, the minimum-viable starter is the destructive-block one. It costs nothing to install, fires only on the matching pattern, and removes one entire class of risk. Add it tonight. Add the formatter next week. Build the log-and-analyse loop the week after.

The full settings.json snippet to wire them up:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": ".claude/hooks/block-destructive.sh" }] }
    ],
    "PostToolUse": [
      { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": ".claude/hooks/format-on-write.sh" }] },
      { "matcher": ".*",         "hooks": [{ "type": "command", "command": ".claude/hooks/log-tool-use.sh" }] },
      { "matcher": ".*",         "hooks": [{ "type": "command", "command": ".claude/hooks/cost-guardrail.sh" }] }
    ],
    "SessionStart": [
      { "matcher": ".*", "hooks": [{ "type": "command", "command": ".claude/hooks/session-context.sh" }] }
    ]
  }
}
```

Five hooks, one settings.json, deterministic behaviour the model can't argue with. That's the whole point.
