import { Fragment } from 'react';
import { MathTex } from './math-tex';

// Running text in which $...$ marks inline TeX ("$f$ is injective"): the rest is plain
// text, each marked part is drawn as math. A lone $ (an unmatched one) stays as written.
export default function MathText({ text }: { text: string }) {
  const parts = text.split(/\$([^$]+)\$/);
  return <>{parts.map((part, index) => index % 2 === 1 ? <MathTex key={index} tex={part} /> : <Fragment key={index}>{part}</Fragment>)}</>;
}
