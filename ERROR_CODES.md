# מסמך קודי שגיאה - מזהה פישינג

> מסמך זה הוא **לשימוש פנימי בלבד** של מתחזקי המערכת ומפתחים. המסמך מתעד את כל קודי השגיאה שמוצגים למשתמשים באתר ומסביר היכן הם נוצרים ומה לעשות איתם.
>
> כל שגיאה שמוצגת למשתמש מסתיימת בקוד מהצורה `XXX-NNN` (לדוגמה `AN-201`, `AUTH-101`). כשמשתמש מדווח על תקלה, בקשו ממנו את הקוד שראה - הוא יצביע ישירות על המקור.

האפליקציה כוללת **כלי לזיהוי פישינג בעברית** ו-**כלי לסיכום אימיילים ארוכים** (עמוד `/summarize`): המשתמש מדביק טקסט, והמערכת מחזירה תשובה מובנית לפי הפרומפט.

---

## טבלת תחומי קודים

| קידומת | תחום | קובץ ראשי |
|--------|------|-----------|
| `AN-` | ניתוח הודעה (Analyze) | [src/app/api/analyze/route.ts](src/app/api/analyze/route.ts) |
| `SM-` | סיכום אימיילים (Summarize) | [src/app/api/summarize/route.ts](src/app/api/summarize/route.ts) |
| `AUTH-` | התחברות / כניסה | [src/components/auth/SupabaseMagicLinkForm.tsx](src/components/auth/SupabaseMagicLinkForm.tsx), [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts) |
| `REG-` | הרשמה | [src/components/auth/SupabaseMagicLinkForm.tsx](src/components/auth/SupabaseMagicLinkForm.tsx) |
| `PROF-` | פרופיל / סנכרון משתמש | [src/app/api/auth/sync/route.ts](src/app/api/auth/sync/route.ts) |
| `BILL-` | מנוי / חיוב | [src/app/api/billing/](src/app/api/billing/) |

---

## AN — ניתוח פישינג

| קוד | מה קרה | היכן | מה לעשות |
|-----|--------|------|----------|
| `AN-001` | אין חיבור לאינטרנט בצד הלקוח | `src/app/page.tsx` | לוודא שהמשתמש מחובר לרשת |
| `AN-002` | כשל ברשת בעת קריאה ל-`/api/analyze` | `src/app/page.tsx` | בעיית רשת אצל המשתמש או בעיה ב-Next.js server |
| `AN-101` | `ANALYZE_WEBHOOK_URL` מוגדר אבל אינו URL תקין | `src/app/api/analyze/route.ts` | לתקן את `.env.local` - הכתובת חייבת להתחיל ב-`http://` או `https://` |
| `AN-102` | אין הגדרת webhook ואין `OPENAI_API_KEY` | `src/app/api/analyze/route.ts` | להגדיר לפחות אחד מהשניים בסביבה |
| `AN-201` | כשל כללי בשליחה ל-webhook (n8n) | `src/app/api/analyze/route.ts` | לבדוק ש-n8n זמין ושהזרימה פעילה |
| `AN-202` | webhook החזיר 401/403 - בעיית הרשאה | `src/app/api/analyze/route.ts` | לבדוק `ANALYZE_WEBHOOK_AUTH_HEADER_*` או Basic Auth |
| `AN-204` | DNS לא מוצא את ה-host (`ENOTFOUND`/`ECONNREFUSED`) | `src/app/api/analyze/route.ts` | לבדוק שכתובת ה-webhook נכונה ושהדומיין חי |
| `AN-205` | webhook החזיר 404 - הנתיב לא קיים | `src/app/api/analyze/route.ts` | הזרימה ב-n8n כובתה או הוסרה. להפעיל מחדש |
| `AN-206` | תקלה ב-OpenAI כ-fallback | `src/app/api/analyze/route.ts` | לבדוק את ה-API key, מיכסה, וסטטוס OpenAI |
| `AN-207` | webhook הצליח אבל החזיר תשובה שלא ניתן לפרש | `src/app/api/analyze/route.ts` | לבדוק את הפלט של "Respond to Webhook" ב-n8n - חייבים להיות 4 שדות: `meaning`, `urgency`, `action`, `suspicious` |
| `AN-208` | polling הגיע ל-timeout (5 דקות) | `src/app/page.tsx` | n8n לא חזר עם תשובה. לבדוק את הזרימה |
| `AN-301` | OpenAI החזיר תשובה ריקה | `src/app/api/analyze/route.ts` | לנסות שוב; אם חוזר - לבדוק מודל ופרומפט |
| `AN-302` | OpenAI החזיר תשובה שאינה JSON תקין | `src/app/api/analyze/route.ts` | לבדוק שהפרומפט דורש `response_format: json_object` |
| `AN-303` | OpenAI החזיר JSON אבל בלי השדות הנדרשים | `src/app/api/analyze/route.ts` | לבדוק את הפרומפט ב-`src/lib/analyze-prompt.ts` |
| `AN-304` | חריגה כללית מ-OpenAI | `src/app/api/analyze/route.ts` | לבדוק לוגים בשרת |
| `AN-500` | תשובה לא צפויה מהשרת בצד הלקוח | `src/app/page.tsx` | לבדוק לוגים של ה-API |
| `AN-501` | התשובה נכנסה לזרם אבל לא תאמה לאף מבנה ידוע | `src/app/page.tsx` | באג בלקוח - שדרוג גרסה |

