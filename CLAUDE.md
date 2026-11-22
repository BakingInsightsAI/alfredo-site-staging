# Working rules for the Alfredo site

These are standing rules. They apply to every change on this repository
unless Sid says otherwise in the request itself.

## 1. Phone and laptop are equal priorities, and the phone is checked first

A large share of visitors arrive from Instagram and Facebook on phones.

- Verify every change at **360, 390 and 430** wide, and at **1366 and 1440**.
  Also run **320 and 768**: each has caught a real fault here.
- **The phone first screen is 700px tall**, not 844. That is what the
  Instagram and Facebook in app browsers leave once their own chrome is
  counted. Anything that has to be seen without scrolling is measured
  against 700.
- Measure the real rendered page in a browser. Reading the stylesheet is
  not measuring.
- The staging banner adds about 37px that production does not have.
  Subtract it before reporting a fold position, and say which figure is
  which.

## 2. Never touch production without the words SHIP TO PRODUCTION

- `BakingInsightsAI/alfredo-site` is the live site. `alfredo-site-staging`
  is where work happens.
- Production changes only when Sid writes **SHIP TO PRODUCTION**, and that
  authorizes one promotion, not a standing permission.
- Promote by copying the data files and templates and rebuilding in the
  production repository. Do not copy the stylesheet wholesale unless that
  is the change: staging has carried design work production should not get.
- Keep production's own switches: `staging: false`, the production form
  subject, and the `CNAME`.

## 3. Copy rules

- No contractions. No em or en dashes. No arrows. Sentence case in the
  data; capitals are a styling decision, set by CSS.
- Plain words an owner uses.
- **Banned words**, in every visible string including alt text: intelligence,
  segments, dayparts, margin bleed, repricing queue, till, A/B, upload,
  photograph, confidence score, loop, venue, operators, dwell, avg,
  tracked revenue.
- **No mechanism talk.** Never models, matching, ranking, training,
  baselines, control items, holdouts, "compared against", or engines. For a
  result net of normal trading the approved line is exactly: "After what
  you would have made anyway." Where the figure is a count rather than
  money, a share of orders for instance, it is "After what you would have
  sold anyway." Those two, and no third wording.
  Exception: data-use promises such as "never used to train AI models" are
  allowed; they state what is not done with customer data, not how Alfredo
  works.
- **Banned phrases**, which are how mechanism talk comes back in words that
  are innocent one at a time: "starting point", "baseline", "four weeks
  before", "counts the". Do not state a fixed number of weeks, what is
  treated as the point to measure from, or how Alfredo counts or compares.
  A reader is told what they see and what they decide. qa.js fails on all
  four.
- **One date format.** Dates are written the way the track record writes
  them, "Dec 1" and "Nov 24", everywhere on the site, prose included. Never
  "1 December" beside a "Dec 1".
- **The POS, everywhere, is "the POS system you already use."** Never name a
  POS system in anything a reader can see: not in copy, not in structured
  data, not in llms.txt. The one exception is the demo form's own menu of
  choices, which has to name them so a person can pick one. Never promise
  that Alfredo works with every POS either. What the site says is that
  Alfredo connects to the system you already use and that we will confirm
  your setup on the demo call, which is true whichever one it is.
- **Never claim an inventory system is connected** until Sid says it is.
  Inventory is "coming soon" on What it does and nothing more. Alfredo can
  be said to bring in information from other tools you rely on, such as
  recipe and ingredient costs, because that is what sharing those costs
  already means.
- Verdicts are: worked, no effect, backfired.
- State Alfredo's own figures exactly, never "about". Use "about" only for
  competitor prices and the two week setup timeline.
- Never invent customers, testimonials, client names, case studies,
  revenue, counts or sources.

## 4. Price examples only ever go down

Every price example on the site is a decrease. Never show or imply an
increase, in copy, in a sample, or in a chart.

## 5. The owner chooses the review window

Never present four weeks, or any fixed period, as the rule. The owner picks
the date; Alfredo suggests one and it can be made shorter or longer.
Examples use varied windows, so no single period reads as standard.

## 6. Illustrative labels and the image disclosure

- Every invented example carries a visible "Illustrative example" label
  beside it. No example is unlabelled.
- Every page carries the image disclosure: "Images are AI generated for
  illustration. No person or business shown is real."

## 7. Founder privacy, absolute

No founder names, employer history, credentials, biographies, photos or
affiliations. No wording that points at one identifiable person, including
a pronoun that narrows to one. This applies to meta descriptions and link
labels too, not only body copy.

## 8. Story order

Home, What it does, Why trust it, About us, Pricing. Each page hands off to
the next. The founding offer panel on home links to pricing; that is the
one place home points past the next chapter.

## 9. One source for a number that changes

The count of open founding places lives **only** in
`src/data/site.yaml` as `founding_spots_open`. The home panel and the
pricing offer both read it. Never write the number into a template or a
second data file: one edit has to update every page.

## 10. The weekly board

The five suggestions live on the home page and nowhere else. What it does
explains the six parts of a suggestion without naming one. Check it: no
suggestion title may appear on two pages.

## 11. URLs that must keep working

`index.html`, `product.html` with `#board`, `#menu`, `#intel` and `#chat`,
`honesty.html`, `pilot.html` with `#pilot`, `pricing.html`, and the
`board.html`, `menu.html` and `intel.html` redirect stubs. The log in link
to `https://app.bakinginsightsai.com` stays in the nav.

## 12. The demo form is not to be touched

Same Web3Forms key, same field names, same submitted values, the staging
and production subjects as they are, the four location pills, and the
business placeholder "Your restaurant, brewery, cafe, or bakery".
**Never send a real submission.** Test against a stubbed network.

## 13. How to build and what to check

```
/usr/local/bin/python3.13 build.py          # render src/templates to the root
/usr/local/bin/python3.13 build.py --check  # fails if output and templates drift
```

`python3` is 3.11 here and the dependencies are installed for 3.13, so use
the full path. Every `.yaml` in `src/data` becomes a top level template
variable. Jinja runs with `StrictUndefined`: a key you reference has to
exist.

Before saying a change is done:

- no horizontal overflow and no tap target under 44px at every width above;
- no running text below 14px on a phone, and no tracked label below 12px;
- contrast measured on every run of text, and measured off the rendered
  pixels wherever text sits on a photograph or a gradient;
- every internal link and anchor resolves;
- the form posts the right fields to a stub, and nothing is sent;
- the copy rules above, checked against the built pages, not the source;
- look at a screenshot. A screenshot you did not look at is not QA, and a
  push is not a deployment.

## 14. Reporting

Never claim a result that was not measured. If a target is missed, say by
how much and why. If something cannot be checked from here, say so rather
than implying it passed. `bakinginsightsai.com` and the GitHub Pages hosts
are blocked by this environment's network policy; verify a deployment by
fetching the files back from `raw.githubusercontent.com` at the deployed
commit and comparing bytes, and say that is what was done.
