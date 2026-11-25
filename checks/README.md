# The checks that live with the site

Six checks. Four are here because each one exists to stop a bug that
reached a review, and cards.js because one of those reached the live
site. words.js is here because it holds the rules the site is written
to, and pixels.js because it spent weeks measuring a 404 page and
reporting that everything passed. A check kept somewhere temporary is
not a check.

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

## pixels.js

Contrast measured off the rendered pixels, for the runs no walk of the DOM
can read: text sitting on a photograph, and text whose colour comes from a
gradient clipped to the glyphs. The page is captured as painted, captured
again with every glyph made transparent, and the ground under each run is
read from the second capture.

It is here because of how it failed. Its address used to end in the folder
name, so the moment the runner began passing the folder as an argument as
well it fetched `.../alfredo-site-staging/alfredo-site-stagingindex.html`,
which is a 404 page. Playwright does not throw on a 404, so the sweep
measured the server's error page, found 78 runs of text on it, and reported
that every one cleared its floor.

    node checks/pixels.js alfredo-site-staging
    node checks/pixels.js alfredo-site-staging --open     # disclosures open
    node checks/pixels.js prod9 390 1440

The address is the server root now and the folder is a separate argument,
and the sweep stops with CANNOT READ if any page answers with anything but
200. On the real build it measures about two thousand runs, not seventy
eight.

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

## cards.js

The three plans on Pricing were redesigned as full width ruled rows, which
is right on a phone. The layer underneath still said the plan grid was three
columns with no gutter, and the new rules never said otherwise, so on a
laptop three full width rows were laid out in three columns touching each
other: "$99 a month" sat on top of "THE FULL PICTURE / House", "$199" on top
of "Group", and each disclosure's plus sign touched the next column. It went
live. Nothing caught it, because every run of text still cleared its
contrast floor, no page scrolled sideways and nothing was invisible.

Wherever the plan grid has more than one column, this asks three things:

    every card keeps at least 24px between its box and the next card's
    nothing inside a card reaches into another card's box at all
    the Request a demo buttons in one row share a top edge

with the feature lists closed and again with them open, because a card that
grows when a disclosure opens can push its button off the line.

    node checks/cards.js                   # 320 through 1680
    node checks/cards.js 1366 1440

Where the grid is a single column it says so and checks nothing, which is
the phone layout and is meant to be a stack of ruled rows.

## STUB_BEACON, a test switch

The analytics beacon is served from `static.cloudflareinsights.com`. Some
machines cannot reach that host, and a build carrying the beacon then fails
checks that watch for failed requests, reporting the machine rather than the
site. Sixty failures on the first production run were all this one host.

    STUB_BEACON=1 node checks/noshift.js

With the variable set, that one host is answered locally with an empty
script, so the page loads the way it will in the world. It is opt in: with
the variable unset nothing is intercepted at all, which is the default
everywhere, and the staging build carries no beacon in any case.

It is defined once, in `stub-beacon.js`, and matches on the parsed hostname
exactly rather than on a glob, so nothing else is ever intercepted. Nothing
is sent anywhere either way. The only other interception anywhere in the
battery is the form test's, which exists so that no demo request can leave
the machine.

## All six

    BASE=http://127.0.0.1:8806/alfredo-site-staging/   where the built site is served
                                                       (noshift.js wants the
                                                       production shaped build,
                                                       without the preview banner)
    CHROME=/path/to/chrome                             a browser, if not the usual one
    OUT=out/scroll                                     where visible.js writes screenshots
