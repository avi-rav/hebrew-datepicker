# heb-date-picker

**בורר תאריכים (Date Picker) לפי הלוח העברי — לאפליקציות Angular.**

תאריכים מוצגים כפי שנהוג לכתוב אותם בעברית — **`כ״א אלול תשפ״ו`** — ולא כמספרים.
המטרה: לתת רכיב מוכן, שאפשר להתקין בפקודה אחת ולהטמיע בכל פרויקט Angular קיים
תוך דקות, בלי לכתוב לוגיקת לוח עברי בעצמכם.

📦 **npm:** [`heb-date-picker`](https://www.npmjs.com/package/heb-date-picker) ·
[`heb-date-core`](https://www.npmjs.com/package/heb-date-core) (נמשכת אוטומטית)
📄 **קוד מקור:** [github.com/avi-rav/hebrew-datepicker](https://github.com/avi-rav/hebrew-datepicker)

---

## 🌐 דמו חי

**[לחצו כאן לפתיחת דף ה-Demo](https://claude.ai/code/artifact/c5ef5418-2ec4-445e-817d-6d5cdb3160f6)**
— רואים בו את כל האפשרויות בפעולה: בחירת יום, טווח, מגבלות, סימון חגים ושבתות,
ניקוד, מיתוג בצבעים שונים, ומצב בהיר/כהה.

(אפשר גם להריץ דמו מקומי מתוך ה-repo: `npm start` ← `http://localhost:4200`)

## תכולה

- 🗓️ לוח עברי עם תגיות יום/חודש/שנה בגימטריה (עם או בלי ניקוד)
- ↔️ RTL מובנה
- 📌 מצב יום יחיד (`single`) או טווח (`range`)
- 🚫 `min` / `max` + פרדיקט `disabledDates` לימים חסומים
- 🕯️ סימון אוטומטי של שבתות, חגים/מועדים וראשי-חודשים (ארץ ישראל או תפוצות)
- ♿ נגישות: `role="grid"`, ניווט מקלדת מלא, `aria-*`
- 🎨 מיתוג דרך CSS Custom Properties (בלי לגעת בקוד)
- 🔌 `ControlValueAccessor` — עובד עם `[(ngModel)]` ו-Reactive Forms
- 🧩 ליבה אגנוסטית (`heb-date-core`) לשימוש חוזר (למשל React בעתיד)

---

## 🚀 התקנה והטמעה בפרויקט Angular קיים

### שלב 1 — התקנה

בתוך פרויקט ה-Angular שלכם:

```bash
npm i heb-date-picker
```

זהו. פקודה אחת — `heb-date-core` ו-`@hebcal/core` נמשכות אוטומטית. אין תלויות
נוספות להתקין ידנית.

> **דרישה:** Angular ‎`^22` (`@angular/core`, `@angular/common`, `@angular/forms`
> כבר קיימות בכל פרויקט Angular קיים — אין צורך להוסיף אותן).

### שלב 2 — ייבוא הרכיב

הרכיב הוא **standalone** — פשוט מוסיפים אותו ל-`imports` של הקומפוננטה שבה
תרצו להשתמש בו (אין צורך ב-NgModule):

```ts
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HebDatePickerComponent, type PickerValue } from 'heb-date-picker';

@Component({
  selector: 'app-my-form',
  standalone: true,
  imports: [HebDatePickerComponent, FormsModule], // ⬅ הוסיפו כאן
  template: `
    <heb-date-picker [(ngModel)]="date"></heb-date-picker>
    <p>נבחר: {{ date() }}</p>
  `,
})
export class MyFormComponent {
  date = signal<PickerValue>(null); // Date | null
}
```

### שלב 3 — זהו!

אין קובץ CSS נפרד לייבא — העיצוב ארוז בתוך הרכיב. ה-RTL מוגדר אוטומטית על
הרכיב עצמו, גם אם שאר האפליקציה שלכם ב-LTR.

### הטמעה בטופס קיים (Reactive Forms)

אם כבר יש לכם `FormGroup` בפרויקט, הרכיב מתחבר אליו ישירות — הוא מממש
`ControlValueAccessor`, בדיוק כמו `<input>` רגיל:

```ts
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { HebDatePickerComponent, type PickerValue } from 'heb-date-picker';

@Component({
  standalone: true,
  imports: [HebDatePickerComponent, ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <heb-date-picker formControlName="birthDate"></heb-date-picker>
    </form>
  `,
})
export class MyExistingForm {
  form = new FormGroup({
    birthDate: new FormControl<PickerValue>(null),
    // ... שאר השדות הקיימים שלכם
  });
}
```

---

## מה מקבלים מהלוח — הפלט (Output)

**הפלט הוא אובייקט `Date` רגיל של JavaScript** (תאריך גרגוריאני, מנורמל לחצות
מקומית) — **לא** מחרוזת ולא טיפוס עברי מיוחד. כך קל לשמור אותו, לשלוח לשרת, או
להשוות. הגימטריה היא רק *תצוגה*; הערך שמאחוריו הוא תאריך רגיל.

| `mode` | סוג הפלט |
|---|---|
| `'single'` | `Date \| null` |
| `'range'` | `HebRange` = `{ start: Date \| null; end: Date \| null }` |

### ארבע דרכים לקבל את הערך

```html
<!-- 1. ngModel (template-driven) -->
<heb-date-picker [(ngModel)]="date"></heb-date-picker>

<!-- 2. two-way [(value)] -->
<heb-date-picker [(value)]="date"></heb-date-picker>

<!-- 3. Reactive Forms -->
<heb-date-picker [formControl]="ctrl"></heb-date-picker>

<!-- 4. אירוע בלבד -->
<heb-date-picker (valueChange)="onPick($event)"></heb-date-picker>
```

### דוגמה: קריאת הערך ושמירה לשרת + תצוגה למשתמש

```ts
import { formatGematriya, type PickerValue } from 'heb-date-picker';

onPick(value: PickerValue) {
  if (value instanceof Date) {
    const iso = value.toISOString();       // "2026-09-02T21:00:00.000Z" → לשרת/DB
    const label = formatGematriya(value);   // "כ״א אלול תשפ״ו" → לתצוגה למשתמש
    this.save({ date: iso, label });
  }
}
```

### מעקב אחרי החודש המוצג

ה-Output `monthChange` נפלט כשהמשתמש מנווט בין חודשים, ומחזיר
`HebMonthRef` = `{ year: number; month: number }` — **שנה וחודש עבריים** (מספור
`@hebcal/core`: ניסן=1 … אלול=6 … תשרי=7 … אדר ב׳=13).

```html
<heb-date-picker (monthChange)="m = $event"></heb-date-picker>
<!-- m = { year: 5786, month: 6 }  ⟵ אלול תשפ״ו -->
```

---

### מצב popup

ברירת המחדל (`inline` לא מוגדר) היא שדה עם אייקון לוח; לחיצה פותחת את הלוח.
הפאנל מרונדר דרך **CDK Overlay** ומוצמד ל-`document.body`, כך שהוא **צף מעל הכל
ולא נחתך** גם אם הרכיב יושב בתוך container עם `overflow: hidden` או `transform`.
אין צורך לייבא CSS נוסף — סגנונות ה-Overlay ארוזים בתוך הרכיב.

```html
<heb-date-picker [(ngModel)]="date" placeholder="בחרו תאריך…"></heb-date-picker>
```

## מצב טווח (range)

```html
<heb-date-picker [(ngModel)]="range" mode="range"></heb-date-picker>
```

הערך במצב טווח הוא `HebRange` — `{ start: Date | null; end: Date | null }`:

```ts
import type { HebRange } from 'heb-date-picker';
range: HebRange = { start: null, end: null };
```

קליק ראשון קובע התחלה, קליק שני קובע סוף (הרכיב ממיין את הקצוות אוטומטית).
בשדה ה-popup הערך המוצג הוא `התחלה – סוף`, למשל `כ״א אלול תשפ״ו – כ״ה אלול תשפ״ו`.

## מגבלות: min / max / ימים חסומים

```ts
min = new Date(2026, 0, 1);
max = new Date(2026, 11, 31);
// חסימת שישי + שבת:
noWeekends = (d: Date) => d.getDay() === 5 || d.getDay() === 6;
```

```html
<heb-date-picker
  [(ngModel)]="date"
  [min]="min"
  [max]="max"
  [disabledDates]="noWeekends"
></heb-date-picker>
```

## חגים, ניקוד, ולוח ארץ-ישראל / תפוצות

```html
<!-- ניקוד בכותרות ובפורמט הטקסט -->
<heb-date-picker [(ngModel)]="date" [showNikud]="true"></heb-date-picker>

<!-- לוח חגים של התפוצות (יום-טוב שני של גלויות) -->
<heb-date-picker [(ngModel)]="date" [israel]="false"></heb-date-picker>
```

חגים ומועדים מסומנים בנקודה מתחת ליום ובכיתוב ב-tooltip; שבתות וראשי-חודשים
מסומנים בסגנון משלהם.

---

## API

### Inputs

| Input | סוג | ברירת מחדל | תיאור |
|---|---|---|---|
| `mode` | `'single' \| 'range'` | `'single'` | בחירת יום יחיד או טווח |
| `value` | `Date \| HebRange \| null` | `null` | הערך (ניתן ל-`[(value)]`, `ngModel`, `formControl`) |
| `min` | `Date \| null` | `null` | היום המוקדם ביותר לבחירה (כולל) |
| `max` | `Date \| null` | `null` | היום המאוחר ביותר לבחירה (כולל) |
| `disabledDates` | `(d: Date) => boolean` | — | החזרת `true` חוסמת את היום |
| `showNikud` | `boolean` | `false` | הצגת גימטריה עם ניקוד |
| `israel` | `boolean` | `true` | לוח חגים א״י (`true`) או תפוצות (`false`) |
| `firstDayOfWeek` | `number` | `0` | עמודה ראשונה: 0=ראשון … 6=שבת |
| `inline` | `boolean` | `false` | תצוגה מוטמעת במקום popup עם שדה |
| `placeholder` | `string` | `'בחר תאריך'` | טקסט placeholder לשדה ה-popup |

### Outputs

| Output | סוג | תיאור |
|---|---|---|
| `valueChange` | `PickerValue` | נפלט בכל שינוי ערך (מאפשר `[(value)]`) |
| `monthChange` | `HebMonthRef` (`{ year, month }`) | נפלט כשהחודש המוצג משתנה |

### פונקציות עזר מיוצאות

```ts
import { formatGematriya, months } from 'heb-date-picker';

formatGematriya(new Date(2026, 8, 3));                 // "כ״א אלול תשפ״ו"
formatGematriya(new Date(2026, 8, 3), { nikud: true }); // "כ״א אֱלוּל תשפ״ו"
```

---

## עיצוב ומיתוג (CSS Custom Properties)

כל צבע/מידה נשלט דרך משתני CSS עם קידומת `--hdp-`. משנים אותם בכל אב-קדמון —
בלי לדרוס selectors, ובלי לגעת בקוד הרכיב:

```css
.my-theme {
  --hdp-accent: #0ca678;      /* צבע בחירה */
  --hdp-accent-fg: #ffffff;
  --hdp-in-range-bg: #c3fae8; /* רקע ימים בטווח */
  --hdp-today-ring: #0ca678;
  --hdp-radius: 20px;
  --hdp-cell-size: 2.6rem;
  --hdp-shabbat-fg: #b4881d;
  --hdp-holiday-dot: #e8590c;
}
```

**מצב כהה:** הרכיב מגיב אוטומטית ל-`[data-theme="dark"]` על כל אב-קדמון.

**קלאסים סמנטיים** (לעיצוב מדויק): `hdp-cell--selected`, `--in-range`,
`--range-start/-end`, `--today`, `--shabbat`, `--holiday`, `--rosh-chodesh`,
`--disabled`, `--other-month`.

## נגישות וניווט מקלדת

| מקש | פעולה |
|---|---|
| חצים ← → | יום קודם / הבא (מכבד RTL) |
| חצים ↑ ↓ | שבוע אחורה / קדימה |
| Home / End | תחילת / סוף השבוע |
| PageUp / PageDown | חודש אחורה / קדימה |
| Enter / Space | בחירת היום שבמיקוד |
| Esc | סגירת ה-popup |

## תלויות (Dependencies)

| תלות | מאיפה | הערה |
|---|---|---|
| `heb-date-core` | נמשך אוטומטית | ליבת הלוח (חבילת האחות שלנו) |
| `@hebcal/core` | נמשך אוטומטית (טרנזיטיבית) | מנוע חישוב הלוח העברי |
| `@angular/cdk` | נמשך אוטומטית (peer) | ל-Overlay של ה-popup (צף מעל הכל, לא נחתך) |
| `@angular/core` · `@angular/common` · `@angular/forms` | **אתם** מספקים (peer) | כבר קיימות בכל פרויקט Angular |

בפועל: `npm i heb-date-picker` מספיק — אין תלויות שצריך להתקין ידנית. אין תלות
ב-jQuery, Moment, או כל ספרייה כבדה נוספת. (משקל משוער: הרכיב + הליבה +
`@hebcal/core` ≈ ‎~50KB gzip, רובו `@hebcal/core`.)

## תאימות

נבנה ונבדק מול **Angular 22** (רכיבי standalone + signals). לגרסאות Angular
מוקדמות יותר ייתכן שיידרש התאמה של ה-`peerDependencies`.

## הליבה האגנוסטית `heb-date-core`

כל הלוגיקה (בניית ה-grid, גימטריה, חגים, מגבלות, מודל בחירה) יושבת בחבילת
`heb-date-core` הנפרדת, שאינה מייבאת דבר מ-Angular. אפשר לצרוך אותה ישירות:

```ts
import { buildMonthView, SingleSelectionModel, months } from 'heb-date-core';

const view = buildMonthView(5786, months.ELUL, {
  selection: new SingleSelectionModel(),
});
console.log(view.title);             // "אלול תשפ״ו"
console.log(view.weeks[0][0].label); // תגית גימטריה של התא הראשון
```

זו התשתית שתאפשר בעתיד עטיפת React מעל אותה ליבה בדיוק.

## רישיון

מופץ תחת **GPL-2.0**, בהתאם לרישיון של `@hebcal/core` שעליו נשענים חישובי הלוח.
שימו לב לכך בשילוב בפרויקטים קנייניים/סגורים.
