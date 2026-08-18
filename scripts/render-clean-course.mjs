import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const course = JSON.parse(await readFile("course.json", "utf8"));

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function moduleFolder(module, moduleIndex) {
  return `${String(moduleIndex).padStart(2, "0")}-${module.slug}`;
}

function materialFile(material, materialIndex) {
  return `${String(materialIndex).padStart(2, "0")}-${material.slug}.html`;
}

function materialPath(module, moduleIndex, material, materialIndex) {
  if (module.placeholder || material.placeholder) {
    return null;
  }
  return material.file || `${moduleFolder(module, moduleIndex)}/${materialFile(material, materialIndex)}`;
}

function relativeHref(fromFile, toFile) {
  const href = path.relative(path.dirname(fromFile), toFile).replaceAll(path.sep, "/");
  return href || path.basename(toFile);
}

function flattenMaterials() {
  const pages = [];
  for (const [moduleIndex, module] of course.lessons.entries()) {
    const folder = moduleFolder(module, moduleIndex);
    for (const [materialIndex, material] of module.materials.entries()) {
      const file = materialPath(module, moduleIndex, material, materialIndex);
      if (!file) {
        continue;
      }
      pages.push({
        module,
        moduleIndex,
        material,
        materialIndex,
        file
      });
    }
  }
  return pages;
}

function extractContent(html, file) {
  const startMarker = '<div class="content">';
  const start = html.indexOf(startMarker);

  if (start !== -1) {
    const afterStart = start + startMarker.length;
    const tail = html.slice(afterStart);
    const endMarker = "\n        </div>\n      </div>\n    </div>\n  </div>";
    const end = tail.indexOf(endMarker);
    if (end === -1) {
      throw new Error(`Could not find content end in ${file}`);
    }

    return tail.slice(0, end).trim();
  }

  const articleMarker = '<article id="lesson-content" class="lesson-content">';
  const articleStart = html.indexOf(articleMarker);
  if (articleStart === -1) {
    throw new Error(`Could not find content start in ${file}`);
  }

  const afterArticle = articleStart + articleMarker.length;
  const articleTail = html.slice(afterArticle);
  const articleEnd = articleTail.indexOf("\n        </article>");
  if (articleEnd === -1) {
    throw new Error(`Could not find content end in ${file}`);
  }

  return articleTail.slice(0, articleEnd).trim().replace(/\s*<\/div>\s*$/, "");
}

function renderOutline(currentPage) {
  return course.lessons
    .map((module, moduleIndex) => {
      const materials = module.materials || [];
      const links = materials.length
        ? `<ul>
${materials
  .map((material, materialIndex) => {
    const file = materialPath(module, moduleIndex, material, materialIndex);
    if (!file) {
      return `              <li><span class="placeholder">${escapeHtml(material.name)}</span></li>`;
    }
    const current = file === currentPage.file ? ' aria-current="page"' : "";
    return `              <li><a href="${relativeHref(currentPage.file, file)}"${current}>${escapeHtml(material.name)}</a></li>`;
  })
  .join("\n")}
            </ul>`
        : '<p class="module-empty">No exported materials.</p>';

      return `          <section>
            <h2>${escapeHtml(module.name)}</h2>
            ${links}
          </section>`;
    })
    .join("\n");
}

function renderPage(page, pages, content) {
  const previous = pages[pages.indexOf(page) - 1];
  const next = pages[pages.indexOf(page) + 1];
  const stylesheet = relativeHref(page.file, "course-page.css");
  const home = relativeHref(page.file, "index.html");

  const previousLink = previous
    ? `<a href="${relativeHref(page.file, previous.file)}" rel="prev">Previous</a>`
    : "<span>Previous</span>";
  const nextLink = next
    ? `<a href="${relativeHref(page.file, next.file)}" rel="next">Next</a>`
    : "<span>Next</span>";
  const homeworkPolicy = page.material.slug === "homework-problems"
    ? `
        <aside class="homework-policy" aria-labelledby="homework-policy-heading">
          <h3 id="homework-policy-heading">Homework collaboration and AI</h3>
          <p>Problems marked with an <code>*</code> are <strong>solo problems</strong>. Complete solo problems independently, without help from classmates or generative AI, so they can serve as a self-assessment. You may attend office hours for help.</p>
          <p>All other problems may be worked through with classmates from this course and with AI tools. If you use AI, you are responsible for checking its work and must be able to explain the reasoning and results.</p>
        </aside>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(page.material.name)} | ${escapeHtml(course.name)}</title>
    <link rel="stylesheet" href="${stylesheet}">
    <script>
      window.MathJax = {
        tex: {
          inlineMath: [["\\\\(", "\\\\)"], ["$(", ")$"]]
        }
      };
    </script>
    <script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  </head>
  <body>
    <a class="skip-link" href="#lesson-content">Skip to content</a>
    <div class="course-shell">
      <aside class="course-sidebar">
        <a class="course-home" href="${home}">Course Home</a>
        <h1>${escapeHtml(course.name)}</h1>
        <nav class="course-outline" aria-label="Course outline">
${renderOutline(page)}
        </nav>
      </aside>
      <main class="course-main">
        <header class="lesson-header">
          <p class="lesson-kicker">${escapeHtml(page.module.name)}</p>
          <h2>${escapeHtml(page.material.name)}</h2>
          <nav class="lesson-nav" aria-label="Lesson navigation">
            ${previousLink}
            ${nextLink}
          </nav>
        </header>${homeworkPolicy}
        <article id="lesson-content" class="lesson-content">
${content}
        </article>
        <footer class="page-footer">
          <p>${escapeHtml(course.name)} course archive.</p>
        </footer>
      </main>
    </div>
  </body>
</html>
`;
}

const pages = flattenMaterials();
const contents = new Map();

for (const page of pages) {
  const html = await readFile(page.file, "utf8");
  const content = extractContent(html, page.file).replace(
    /<h4 id="problems-with-an-indicate-solo-problems[^"]*">[\s\S]*?<\/h4>\s*/,
    ""
  );
  contents.set(page.file, content);
}

for (const page of pages) {
  await writeFile(page.file, renderPage(page, pages, contents.get(page.file)));
}

console.log(`Rendered ${pages.length} clean course page(s).`);
