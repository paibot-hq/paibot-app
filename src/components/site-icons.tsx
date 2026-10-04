import type { SVGProps } from 'react';

// Simple line icons for the cards on the covers of the sites (24 x 24, stroked by the card's CSS).
type Icon = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
const svg = (children: React.ReactNode): Icon => props => <svg viewBox="0 0 24 24" {...props}>{children}</svg>;

// A grid of four tiles: the app.
export const AppSiteIcon = svg(<><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></>);
// An open book: learning.
export const LearnSiteIcon = svg(<><path d="M3 5.5c3-1 6-.8 9 1v13c-3-1.8-6-2-9-1z" /><path d="M21 5.5c-3-1-6-.8-9 1v13c3-1.8 6-2 9-1z" /></>);
// A wrench: tools.
export const ToolsSiteIcon = svg(<path d="M14.5 6.5a4 4 0 0 0 4.8 4.8l-9.4 9.4a2.1 2.1 0 0 1-3-3l9.4-9.4A4 4 0 0 0 14.5 6.5z" />);
// A page with lines: documents.
export const DocSiteIcon = svg(<><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>);
// A plus and a minus over an equals sign: math.
export const MathIcon = svg(<><path d="M7 4v6M4 7h6" /><path d="M14 7h6" /><path d="M4 17h6M14 15h6M14 19h6" /></>);
// The letters Aa: English.
export const EnglishIcon = svg(<><path d="M3.5 18l4-11 4 11M5 14h5" /><circle cx="17" cy="15" r="3" /><path d="M20 12v6" /></>);
// A terminal prompt: IT.
export const ItIcon = svg(<><rect x="3" y="4.5" width="18" height="15" rx="2" /><path d="M7 10l3 2.5L7 15M12.5 15.5H17" /></>);
