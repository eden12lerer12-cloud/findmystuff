import { normalize } from "./text.js";
const groups = [
  ["keys", "key", "מפתח", "מפתחות"],
  ["passport", "passports", "travel documents", "מסמכי נסיעה", "דרכון", "דרכונים"],
  ["headphones", "headphone", "earphones", "earbuds", "אוזניות"],
  ["wallet", "purse", "ארנק"],
  ["documents", "document", "papers", "מסמכים", "מסמך"],
  ["charger", "charging", "מטען"],
  ["bedroom", "חדר שינה", "חדרשינה"],
  ["livingroom", "living room", "סלון"],
  ["office", "משרד"],
  ["closet", "wardrobe", "ארון"],
  ["drawer", "drawers", "מגירה", "מגירות"],
  ["shelf", "shelves", "מדף", "מדפים"],
  ["box", "container", "קופסה", "קופסא"],
  ["black", "שחור", "שחורות", "שחורה"],
  ["car", "רכב", "מכונית"],
];
const stop = new Set([
  "where",
  "is",
  "are",
  "my",
  "the",
  "a",
  "an",
  "find",
  "show",
  "everything",
  "all",
  "in",
  "on",
  "at",
  "did",
  "i",
  "put",
  "please",
  "me",
  "stored",
  "items",
  "of",
  "איפה",
  "היכן",
  "נמצא",
  "נמצאים",
  "נמצאות",
  "שלי",
  "שמתי",
  "מצא",
  "תמצא",
  "הראה",
  "הצג",
  "כל",
  "את",
  "חפצים",
  "דברים",
  "ב",
  "על",
  "בתוך",
  "של",
  "לי",
  "בבקשה",
]);
const aliases = new Map(groups.flatMap(group => group.map(term => [term,group[0]])));
const aliasPattern = new RegExp(`(^|\\s)(?:[בהל])?(${[...aliases.keys()].sort((a,b)=>b.length-a.length).join('|')})(?=\\s|$)`, 'gu');
function canonical(text) {
  const value = " " + normalize(text).replace(/[^\p{L}\p{N}\s]/gu, " ") + " ";
  return value.replace(aliasPattern,(_,prefix,term)=>prefix+aliases.get(term)).trim();
}
function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = temp;
    }
  }
  return row[b.length];
}
export function matchSearch(text, query) {
  const terms = canonical(query)
    .split(/\s+/)
    .filter(
      (word) =>
        word &&
        !stop.has(word) &&
        !(word.startsWith("ה") && stop.has(word.slice(1))),
    );
  const field = canonical(text),
    words = field.split(/\s+/);
  let approximate = false;
  for (const term of terms) {
    if (field.includes(term)) continue;
    if (
      term.length >= 4 &&
      words.some(
        (word) =>
          word.length >= 4 &&
          Math.abs(word.length - term.length) <= 1 &&
          distance(term, word) <= 1,
      )
    ) {
      approximate = true;
      continue;
    }
    return { matches: false, approximate: false };
  }
  return { matches: true, approximate };
}
