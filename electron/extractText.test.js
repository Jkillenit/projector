import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const { extractBufferText, extractTextFromAst } = createRequire(import.meta.url)("./extractText.cjs");

describe("extractBufferText", () => {
  it("reads plain text kinds and ignores unknown ones", async () => {
    expect(await extractBufferText(Buffer.from("Exams 40%"), ".TXT")).toBe("Exams 40%");
    expect(await extractBufferText(Buffer.from("x"), "png")).toBe("");
  });

  it("flattens an office AST with a table", () => {
    const ast = [
      { type: "paragraph", text: "Grading" },
      { type: "table", children: [{ type: "row", children: [{ type: "cell", text: "Exams" }, { type: "cell", text: "40%" }] }] },
    ];
    expect(extractTextFromAst(ast)).toBe("Grading\n\nExams\t40%\n");
  });
});
