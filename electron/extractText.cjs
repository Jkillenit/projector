// Main process only: reads PDF / Word / text attachments so findSyllabus can parse them.
const officeParser = require("officeparser");

const OFFICE_KINDS = new Set(["docx", "pptx", "xlsx", "odt", "odp", "ods"]);
const TEXT_KINDS = new Set(["txt", "md", "html", "htm"]);

async function pdfText(buf) {
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return String(result?.text ?? "").trim();
  } finally {
    await parser.destroy().catch(() => {});
  }
}

function extractTableText(tableNode) {
  const rows = [];
  for (const row of tableNode?.children || []) {
    if (row?.type !== "row") continue;
    const cells = (row.children || []).filter((c) => c?.type === "cell").map((c) => String(c?.text || "").trim());
    if (cells.some(Boolean)) rows.push(cells.join("\t"));
  }
  return rows.join("\n");
}

function extractTextFromAst(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextFromAst).filter((t) => t.trim()).join("\n");
  if (node.type === "table") return `${extractTableText(node)}\n`;
  if (node.text && typeof node.text === "string" && node.text.trim() && !(node.children || []).some((c) => c?.type === "table")) {
    return `${node.text}\n`;
  }
  return extractTextFromAst(node.children || node.content || []);
}

/** Plain text from an in-memory PDF / Office / text file. Returns "" when the format is unsupported. */
async function extractBufferText(buf, ext) {
  const kind = String(ext || "").toLowerCase().replace(/^\./, "");
  if (kind === "pdf") return pdfText(buf);
  if (OFFICE_KINDS.has(kind)) {
    const data = await officeParser.parseOffice(buf, { ignoreNotes: false, outputErrorToConsole: false });
    return typeof data === "string" ? data : extractTextFromAst(data);
  }
  if (TEXT_KINDS.has(kind)) return buf.toString("utf8");
  return "";
}

module.exports = { extractBufferText, extractTextFromAst };
