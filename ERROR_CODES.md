# מסמך קודי שגיאה - מזהה פישינג

> מסמך זה הוא **לשימוש פנימי בלבד** של מתחזקי המערכת ומפתחים. המסמך מתעד את כל קודי השגיאה שמוצגים למשתמשים באתר ומסביר היכן הם נוצרים ומה לעשות איתם.
>
> כל שגיאה שמוצגת למשתמש מסתיימת בקוד מהצורה `XXX-NNN` (לדוגמה `AN-201`, `SM-102`). כשמשתמש מדווח על תקלה, בקשו ממנו את הקוד שראה - הוא יצביע ישירות על המקור.

האפליקציה כוללת **כלי לזיהוי פישינג בעברית** ו-**כלי לסיכום הודעות מורכבות** (מסך בית יחיד ב-`/`; `/summarize` מפנה לשם): המשתמש מדביק טקסט, והמערכת מחזירה תשובה מובנית לפי הפרומפט.

---

## טבלת תחומי קודים

| קידומת | תחום | קובץ ראשי |
|--------|------|-----------|
| `AN-` | ניתוח הודעה (Analyze) | [src/app/api/analyze/route.ts](src/app/api/analyze/route.ts) |
| `SM-` | סיכום הודעות (Summarize) | [src/app/api/summarize/route.ts](src/app/api/summarize/route.ts) |

---

## AN — ניתוח פישינג

| קוד | מה קרה | היכן | מה לעשות |
|-----|--------|------|----------|
| `AN-001` | אין חיבור לאינטרנט בצד הלקוח | `src/hooks/useAnalysisFlow.ts` | לוודא שהמשתמש מחובר לרשת |
| `AN-002` | כשל ברשת בעת קריאה ל-`/api/analyze` | `src/hooks/useAnalysisFlow.ts` | בעיית רשת אצל המשתמש או בעיה ב-Next.js server |
| `AN-102` | אין webhook מוגדר ואין `OPENAI_API_KEY` | `src/app/api/analyze/route.ts` | להגדיר URL + token ל-webhook או `OPENAI_API_KEY` |
| `AN-201` | כשל כללי בקריאה ל-webhook | `src/lib/cursor-webhook-auth.ts` | לבדוק URL, רשת, לוגים |
| `AN-202` | אימות webhook נדחה (401/403) | `src/lib/cursor-webhook-auth.ts` | לבדוק `ANALYZE_WEBHOOK_AUTH_TOKEN_*` |
| `AN-203` | timeout ב-polling של Cloud Agents (180s) או ביטול בקשה | `src/lib/cursor-webhook-auth.ts`, `src/hooks/useAnalysisFlow.ts` | האוטומציה לא סיימה בזמן; לבדוק אוטומציה ב-Cursor |
| `AN-204` | שגיאת רשת בזמן polling | `src/lib/cursor-webhook-auth.ts` | DNS, חיבור, או יותר מדי שגיאות רצופות |
| `AN-205` | webhook URL לא נמצא (404) | `src/lib/cursor-webhook-auth.ts` | לבדוק `ANALYZE_WEBHOOK_URL_*` |
| `AN-206` | הרצת agent הסתיימה ב-ERROR/CANCELLED/EXPIRED | `src/lib/cursor-webhook-auth.ts` | לבדוק לוגים באוטומציה ב-Cursor |
| `AN-207` | webhook הצליח אבל החזיר תשובה שלא ניתן לפרש | `src/app/api/analyze/route.ts` | לבדוק פלט האוטומציה - חייבים 4 שדות: `meaning`, `urgency`, `action`, `suspicious` |
| `AN-301` | OpenAI החזיר תשובה ריקה | `src/app/api/analyze/route.ts` | לנסות שוב; אם חוזר - לבדוק מודל ופרומפט |
| `AN-302` | OpenAI החזיר תשובה שאינה JSON תקין | `src/app/api/analyze/route.ts` | לבדוק שהפרומפט דורש `response_format: json_object` |
| `AN-303` | OpenAI החזיר JSON אבל בלי השדות הנדרשים | `src/app/api/analyze/route.ts` | לבדוק `src/lib/analyze-prompt-short.ts` / `analyze-prompt-long.ts` |
| `AN-304` | חריגה כללית מ-OpenAI | `src/app/api/analyze/route.ts` | לבדוק לוגים בשרת |
| `AN-500` | תשובה לא צפויה מהשרת בצד הלקוח | `src/hooks/useAnalysisFlow.ts` | לבדוק לוגים של ה-API |
| `AN-501` | התשובה לא תאמה למבנה ידוע | `src/hooks/useAnalysisFlow.ts` | באג בלקוח או פלט webhook לא תקין |

