# Two checks that live with the site

Everything else that tests this site is a scratch harness. These two are here
because each one exists to stop a bug that reached a review, and a check kept
somewhere temporary is not a check.

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

## fold.js

The phone first screen is 700px tall, and the pill, the headline and Request a
demo have to finish above it at 320, 360, 390 and 430. Any new line in the hero
pushes on that, so it gets measured again every time.

    node checks/fold.js

A missing element counts as a failure, so a renamed class cannot quietly turn
the check into a check of nothing.

## Both

    BASE=http://127.0.0.1:8806/alfredo-site-staging/   where the built site is served
    CHROME=/path/to/chrome                             a browser, if not the usual one
    OUT=out/scroll                                     where visible.js writes screenshots
