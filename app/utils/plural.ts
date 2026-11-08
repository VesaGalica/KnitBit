/**
 * "1 character", "2 characters": a count with the right form of the word.
 * `plural` defaults to the word + "s", which covers every word in the app
 * except the ones passed explicitly ("stitch" → "stitches").
 */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}
