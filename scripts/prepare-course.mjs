import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const manifestPath = "course.json";
const course = JSON.parse(await readFile(manifestPath, "utf8"));

function moduleFolder(module, moduleIndex) {
  return `${String(moduleIndex).padStart(2, "0")}-${module.slug}`;
}

function materialFile(material, materialIndex) {
  return `${String(materialIndex).padStart(2, "0")}-${material.slug}.html`;
}

function isLocalHref(href) {
  return !/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(href);
}

const materialBySlug = new Map();
const materialByNumberedPath = new Map();
const htmlFiles = [];

for (const [moduleIndex, module] of course.lessons.entries()) {
  const folder = moduleFolder(module, moduleIndex);
  for (const [materialIndex, material] of module.materials.entries()) {
    const file = path.join(folder, materialFile(material, materialIndex));
    const normalizedFile = file.replaceAll(path.sep, "/");
    htmlFiles.push(normalizedFile);
    materialBySlug.set(`${module.slug}/${material.slug}`, normalizedFile);
    materialByNumberedPath.set(normalizedFile.replace(/\.html$/, ""), normalizedFile);
    materialByNumberedPath.set(normalizedFile, normalizedFile);
  }
}

function resolveHref(href, currentFile) {
  const [cleanHref, suffix = ""] = href.split(/(?=[?#])/);
  const normalized = cleanHref.replace(/^\.\//, "").replace(/\/$/, "");
  const target = materialBySlug.get(normalized) || materialByNumberedPath.get(normalized);

  if (!target) {
    return href;
  }

  const relative = path
    .relative(path.dirname(currentFile), target)
    .replaceAll(path.sep, "/");

  return `${relative || path.basename(target)}${suffix}`;
}

function pageTitleFromFile(file) {
  const basename = path.basename(file, ".html").replace(/^\d+-/, "");
  return basename
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");

  html = html.replace(
    /href=(["'])([^"']+)\1/g,
    (match, quote, href) => {
      if (!isLocalHref(href)) {
        if (href === "https://trinket.io/") {
          const home = path.relative(path.dirname(file), "index.html").replaceAll(path.sep, "/");
          return `href=${quote}${home}${quote}`;
        }
        return match;
      }
      return `href=${quote}${resolveHref(href, file)}${quote}`;
    }
  );

  if (!/<title>/i.test(html)) {
    html = html.replace(
      /<head>/i,
      `<head>\n    <title>${pageTitleFromFile(file)} | ${course.name}</title>`
    );
  }

  await writeFile(file, html);
}

const dirs = await readdir(".", { withFileTypes: true });
const emptyModuleDirs = dirs
  .filter((entry) => entry.isDirectory() && /^\d+-/.test(entry.name))
  .map((entry) => entry.name)
  .filter((name) => !htmlFiles.some((file) => file.startsWith(`${name}/`)));

console.log(`Prepared ${htmlFiles.length} exported HTML page(s).`);
if (emptyModuleDirs.length > 0) {
  console.log(`Empty exported module folder(s): ${emptyModuleDirs.join(", ")}`);
}
