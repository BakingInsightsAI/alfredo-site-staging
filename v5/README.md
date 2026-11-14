# v5 preview

A frozen snapshot of the `design/alfredo-editorial-v5` branch, published
here so the redesign can be looked at on a real URL while the branch is
still under review:

    https://bakinginsightsai.github.io/alfredo-site-staging/v5/

It is a copy, not a build target. `build.py` renders the site to the
repository root and knows nothing about this folder, so editing anything
in here changes only this preview and nothing in here feeds back into the
site. To refresh it, copy the branch output over again; to retire it,
delete the folder.

The staging pieces travel with the copy: the "Staging preview" banner and
the `noindex, nofollow` meta tag are on every page, the form still carries
the `STAGING TEST demo request` subject, and every path inside these
pages is relative, so the preview stays inside `/v5/`.

The live staging site at the root of this repository is unaffected.
