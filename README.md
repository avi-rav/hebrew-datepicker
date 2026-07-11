# heb-date-picker · monorepo

לוח שנה / Date Picker **עברי** עם תאריכי גימטריה (`כ״א אלול תשפ״ו`) ל-Angular.

זהו ה-workspace לפיתוח. אם הגעתם לכאן כדי **להשתמש** בחבילה בפרויקט Angular שלכם,
ראו [`projects/heb-date-picker/README.md`](projects/heb-date-picker/README.md)
(`npm i heb-date-picker`).

## מבנה

| פרויקט | תיאור |
|---|---|
| [`projects/heb-date-core`](projects/heb-date-core) | ליבת לוח עברי **אגנוסטית לפריימוורק** (TS טהור מעל `@hebcal/core`). ללא Angular. |
| [`projects/heb-date-picker`](projects/heb-date-picker) | ספריית ה-Angular (רכיב `<heb-date-picker>`), נשענת על הליבה. חבילת ה-npm המפורסמת. |
| [`projects/demo`](projects/demo) | אפליקציית הדגמה עם עמוד showcase חי לכל האפשרויות. |

הפרדת הליבה מה-UI (עיקרון Dependency-Inversion) היא מה שיאפשר בעתיד עטיפת React
מעל אותה ליבה בדיוק, ומה ש-`@hebcal/core` מבודד מאחוריו (בקובץ אחד:
`heb-date-core/src/lib/hdate-utils.ts`).

## פיתוח

```bash
npm install

# הדגמה חיה (showcase) על http://localhost:4200
npm start                 # === ng serve demo

# בנייה
ng build heb-date-core
ng build heb-date-picker

# בדיקות (Vitest)
ng test heb-date-core --watch=false
ng test heb-date-picker --watch=false
```

## אריזה ופרסום

```bash
ng build heb-date-core && ng build heb-date-picker
# בדיקת אריזה מקומית לפני פרסום:
cd dist/heb-date-core   && npm pack
cd ../heb-date-picker   && npm pack
# פרסום (שתי החבילות):
cd dist/heb-date-core   && npm publish
cd ../heb-date-picker   && npm publish
```

צרכן מריץ `npm i heb-date-picker` בלבד — npm מושך את `heb-date-core` ואת
`@hebcal/core` אוטומטית (כמו ש-Angular Material מושך את `@angular/cdk`).

## רישיון

GPL-2.0 (בעקבות `@hebcal/core`).
