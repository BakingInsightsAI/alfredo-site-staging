# The checks that live with the site

Four checks. Three are here because each one exists to stop a bug that
reached a review. The fourth, words.js, is here because it holds the rules
the site is written to, and a check kept somewhere temporary is not a check.

The rest of the battery, contrast, focus, widths, the form and the rest, is
still a scratch harness run by checks.sh.

## visible.js

A block carrying `reveal` once sat at opacity 0 for as long as the page was
open. The stylesheet waited for a class that nothing added. Every check passed:
the contrast walk skips anything faint, and the pixel sweep had been taught to
ignore text whose pixels do not change, which is exactly what invisible text
looks like.

So this one asks the only question that matters to a reader. With motion ON,
it scrolls each page a screen at a time, the way a visitor does. At each stop
it waits two seconds, then takes every element that holds real text and is on
screen, and multiplies the opacity of that element and all of its ancestors.
Anything still at zero is a failure, named with its text.

Text meant to be invisible is excluded only when it is hidden by `display`,
`visibility`, `content-visibility` or the `hidden` attribute. Faded to nothing
is never an excuse.

    node checks/visible.js                 # 7 widths, 6 pages
    node checks/visible.js --shots 390     # and a screenshot of every screen
    PAGES=index.html node checks/visible.js 390

It exits non-zero when anything is invisible. To see it catch the original bug,
change the stylesheet's `.js .reveal.in` back to `.js .reveal:not(.is-revealed)`
and run it again.

## words.js

Every copy rule in CLAUDE.md section 3, measured in a browser on the built
pages: the banned words, the banned phrases, no contractions, no em or en
dashes, no arrows, and no capitals except the two shapes the design calls
for, a small tracked label and a short display stamp.

These rules used to live in the scratch harness beside the contrast sweep,
which meant the rules the site is written to could be wiped with a temporary
folder. Everything a reader sees is read as rendered, alt text included, so
a rule cannot be slipped past by putting the words in an attribute or by
setting them in capitals from the stylesheet.

    node checks/words.js                   # every page
    node checks/words.js index.html        # one of them

The banned phrases are checked as phrases, not words, because each word in
them is innocent on its own: "starting point", "baseline", "four weeks
before", "counts the". Each is reported with the sentence it sits in.

## noshift.js

Nothing should move while a page loads. On an ordinary connection nothing
does, which is why this went unnoticed: the fonts arrive before first paint
and a quick measurement sees zero. On a genuinely slow phone the real font
lands seconds later, and a line that fits in one font and wraps in the other
takes everything under it with it.

That is what the hero's audience line did. Between about 386 and 395 wide,
which contains 390, it was one line in Inter and two in the fallback, so when
Inter arrived the buttons and the product window jumped up 21px. The line is
now narrowed in that band so it is two lines in both.

    node checks/noshift.js                 # every page
    node checks/noshift.js index.html      # one of them

Each page loads at 390 at 400 kbps with a 4x slower processor, with the
observer installed before navigation, and every shift is printed with the
elements the browser blames and how far they moved.

What each page is allowed is written into the file, page by page, rather than
hidden under one round number. Everything is zero except two pages that
already shifted before this week: the heading on What it does drops 9px at
the font swap on roughly one load in four, and About us does the same. Both
are under 0.005, both are intermittent, and neither is explained yet. They
are printed on every run.

## fold.js

The phone first screen is 700px tall, and the pill, the headline and Request a
demo have to finish above it at 320, 360, 390 and 430. Any new line in the hero
pushes on that, so it gets measured again every time.

    node checks/fold.js

A missing element counts as a failure, so a renamed class cannot quietly turn
the check into a check of nothing.

## All four

    BASE=http://127.0.0.1:8806/alfredo-site-staging/   where the built site is served
                                                       (noshift.js wants the
                                                       production shaped build,
                                                       without the preview banner)
    CHROME=/path/to/chrome                             a browser, if not the usual one
    OUT=out/scroll                                     where visible.js writes screenshots
