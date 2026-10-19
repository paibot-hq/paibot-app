// Places in a ranking by views, most first; ties share a place and the next place skips (1, 2, 2, 4).
export function places(views: readonly number[]): number[] {
  return views.map(v => 1 + views.filter(other => other > v).length);
}
