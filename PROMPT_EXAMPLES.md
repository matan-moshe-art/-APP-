# Prompt examples (memory for agents)

Golden **input → output** pairs for this app. Agents with the `prompt-craft` skill read this file before editing `src/lib/*-prompt.ts`.

**Do not** paste large blocks from here into runtime prompts unless debugging—keep production prompts lean.

---

## How to add an example

```markdown
### <feature> — <short scenario name>

**Input (excerpt):**
<pasted user text>

**Expected output:**
```json
{ "key": "..." }
```
```

---

## analyze (phishing) — short

### analyze short — bare English money ask (user case)

**Input (excerpt):**
```
give me 3000$
```

**Expected output:**
```json
{
  "meaning": "ההודעה באנגלית ומכילה רק בקשה קצרה לקבל 3,000 דולר. אין שולח מזוהה, אין הקשר, ואין סימנים של התחזות לבנק או לגוף רשמי.",
  "urgency": "לא דחוף\n\nאין דדליין, קישור, איום או לחץ — רק בקשה קצרה ללא פרטי התקשרות.",
  "action": "1. אל תשלמו כסף לפי הודעה קצרה בלי לדעת מי השולח ומה ההקשר.\n2. אם הבקשה הגיעה ממישהו מוכר — וודאו מולו ישירות בערוץ אחר (שיחה, פגישה).\n3. אם המקור לא מוכר — אל תעבירו כסף ואל תשתפו פרטים.",
  "suspicious": "לא נמצא תוכן חשוד בהודעה זו."
}
```

### analyze short — Hebrew bank phishing SMS

**Input (excerpt):**
```
בנק לאומי: חשבונך נחסם עקב פעילות חריגה. לאימות מיידי: http://leumi-verify.co.il
```

**Expected output:**
```json
{
  "meaning": "הודעה שמתחזה לבנק לאומי וטוענת שהחשבון נחסם. מבקשים ללחוץ על קישור לאימות — דפוס טיפוסי של פישינג.",
  "urgency": "דחוף\n\nאם לוחצים על הקישור ומוסרים פרטים, הסיכון להונאה ולגניבת כסף גבוה.",
  "action": "1. אל תשלמו, אל תלחצו על קישורים, ואל תמסרו פרטים אישיים.\n2. היכנסו לאפליקציה או לאתר הבנק הרשמי ישירות — בלי הקישור בהודעה.\n3. אם יש חשש — התקשרו למספר שמופיע על גב הכרטיס או באתר הרשמי.",
  "suspicious": "• דומיין לא רשמי (leumi-verify.co.il)\n• לחץ דחיפות ואיום על חסימת חשבון\n• בקשה לאימות דרך קישור חיצוני"
}
```

### analyze short — legitimate delivery notice

**Input (excerpt):**
```
דואר ישראל: חבילה ממתינה לאיסוף בסניף רמת גן. מספר מעקב 1234567890. שעות איסוף 08:00-18:00.
```

**Expected output:**
```json
{
  "meaning": "הודעת דואר ישראל על חבילה שממתינה לאיסוף ברמת גן, עם מספר מעקב ושעות פעילות. נראית כהודעת שירות שגרתית.",
  "urgency": "בינוני\n\nיש לטפל באיסוף בזמן כדי שלא תוחזר החבילה, אבל אין סיכון פישינג מיידי.",
  "action": "1. בדקו את מספר המעקב במערכת דואר ישראל הרשמית.\n2. גשו לסניף עם תעודה מזהה לאיסוף.\n3. שמרו את מספר המעקב לעדכונים.",
  "suspicious": "לא נמצא תוכן חשוד בהודעה זו."
}
```

### analyze short — BAD outputs (cause AN-207)

**Bad — markdown wrapper (do NOT return this):**
````
```json
{"meaning":"...","urgency":"...","action":"...","suspicious":"..."}
```
````

**Bad — plain text instead of JSON:**
```
ההודעה נראית חשודה. מומלץ לא ללחוץ על קישורים.
```

**Bad — agent task summary (do NOT return this):**
```
Worked for 54s. Created src/prompts/analyzeShort.ts on branch cursor/...
```

**Bad — Hebrew keys:**
```json
{"משמעות":"...","דחיפות":"...","פעולה":"...","חשוד":"..."}
```

---

## summarize

<!-- Paste examples below after prompt-craft generates them -->
