Geist, self hosted.

geist-latin.woff2      the latin subset
geist-latin-ext.woff2  the latin extended subset
OFL.txt                the licence these files are published under

Both files are the variable font: one file carries every weight from 100 to
900, which is why there is no file per weight. Google Fonts serves the same
two files, byte for byte, and they came from there, so the metrics are the
ones the site was designed against and nothing reflows.

Geist is published by the Geist Project Authors under the SIL Open Font
License 1.1. The licence text is beside these files and must travel with
them.

Every character on the site today falls inside the latin subset; the extended
subset is here for copy that has not been written yet, and a browser fetches
it only if a character asks for it.

Playfair Display and DM Sans
----------------------------
Added for the v4 design. Both are licensed under the SIL Open Font License
1.1, the same licence as Geist above, and both are served from this folder
rather than from a font CDN: a third party stylesheet would have to be
fetched before the first font request could even be made, and it would
tell someone else who is reading this site.

Each family ships as one variable file per subset, so one file covers
every weight the site uses:
  playfair-latin.woff2, playfair-latin-ext.woff2
  playfair-italic-latin.woff2, playfair-italic-latin-ext.woff2
  dmsans-latin.woff2, dmsans-latin-ext.woff2

The files are the ones Google Fonts serves for those families, taken once
and committed. OFL.txt in this folder is the licence text.
