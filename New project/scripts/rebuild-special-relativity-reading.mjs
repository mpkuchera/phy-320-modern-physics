import { readFile, writeFile } from "node:fs/promises";

const mdPath = "/Users/mikuchera/Downloads/Trinket Course-phy-320-modern-physics-md.zip";
const templatePath = "01-special-relativity/05-homework-problems.html";
const outputPath = "01-special-relativity/04-exploratory-reading.html";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function flushParagraph(blocks, lines) {
  if (lines.length === 0) {
    return;
  }
  blocks.push(`<p>${inlineMarkdown(lines.join(" "))}</p>`);
  lines.length = 0;
}

function markdownToHtml(markdown) {
  const blocks = [];
  const paragraph = [];
  let inQuote = false;
  let quoteLines = [];
  let inOrderedList = false;
  let listItems = [];

  function flushQuote() {
    if (!inQuote) {
      return;
    }
    blocks.push(`<blockquote>${quoteLines.map((line) => `<p>${inlineMarkdown(line)}</p>`).join("")}</blockquote>`);
    inQuote = false;
    quoteLines = [];
  }

  function flushList() {
    if (!inOrderedList) {
      return;
    }
    blocks.push(`<ol>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
    inOrderedList = false;
    listItems = [];
  }

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph(blocks, paragraph);
      flushQuote();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph(blocks, paragraph);
      flushQuote();
      flushList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph(blocks, paragraph);
      flushList();
      inQuote = true;
      quoteLines.push(line.replace(/^>\s?/, ""));
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph(blocks, paragraph);
      flushQuote();
      inOrderedList = true;
      listItems.push(ordered[1]);
      continue;
    }

    if (/^!\[[^\]]*\]\(/.test(line)) {
      flushParagraph(blocks, paragraph);
      flushQuote();
      flushList();
      blocks.push(`<p>${inlineMarkdown(line)}</p>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph(blocks, paragraph);
  flushQuote();
  flushList();
  return blocks.join("\n");
}

async function readMarkdownFromZip() {
  const { spawn } = await import("node:child_process");
  return await new Promise((resolve, reject) => {
    const child = spawn("unzip", [
      "-p",
      mdPath,
      "01-special-relativity/04-exploratory-reading.md"
    ]);
    let output = "";
    let error = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      error += chunk;
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(error || `unzip exited with ${code}`));
      }
    });
  });
}

const markdown = await readMarkdownFromZip();
let html = await readFile(templatePath, "utf8");
const content = markdownToHtml(markdown);

html = html
  .replace("<title>Homework Problems | PHY 320: Modern Physics</title>", "<title>Exploratory Reading | PHY 320: Modern Physics</title>")
  .replace(/width: 15\.254237288135593%/, "width: 13.559322033898304%")
  .replace('href="04-exploratory-reading.html" class="prev button small"', 'href="03-paradoxes.html" class="prev button small"')
  .replace('href="../02-particle-physics/00-quantum-mechanics-concepts.html" class="next button small"', 'href="05-homework-problems.html" class="next button small"')
  .replace('class="outline-list-item material ">\n                  <div class="material-title clearfix">\n                    <a href="04-exploratory-reading.html"', 'class="outline-list-item material current">\n                  <div class="material-title clearfix">\n                    <a href="04-exploratory-reading.html"')
  .replace('class="outline-list-item material current">\n                  <div class="material-title clearfix">\n                    <a href="05-homework-problems.html"', 'class="outline-list-item material ">\n                  <div class="material-title clearfix">\n                    <a href="05-homework-problems.html"')
  .replace(/<h4 class="subheader">[\s\S]*?<\/div>\n        <\/div>\n      <\/div>/, `<h4 class="subheader"> 
            <i class="fa fa-file-text-o"></i>
            Exploratory Reading
          </h4>
          <div class="content">${content}</div>
        </div>
      </div>`);

await writeFile(outputPath, html);
console.log(`Rebuilt ${outputPath} from Markdown export.`);
