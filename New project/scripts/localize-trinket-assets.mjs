import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { get } from "node:https";

const assetDir = "assets/course-assets";

function sanitize(value) {
  return decodeURIComponent(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-|-$/g, "");
}

function localName(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const id = parts.at(-2) || "asset";
  const filename = parts.at(-1) || "download";
  return `${sanitize(id)}-${sanitize(filename)}`;
}

function download(url, target) {
  return new Promise((resolve, reject) => {
    const request = get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        download(new URL(response.headers.location, url).href, target).then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        response.resume();
        return;
      }

      const file = createWriteStream(target);
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
      file.on("error", reject);
    });

    request.on("error", reject);
  });
}

function trinketFileUrlFromViewer(src) {
  const match = src.match(/api\/files\/([^/]+)\/([^"#?]+)/);
  if (!match) {
    return null;
  }
  return `https://trinket.io/api/files/${match[1]}/${match[2]}`;
}

function relativeAssetPath(htmlFile, assetPath) {
  return path.relative(path.dirname(htmlFile), assetPath).replaceAll(path.sep, "/");
}

const htmlFiles = [];
async function collectHtmlFiles(dir) {
  const { readdir } = await import("node:fs/promises");
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === ".git") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectHtmlFiles(full);
    } else if (entry.name.endsWith(".html")) {
      htmlFiles.push(full);
    }
  }
}

await mkdir(assetDir, { recursive: true });
await collectHtmlFiles(".");

const downloads = new Map();
const pageUpdates = new Map();

for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");

  html = html.replace(/<iframe\b[^>]*src="https:\/\/trinket\.io\/embed\/python[^"]*"[^>]*><\/iframe>/g, "");

  html = html.replace(/https:\/\/trinket\.io\/api\/files\/[^"' <>)]+/g, (url) => {
    const cleanUrl = url.replace(/&amp;/g, "&");
    const assetPath = path.join(assetDir, localName(cleanUrl));
    downloads.set(cleanUrl, assetPath);
    return relativeAssetPath(file, assetPath);
  });

  html = html.replace(/<iframe\b([^>]*?)src="https:\/\/trinket\.io\/components\/viewerjs\/index\.html#([^"]+)"([^>]*)><\/iframe>/g, (match, before, src, after) => {
    const fileUrl = trinketFileUrlFromViewer(src);
    if (!fileUrl) {
      return match;
    }
    const assetPath = path.join(assetDir, localName(fileUrl));
    downloads.set(fileUrl, assetPath);
    const href = relativeAssetPath(file, assetPath);
    return `<p><a href="${href}">Download ${path.basename(assetPath)}</a></p>`;
  });

  pageUpdates.set(file, html);
}

for (const [url, assetPath] of downloads.entries()) {
  await download(url, assetPath);
}

for (const [file, html] of pageUpdates.entries()) {
  await writeFile(file, html);
}

console.log(`Localized ${downloads.size} Trinket-hosted asset(s).`);
