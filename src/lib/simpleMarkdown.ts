const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const inline = (value: string) =>
  escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

export const renderSimpleMarkdown = (markdown: string) => {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const html: string[] = [];
  let inList = false;

  for (const line of lines) {
    if (!line.trim()) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }

    if (inList) {
      html.push("</ul>");
      inList = false;
    }

    if (line.startsWith("###### ")) {
      html.push(`<h6>${inline(line.slice(7))}</h6>`);
    } else if (line.startsWith("##### ")) {
      html.push(`<h5>${inline(line.slice(6))}</h5>`);
    } else if (line.startsWith("#### ")) {
      html.push(`<h4>${inline(line.slice(5))}</h4>`);
    } else if (line.startsWith("### ")) {
      html.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      html.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      html.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else {
      html.push(`<p>${inline(line)}</p>`);
    }
  }

  if (inList) {
    html.push("</ul>");
  }

  return html.join("\n");
};
