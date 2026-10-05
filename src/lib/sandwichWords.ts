/**
 * Sandwich-mode gag: while the sandwich is on, the book's copy talks
 * sandwiches. "website" matches before "site" so it never becomes
 * "websandwich". Word-boundary, case-insensitive; a capitalized source
 * word yields a capitalized sandwich ("Website" → "Sandwich").
 *
 * Applied only to rendered text at sandwich-mode render points — never
 * to URLs, emails, form values, or code.
 */
const RULES: Array<[RegExp, string]> = [
  [/\bwebsites\b/gi, 'sandwiches'],
  [/\bwebsite\b/gi, 'sandwich'],
  [/\bbusinesses\b/gi, 'sandwiches'],
  [/\bbusiness\b/gi, 'sandwich'],
  [/\bsites\b/gi, 'sandwiches'],
  [/\bsite\b/gi, 'sandwich'],
];

export function sandwichize(text: string): string {
  let out = text;
  for (const [re, word] of RULES) {
    out = out.replace(re, (m) =>
      m[0] === m[0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word,
    );
  }
  return out;
}