---

## SM — סיכום הודעות

| קוד | מה קרה | היכן | מה לעשות |
|-----|--------|------|----------|
| `SM-001` | אין חיבור לאינטרנט בצד הלקוח | `src/hooks/useAnalysisFlow.ts` | לוודא שהמשתמש מחובר לרשת |
| `SM-002` | כשל ברשת בעת קריאה ל-`/api/summarize` | `src/hooks/useAnalysisFlow.ts` | בעיית רשת אצל המשתמש או בעיה ב-Next.js server |
| `SM-102` | אין webhook מוגדר (URL או token חסר) | `src/app/api/summarize/route.ts` | להגדיר `SUMMARIZE_WEBHOOK_URL_*` + `SUMMARIZE_WEBHOOK_AUTH_TOKEN_*` |
| `SM-201` | כשל כללי בקריאה ל-webhook | `src/lib/cursor-webhook-auth.ts` | לבדוק URL, רשת, לוגים |
| `SM-202` | אימות webhook נדחה (401/403) | `src/lib/cursor-webhook-auth.ts` | לבדוק `SUMMARIZE_WEBHOOK_AUTH_TOKEN_*` |
| `SM-203` | timeout ב-polling של Cloud Agents (180s) או ביטול בקשה | `src/lib/cursor-webhook-auth.ts`, `src/hooks/useAnalysisFlow.ts` | האוטומציה לא סיימה בזמן |
| `SM-204` | שגיאת רשת בזמן polling | `src/lib/cursor-webhook-auth.ts` | DNS, חיבור, או יותר מדי שגיאות רצופות |
| `SM-205` | webhook URL לא נמצא (404) | `src/lib/cursor-webhook-auth.ts` | לבדוק `SUMMARIZE_WEBHOOK_URL_*` |
| `SM-206` | הרצת agent הסתיימה ב-ERROR/CANCELLED/EXPIRED | `src/lib/cursor-webhook-auth.ts` | לבדוק לוגים באוטומציה ב-Cursor |
| `SM-207` | webhook החזיר תשובה שלא ניתן לפרש | `src/app/api/summarize/route.ts` | לבדוק פלט האוטומציה - 4 שדות: `topic`, `urgency`, `actions`, `recommendations` |
| `SM-500` | תשובה לא צפויה מהשרת בצד הלקוח | `src/hooks/useAnalysisFlow.ts` | לבדוק לוגים של ה-API |
| `SM-501` | התשובה לא תאמה למבנה ידוע | `src/hooks/useAnalysisFlow.ts` | באג בלקוח או פלט webhook לא תקין |

---

## הוספת קוד חדש

כשאתם מוסיפים נתיב חדש או נקודת כשל חדשה:

1. בחרו את הקידומת המתאימה (`AN-` או `SM-`).
2. השתמשו בטווחים הבאים:
   - `1xx` - הגדרות / קונפיג חסר.
   - `2xx` - תקלת תשתית / רשת / ספק חיצוני.
   - `3xx` - שגיאת לוגיקה / זרימה.
   - `5xx` - תקלה לא ידועה / חריגה לא צפויה.
3. החזירו תמיד `eventCode` ו-`message` בתשובת ה-JSON, או הצמידו את הקוד למחרוזת בעברית בצד הלקוח.
4. עדכנו את הטבלה הרלוונטית במסמך הזה.

---

## הערה על פרטיות

ההודעות והתשובות של המשתמשים **נשמרות ב-Postgres** (טבלת `ai_interactions`) כש-`POSTGRES_URL` מוגדר — לשיפור המודל. האפליקציה מציינת זאת ב-footer. אין מציג נתונים בתוך האפליקציה; לצפייה השתמשו ב-pgAdmin.

לניקוי שורות שנתקעו ב-`status='started'` (למשל אחרי קריסת שרת):

```sql
UPDATE ai_interactions
SET status = 'failed', error_code = 'STUCK-STARTED', completed_at = NOW()
WHERE status = 'started' AND created_at < NOW() - INTERVAL '30 minutes';
```
