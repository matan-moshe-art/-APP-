# Phishing analyze automation (match summarize speed)

The summarize automation is fast because it only returns JSON and does not touch the repo. The phishing automation must use the **same pattern**.

## In [cursor.com/automations](https://cursor.com/automations) — edit the phishing webhook

### Trigger
- **Incoming HTTP webhook** only (same as summarize).

### Tools — turn everything OFF
- No **Open or update PRs** / git checkout
- No **Comment on PRs**
- No **Post to Slack** / **Read Slack**
- No **MCP server**
- No **Manage check runs** / **Request reviewers**

If a **Repository** or **Branch** field appears, clear it. The agent must not have a workspace to edit.

### Instructions (paste this)

```
Headless JSON API for the Hebrew phishing app. On each webhook POST:

1. Parse the JSON body. Use `prompt` as your full system rules. Analyze only the string in `text`.
2. Your entire `result` must be ONLY one JSON object — nothing before or after, no markdown fences:
   {"meaning":"<hebrew>","urgency":"<hebrew>","action":"<hebrew>","suspicious":"<hebrew>"}
3. Keys must be lowercase English: meaning, urgency, action, suspicious. Values must be non-empty Hebrew strings.
4. urgency line 1 must be exactly: דחוף OR בינוני OR לא דחוף (then blank line, then reason).
5. Input may be any language; output values always Hebrew.
6. Do NOT read, search, or edit any files. Do NOT run shell commands. Do NOT open PRs or explore the repository.
7. Do NOT use tools unless required to produce the final answer text. Prefer answering immediately from `text` + `prompt` only.
8. Do NOT ask follow-up questions. Do NOT return setup summaries, branch names, or file-creation logs.

If you cannot parse the webhook body, still return valid JSON with all four keys filled honestly.
```

### Other settings (match summarize)
- **Memory**: off
- **Model**: same model as the summarize automation (or default fast model)

### Webhook auth
Keep the existing **Generate auth header** token; the app sends it as `Authorization: Bearer crsr_…` via `ANALYZE_WEBHOOK_AUTH_TOKEN_SHORT` (short) or `ANALYZE_WEBHOOK_AUTH_TOKEN_LONG` (long).

## App payload (already aligned)

`POST /api/analyze` sends `{ "text": "...", "prompt": "<ANALYZE_*_SYSTEM_PROMPT>", "inputType": "short" | "long" }` — same shape as summarize.

## Error AN-207

`AN-207` means the webhook run **finished** but the app could not extract four non-empty fields from the agent `result`. Common causes:

| Bad agent output | Fix |
|------------------|-----|
| Markdown \`\`\`json … \`\`\` | Return raw JSON only |
| Plain Hebrew explanation, no JSON | Follow contract in step 2 |
| "Worked for 54s, created files…" | Turn off repo/tools; headless only |
| Hebrew keys (משמעות, דחיפות) | Keys must be English |
| Missing or empty field | All four strings required |

Paste the automation instructions above and disable all tools.
