---
name: prompt-craft
description: >-
  Authors and refines system prompts, automation instructions, and meta-prompts
  for this workspace. Use when the user wants to write, find, improve, tighten,
  or debug a prompt; mentions system prompt, instructions, roles, phases, goals,
  tasks, JSON output contract, analyze-prompt, summarize-prompt, GPT Builder, or
  Cursor automation wording. Not for visual UI (use app-design).
---

# Prompt craft

Help the user build **precise, runnable** prompts. A prompt may be one sentence or hundreds of lines—the skill adapts by **type** and **complexity**, not a fixed length.

**Not in scope:** colors, layout, CSS (use `app-design`).

## What “maximum effect” means here

The model should **process** input in a clear order, then **emit** in a strict shape. Weak prompts describe vibes; strong prompts define:

1. **Who** is speaking and **who** reads the output  
2. **What** success looks like (one sentence)  
3. **How** to think (ordered steps, internal only if output is JSON-only)  
4. **Exactly** what to return (contract, literals, forbidden)  
5. **What** never to do  

**Examples do not belong in the production prompt** once stable. Store them in `PROMPT_EXAMPLES.md` (and optionally `AI_MEMORY.md` under Prompt examples). The skill must **read** those files before rewriting a prompt.

## Before writing: read

| Source | When |
|--------|------|
| `PROMPT_EXAMPLES.md` | Always—user’s golden input/output pairs |
| `AI_MEMORY.md` → Prompt examples | If present |
| `src/lib/analyze-prompt.ts` | Phishing / scam analyzer for this app |
| `src/lib/summarize-prompt.ts` | Summarize feature for this app |
| User message | Which file or surface to target |

If examples are missing for a **structured** prompt, still deliver the prompt, then supply **2–3 example outputs** for the user to paste into `PROMPT_EXAMPLES.md`.

## Intake: one question per turn

Do not guess. If anything below is unclear, ask **exactly one** short question, then wait.

| Order | Question (pick first gap) |
|-------|---------------------------|
| 1 | **Surface:** app runtime (`*-prompt.ts`), Cursor **Automation** instructions, **GPT Builder** meta-prompt, or other? |
| 2 | **Consumer:** end user on website, cloud agent via webhook, or you in chat? |
| 3 | **Output:** strict JSON / markdown / plain Hebrew / bilingual? |
| 4 | **Language:** Hebrew content, English structure, or mixed (define rule)? |
| 5 | **Edit or greenfield:** which file or paste target? |

Skip questions already answered in the thread.

## Classify prompt type → length policy

| Type | Typical length | Notes |
|------|----------------|-------|
| **Micro** | 1–3 sentences | Single task, no JSON |
| **Runtime JSON** (this app) | Medium: contract + 4 field specs + forbidden | No embedded long examples |
| **Automation** | Medium + tool/MCP rules | What webhook receives (`text`, `prompt`) |
| **Meta / GPT Builder** | Longer allowed | Phases, intake, refusal; one question per turn |
| **Complex** | Long | Multi-phase OK; still cut redundancy |

**Default:** shorter beats longer. Add lines only when they **change behavior** (literal strings, order of steps, forbidden list). Remove duplicate sections (e.g. “tasks” and “five steps” saying the same thing).

## Standard build order (assemble in this order)

Use these headings in the final prompt (English or Hebrew per user; keep **JSON keys** in ASCII when required).

### 1. Output contract (first if structured)

- One artifact only (e.g. single JSON object).  
- No markdown fences, no preamble, no follow-up questions.  
- Keys: names, types, non-empty rules.  
- Provide a **one-line shape** with placeholders.  

### 2. Role and audience

- Role in one line.  
- Who the user is and what they need (e.g. Israeli user pasting SMS; employee pasting email).  

### 3. Goal

- One paragraph max: outcome, not process.  

### 4. Processing pipeline (fixes imprecision)

Tell the model to **complete these internally before output** (wording may be Hebrew):

1. Classify the pasted text (type, claimed sender).  
2. Extract **only** facts present; mark unknowns.  
3. Run checks relevant to the task (urgency, scam signals, tasks).  
4. Map results into the contract fields.  
5. Validate: all keys, literals, forbidden rules satisfied.  

Then: **Output only** the contract (e.g. JSON).

### 5. Field specifications

Per key: length, first-line literals, numbering format, exact sentinel strings when nothing to report (copy from analyze-prompt pattern).

### 6. Tone and boundaries

- Calm, factual, not alarmist; no legal/medical binding advice.  
- No invented phone numbers, URLs, amounts.  

### 7. Forbidden

Bullets: extra keys, arrays in values, questions to user, markdown wrapper, invented facts, etc.

### 8. Edge cases (short)

3–6 bullets: empty-ish text, wrong doc type, thread vs single message, phishing vs legitimate.

**Do not** add a long “examples” section in the production prompt if examples live in `PROMPT_EXAMPLES.md`.

## Repo anchors (this application)

| Feature | File | JSON keys |
|---------|------|-----------|
| Phishing analyze | `src/lib/analyze-prompt.ts` | `meaning`, `urgency`, `action`, `suspicious` |
| Summarize | `src/lib/summarize-prompt.ts` | `topic`, `urgency`, `actions`, `recommendations` |

**Urgency line 1** must be exactly one of: `דחוף` / `בינוני` / `לא דחוף` (summarize) or `דחוף` / `בינוני` / `לא דחוף` (analyze uses same Hebrew labels in analyze-prompt).

When improving these files:

- Prefer **analyze-prompt** style: English section labels, tight field blocks, no huge demo JSON inside the string.  
- Move few-shot demos from `summarize-prompt.ts` into `PROMPT_EXAMPLES.md`.  
- Align both prompts on the same **pipeline + contract-first** structure.

**Webhook note:** App sends `{ text, prompt }`. Automation may add its own instructions; avoid contradicting the app contract.

## Deliverables (every completion)

Reply in this order:

1. **Summary** (3–5 bullets): what changed and why.  
2. **Final prompt** — full paste-ready text (or unified diff for `*-prompt.ts`).  
3. **Where to save** — file path and env/automation if relevant.  
4. **Example outputs for memory** — section titled `## Examples to add to PROMPT_EXAMPLES.md`:  
   - 2–3 items: short label, sample **input** (excerpt), sample **output** (exact JSON or text expected).  
   - User copies these into `PROMPT_EXAMPLES.md`; do not require them inside the runtime prompt.  
5. **Optional:** “Regression checks” — 2 edge inputs the prompt must handle.

## Anti-patterns (reject or rewrite)

- “Be helpful”, “best effort”, without contract or pipeline  
- Same instructions in **משימות**, **שלבים**, and **זרימת עבודה** (merge one pipeline)  
- Large example JSON **inside** `SUMMARIZE_SYSTEM_PROMPT` (bloats tokens; drifts behavior)  
- Vague urgency without **first-line literal** rule  
- Mixed Hebrew/English rules without explicit “keys English, values Hebrew”  
- Asking the end user questions in a one-shot API prompt  
- Chain-of-thought visible in JSON output (pipeline is internal only)

## GPT Builder / meta-prompt mode

When user builds a **configurator** assistant (not runtime):

- Strict section order, refusal template, one question per turn, no fake “anything else?”  
- User may want English template headings with Hebrew body—follow their prior GPTBuilder prefs in `AI_MEMORY.md`.  
- Still end with **example outputs for memory**, not necessarily inside the meta-prompt.

## Templates

Skeletons and checklists: [templates.md](templates.md)
