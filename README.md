# Course Materials

Static GitHub Pages host for PHY 320: Modern Physics course material migrated
from Trinket.

## Contents

The exported Trinket HTML pages live in their original numbered module folders.
`index.html` reads Trinket's `course.json` and creates a static course outline
for GitHub Pages.

Run the preparation script after replacing or re-extracting the Trinket export:

```sh
node scripts/prepare-course.mjs
node scripts/rebuild-special-relativity-reading.mjs
node scripts/render-clean-course.mjs
node scripts/localize-trinket-assets.mjs
```

## Preview locally

Any static file server will work:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish with GitHub Pages

1. Push this repository to GitHub.
2. In GitHub, open **Settings > Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder.

GitHub will publish the site at:

```text
https://YOUR-USER.github.io/YOUR-REPO/
```

The final render removes the Trinket page shell and styling. Lesson pages use
local `course-page.css` navigation and content styling. External links and
images inside the course content remain as authored, except files exported from
Trinket are copied into `assets/course-assets/` and rewritten to local paths.
