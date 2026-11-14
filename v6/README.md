# v6 preview

The v6 glossy styling upgrade, published so it can be looked at on a real
URL alongside the version it is built on:

    https://bakinginsightsai.github.io/alfredo-site-staging/v6/

`/v5/` is untouched and still serves the editorial design, so the two can be
opened side by side. The root of this repository is unaffected.

## How it was built

1. `v6/` is a copy of `v5/`: the same five pages, `alfredo.css`,
   `alfredo.js`, `assets/` and `fonts/`. No image was regenerated or
   replaced, and the AI imagery disclosure is on every page.
2. `gloss-v6.css` is the supplied override, byte for byte as delivered,
   loaded after `alfredo.css` on all five pages.
3. The Action Center component is the supplied markup, inserted inside the
   home page's `#meet` wrap after the walkthrough disclosure.

It is a copy, not a build target. `build.py` renders the site to the
repository root and knows nothing about this folder, so the drift check is
unaffected and nothing in here feeds back into the site.

## Changes made to the supplied kit

Everything above the `15. REPAIRS` banner in `gloss-v6.css` is the kit as
delivered. The repairs below it are corrections found by measuring the
override against the real DOM, and each one says what it measured:

- the eyebrow colour in the three sections the kit turns dark, which stayed
  on the cream ground colour and measured 2.27 to 2.58 against a 4.5 floor
- the hero's right edge vignette, which the kit switches off and which was
  what made the chapter marker readable over the bright side of the picture
- the Action Center's width, so its cards share an edge with the panel above
- the wrap of the closing line in the story section
- the weekday drawing's material, which was the last flat fill in the panel
- the gallery's bottom fade, which was not deep enough to carry 21px
  captions on a phone: 3.05 to 3.64 against a 4.5 floor
- the gallery crops, solved from the measured grid so the four pictures end
  on one line now the kit has tightened the gap from 28px to 18px
- the radius on the locations choices, which the kit left on v5's value

One sentence of the supplied component was reworded. The kit reads "Set a
baseline and review date."; this site's standing rules forbid describing the
mechanism, and name baselines in that list, so the card reads "Set a review
date before you start." Nothing else in the component was changed.

## What travels with the copy

The "Staging preview" banner and the `noindex, nofollow` meta tag are on all
five pages, the demo form keeps the `STAGING TEST demo request` subject and
its original endpoint, field names and validation, and every path inside
these pages is relative, so the preview stays inside `/v6/`.
