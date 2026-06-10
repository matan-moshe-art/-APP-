# Prompt craft templates

Copy and fill. Delete sections that do not apply.

---

## A. Runtime JSON prompt (app / webhook)

```markdown
OUTPUT CONTRACT (follow exactly)
- Entire reply: ONE JSON object. No text before/after. No markdown fences.
- Keys (lowercase ASCII only): <key1>, <key2>, ...
- Each value: non-empty string in <Hebrew|English>. Keys stay English.

Shape:
{"<key1>":"<...>","<key2>":"<...>"}

PROCESSING (complete internally before output; do not print these steps)
1. Classify input: <types>
2. Extract facts only from text; mark unknowns
3. <task-specific checks>
4. Map to keys; validate literals

ROLE
<one line>

GOAL
<one short paragraph>

FIELD: <key1>
<rules: length, format, first line literals>

FIELD: <key2>
...

FORBIDDEN
- Extra keys, nested JSON, markdown, questions to user, invented contacts/URLs
```

---

## B. Micro prompt

```markdown
You <role>. User provides <input>. Return <format> in <language>. Never <forbidden>.
```

---

## C. Cursor Automation instruction block

(Add to automation UI; keep aligned with app `*-prompt.ts`.)

```markdown
You receive JSON: { "text": "<user message>", "prompt": "<app system prompt>" }.
Follow the prompt field as system instructions. Analyze only `text`.
Return <exactly what app parser expects>.
```

---

## D. Example block for PROMPT_EXAMPLES.md (not in runtime prompt)

```markdown
### <feature-name> — <scenario label>

**Input (excerpt):**
<paste>

**Expected output:**
```json
{ ... }
```
```

---

## Intake decision tree

```
Structured output required?
├─ yes → Contract first + field specs + pipeline
└─ no  → Role + goal + format + forbidden (short)

App feature?
├─ analyze → keys: meaning, urgency, action, suspicious
├─ summarize → keys: topic, urgency, actions, recommendations
└─ other → user defines keys

Examples exist in PROMPT_EXAMPLES.md?
├─ yes → do not duplicate in prompt; reference behavior only
└─ no  → deliver prompt + write 2–3 examples for user to paste
```

---

## Precision checklist (before handing to user)

- [ ] Contract is section 1  
- [ ] Each output field has measurable rules (line 1 literal, max sentences, numbering)  
- [ ] Sentinel string when empty (e.g. no suspicious signs)  
- [ ] Pipeline says “internal only” if output is JSON-only  
- [ ] Forbidden list present  
- [ ] No duplicate phase sections  
- [ ] Examples only in deliverable § “Examples for memory”, not in runtime body  
- [ ] 2–3 example outputs attached for `PROMPT_EXAMPLES.md`