---

## SM — סיכום אימיילים

| קוד | מה קרה | היכן | מה לעשות |
|-----|--------|------|----------|
| `SM-001` | אין חיבור לאינטרנט בצד הלקוח | `src/app/summarize/page.tsx` | לוודא שהמשתמש מחובר לרשת |
| `SM-002` | כשל ברשת בעת קריאה ל-`/api/summarize` | `src/app/summarize/page.tsx` | בעיית רשת אצל המשתמש או בעיה ב-Next.js server |
| `SM-101` | `SUMMARIZE_WEBHOOK_URL` מוגדר אבל אינו URL תקין | `src/app/api/summarize/route.ts` | לתקן את `.env.local` - הכתובת חייבת להתחיל ב-`http://` או `https://` |
| `SM-102` | אין הגדרת webhook ואין `OPENAI_API_KEY` | `src/app/api/summarize/route.ts` | להגדיר לפחות אחד מהשניים בסביבה |
| `SM-201` | כשל כללי בשליחה ל-webhook (n8n) | `src/app/api/summarize/route.ts` | לבדוק ש-n8n זמין ושהזרימה פעילה |
| `SM-202` | webhook החזיר 401/403 - בעיית הרשאה | `src/app/api/summarize/route.ts` | לבדוק `SUMMARIZE_WEBHOOK_AUTH_HEADER_*` אם הוגדר |
| `SM-204` | DNS לא מוצא את ה-host (`ENOTFOUND`/`ECONNREFUSED`) | `src/app/api/summarize/route.ts` | לבדוק שכתובת ה-webhook נכונה ושהדומיין חי |
| `SM-205` | webhook החזיר 404 - הנתיב לא קיים | `src/app/api/summarize/route.ts` | הזרימה ב-n8n כובתה או הוסרה. להפעיל מחדש |
| `SM-207` | webhook הצליח אבל החזיר תשובה שלא ניתן לפרש | `src/app/api/summarize/route.ts` | לבדוק את הפלט של "Respond to Webhook" ב-n8n - חייבים להיות 4 שדות: `topic`, `urgency`, `actions`, `recommendations` |
| `SM-208` | polling הגיע ל-timeout (5 דקות) | `src/app/summarize/page.tsx` | n8n לא חזר עם תשובה. לבדוק את הזרימה |
| `SM-301` | OpenAI החזיר תשובה ריקה | `src/app/api/summarize/route.ts` | לנסות שוב; אם חוזר - לבדוק מודל ופרומפט |
| `SM-302` | OpenAI החזיר תשובה שאינה JSON תקין | `src/app/api/summarize/route.ts` | לבדוק שהפרומפט דורש `response_format: json_object` |
| `SM-303` | OpenAI החזיר JSON אבל בלי השדות הנדרשים | `src/app/api/summarize/route.ts` | לבדוק את הפרומפט ב-`src/lib/summarize-prompt.ts` |
| `SM-304` | חריגה כללית מ-OpenAI | `src/app/api/summarize/route.ts` | לבדוק לוגים בשרת |
| `SM-500` | תשובה לא צפויה מהשרת בצד הלקוח | `src/app/summarize/page.tsx` | לבדוק לוגים של ה-API |
| `SM-501` | התשובה נכנסה לזרם אבל לא תאמה לאף מבנה ידוע | `src/app/summarize/page.tsx` | באג בלקוח - שדרוג גרסה |

