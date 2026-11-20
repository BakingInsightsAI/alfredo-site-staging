Alfredo site fonts
==================
Newsreader and Inter, both licensed under the SIL Open Font License 1.1.
OFL.txt carries the licence text.

Both are the variable files Google serves, cut down to what this site
asks for and nothing else:

  newsreader-*.woff2   pinned to one weight (500) and one optical size
                       (36), which is the only way the serif is set here.
                       132 KB to 24 KB for the latin subset.
  inter-*.woff2        limited to weights 400 to 700, which is the range
                       the interface uses. 48 KB to 36 KB for latin.

The character set is untouched: the latin and latin-ext ranges are whole,
so a copy change can never land on a missing glyph. Only the axes were
narrowed, with fontTools.varLib.instancer.

Each family has a metric matched fallback declared in ember.css, measured
against the strings that actually sit in the masthead and the hero, so a
line cannot change width when the real file arrives.

The pair this replaced, Instrument Serif and DM Sans, is gone from this
folder. The frozen v5 and v6 preview folders carry their own copies and
are unaffected.
