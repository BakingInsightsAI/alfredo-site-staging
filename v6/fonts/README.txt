Alfredo site fonts
==================
Instrument Serif and DM Sans, both licensed under the SIL Open Font
License 1.1 (OFL.txt in this folder), both served from here rather than
from a font CDN: a third party stylesheet would have to be fetched before
the first font request could even be made, and it would tell someone else
who is reading this site.

v5 uses Instrument Serif for the voice and DM Sans for the information:

  instrumentserif-latin.woff2, instrumentserif-latin-ext.woff2
  instrumentserif-italic-latin.woff2, instrumentserif-italic-latin-ext.woff2
  dmsans-latin.woff2, dmsans-latin-ext.woff2

Instrument Serif has one weight and one italic, which is the whole family;
DM Sans ships as one variable file per subset, so a single file covers
every weight the site uses. The two files a reader meets first are
preloaded in the head of every page.

Instrument Serif runs narrow, about 0.336em a character against roughly
0.50em for Georgia on the same string, so the fallback face in alfredo.css
carries a size-adjust of 76% as well as ascent and descent overrides. The
measured layout shift on all five pages is zero.

Playfair Display was the v4 display family. Its four files are still here
because nothing else in the repository needs re-rendering to drop them,
and they are not referenced by alfredo.css:

  playfair-latin.woff2, playfair-latin-ext.woff2
  playfair-italic-latin.woff2, playfair-italic-latin-ext.woff2

Geist was the design before that and went with it.