---

## AUTH — התחברות

| קוד | מה קרה | היכן | מה לעשות |
|-----|--------|------|----------|
| `AUTH-001` | Supabase לא מוגדר בצד הלקוח | `src/components/auth/SupabaseMagicLinkForm.tsx` | לוודא שמוגדרים `NEXT_PUBLIC_SUPABASE_URL` ו-`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ב-`.env.local` |
| `AUTH-100` | שגיאת התחברות לא מזוהה (Supabase) | טופס התחברות | לבדוק לוגים של Supabase |
| `AUTH-101` | אימייל או סיסמה שגויים | טופס התחברות | המשתמש טעה - לבדוק או לאפס סיסמה |
| `AUTH-102` | החשבון נוצר אבל המייל לא אומת | טופס התחברות | המשתמש צריך ללחוץ על קישור האימות במייל |
| `AUTH-103` | כשל כניסה כללי | טופס התחברות | לבדוק לוגים של Supabase |
| `AUTH-104` | חריגה ממכסת מיילים של Supabase (429) | טופס התחברות | להמתין כמה דקות; בפיתוח להגדיר SMTP אישי |
| `AUTH-110` | שדה אימייל ריק | טופס התחברות (validation) | המשתמש לא הזין אימייל |
| `AUTH-111` | שדה סיסמה ריק | טופס התחברות (validation) | המשתמש לא הזין סיסמה |
| `AUTH-200` | שגיאת runtime כללית בעת התחברות | טופס התחברות | לבדוק לוגים בקונסול הדפדפן |
| `AUTH-201` | אין חיבור לשרת Supabase מהדפדפן | טופס התחברות | בעיית רשת / חוסם / DNS אצל המשתמש |
| `AUTH-300` | שגיאה לא מזוהה ב-redirect מ-`/auth/callback` | פרמטר `error` בכניסה ל-login | לבדוק לוגים של callback |
| `AUTH-301` | החלפת קוד ל-session נכשלה ב-`/auth/callback` | `src/app/auth/callback/route.ts` | קישור פג / כבר נצרך / לא תואם להגדרות Supabase |
| `AUTH-302` | קישור התחברות לא תקין או שפג תוקפו | `src/app/auth/callback/route.ts` | לבקש מהמשתמש קישור חדש |
| `AUTH-303` | חרגתם ממגבלת שליחת מיילים | טופס התחברות | להמתין |

---

## REG — הרשמה

| קוד | מה קרה | היכן | מה לעשות |
|-----|--------|------|----------|
| `REG-100` | שגיאת הרשמה לא מזוהה | טופס הרשמה | לבדוק לוגים של Supabase |
| `REG-101` | סיסמה חלשה מדי (פחות מהמינימום של Supabase) | טופס הרשמה | המשתמש צריך לבחור סיסמה חזקה יותר |
| `REG-102` | האימייל כבר רשום | טופס הרשמה | לכוון את המשתמש למסך הכניסה |
| `REG-103` | הרשמה כבויה ב-Supabase | טופס הרשמה | להפעיל "Allow new users to sign up" ב-Auth Providers |
| `REG-104` | חריגה ממכסת מיילים של Supabase בעת הרשמה | טופס הרשמה | להמתין |
| `REG-105` | כשל הרשמה כללי | טופס הרשמה | לבדוק לוגים |
| `REG-110` | סיסמה קצרה מ-6 תווים (validation בצד הלקוח) | טופס הרשמה | המשתמש צריך להאריך |

---

## PROF — פרופיל / סנכרון משתמש

| קוד | מה קרה | היכן | מה לעשות |
|-----|--------|------|----------|
| `PROF-401` | קריאה ל-`/api/auth/sync` בלי משתמש מחובר | `src/app/api/auth/sync/route.ts` | המשתמש איבד session - להפנות לכניסה חוזרת |
| `PROF-501` | סנכרון פרופיל ל-DB נכשל | `src/app/api/auth/sync/route.ts` | בדרך כלל בעיית Prisma / DB. לבדוק `DATABASE_URL` ו-`DIRECT_URL` |

---

## BILL — מנוי וחיוב

| קוד | מה קרה | היכן | מה לעשות |
|-----|--------|------|----------|
| `BILL-101` | קריאה ל-checkout בלי שמערכת החיוב הוגדרה | `src/app/api/billing/checkout/route.ts` | להגדיר משתני סביבה של Lemon Squeezy או להשאיר את `BILLING_ZERO_PRICE_TEST_MODE=true` |
| `BILL-102` | ספק חיוב לא נתמך ב-checkout | `src/app/api/billing/checkout/route.ts` | רק `lemonsqueezy` נתמך כיום |
| `BILL-103` | ספק חיוב לא נתמך ב-portal | `src/app/api/billing/portal/route.ts` | להחליף `BILLING_PROVIDER` ל-`lemonsqueezy` |
| `BILL-201` | שגיאה ביצירת checkout (Lemon Squeezy / DB) | `src/app/api/billing/checkout/route.ts` | לבדוק `LEMONSQUEEZY_API_KEY`, `STORE_ID`, `VARIANT_ID` ולוגים בשרת |
| `BILL-301` | ניסיון לבטל מנוי כש-test mode כבוי | `src/app/api/billing/cancel/route.ts` | בפרודקשן הביטול עובר דרך פורטל הסליקה |
| `BILL-302` | אין `LEMONSQUEEZY_CUSTOMER_PORTAL_URL` (ולא test mode) | `src/app/api/billing/portal/route.ts` | להגדיר את משתנה הסביבה |
| `BILL-401` | קריאה ל-`/api/billing/subscription` בלי משתמש | `src/app/api/billing/subscription/route.ts` | session פג - להפנות לכניסה |
| `BILL-402` | קריאה ל-`/api/billing/checkout` בלי משתמש | `src/app/api/billing/checkout/route.ts` | session פג - להפנות לכניסה |
| `BILL-403` | קריאה ל-`/api/billing/cancel` בלי משתמש | `src/app/api/billing/cancel/route.ts` | session פג - להפנות לכניסה |
| `BILL-404` | קריאה ל-`/api/billing/portal` בלי משתמש | `src/app/api/billing/portal/route.ts` | session פג - להפנות לכניסה |
| `BILL-501` | טעינת סטטוס מנוי נכשלה (DB) | `src/app/api/billing/subscription/route.ts` | בעיית Prisma / DB; אם test mode פעיל המערכת תיתן הרשאה למרות התקלה |

---

## הוספת קוד חדש

כשאתם מוסיפים נתיב חדש או נקודת כשל חדשה:

1. בחרו את הקידומת המתאימה (`AN-`, `SM-`, `AUTH-`, `REG-`, `PROF-`, `BILL-`).
2. השתמשו בטווחים הבאים:
   - `1xx` - הגדרות / קונפיג חסר.
   - `2xx` - תקלת תשתית / רשת / ספק חיצוני.
   - `3xx` - שגיאת לוגיקה / זרימה.
   - `4xx` - בעיית הרשאה / משתמש לא מחובר.
   - `5xx` - תקלה לא ידועה / חריגה לא צפויה.
3. החזירו תמיד `eventCode` ו-`message` בתשובת ה-JSON, או הצמידו את הקוד למחרוזת בעברית בצד הלקוח.
4. עדכנו את הטבלה הרלוונטית במסמך הזה.

---

## הערה על פרטיות

ההודעות שמשתמשים מדביקים לבדיקת פישינג **לא נשמרות** באופן קבוע (האפליקציה מציינת זאת ב-footer). אל תוסיפו לוגים שמכילים את תוכן ההודעה למסד נתונים בלי לעדכן את מדיניות הפרטיות.
