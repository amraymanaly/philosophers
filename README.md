# 18 Axes — Philosophical Orientation Quiz

Find your philosophical orientation across **18 axes** borrowed from analytic philosophy.
144 questions · 119 philosophers · 22 archetypes · reading list · PNG export.

Static site, no build step, no backend. Open `index.html` via any static server:

```sh
# e.g. with Node:
npx serve .
```

Results are encoded in a shareable `?v=3&s=…` URL. Progress autosaves to `localStorage`.

## Files

- `index.html` — landing / quiz / results views
- `styles.css` — dark + light academia dual theme
- `data.js` — 18 axes, 144 questions, 22 archetypes, reading list
- `philosophers.js` — 119 philosopher vectors (18-dim) + schools
- `app.js` — quiz engine, scoring, Euclidean matching, radar, PNG export
- `PHILOSOPHY.md` — full documentation (axes, questions, profiles, method)

Philosopher vectors are approximate portraits — disputable, for fun.
