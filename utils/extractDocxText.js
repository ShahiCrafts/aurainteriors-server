const JSZip = require("jszip");
const { DOMParser } = require("@xmldom/xmldom");
const AppError = require("./AppError");
const WORD_NAMESPACE =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const MAX_XML_BYTES = 10 * 1024 * 1024;

module.exports = async function extractDocxText(buffer) {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const entry = zip.file("word/document.xml");
    if (!entry) throw new Error("Missing document body");
    const xml = await new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      const stream = entry.nodeStream("nodebuffer");
      stream.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_XML_BYTES)
          stream.destroy(new Error("Document body is too large"));
        else chunks.push(chunk);
      });
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    if (/<!DOCTYPE|<!ENTITY/i.test(xml))
      throw new Error("Unsupported XML declarations");
    const document = new DOMParser({
      onError: (level) => {
        if (level !== "warning") throw new Error("Invalid document XML");
      },
    }).parseFromString(xml, "application/xml");
    const body = document.getElementsByTagNameNS(WORD_NAMESPACE, "body")[0];
    if (!body) throw new Error("Missing document body");
    const read = (node) => {
      if (node.nodeType !== 1) return "";
      const word = node.namespaceURI === WORD_NAMESPACE;
      if (word && node.localName === "t") return node.textContent;
      if (word && node.localName === "tab") return "\t";
      if (word && ["br", "cr"].includes(node.localName)) return "\n";
      if (word && ["del", "instrText"].includes(node.localName)) return "";
      let text = "";
      for (let child = node.firstChild; child; child = child.nextSibling)
        text += read(child);
      return text + (word && node.localName === "p" ? "\n\n" : "");
    };
    return read(body);
  } catch (_error) {
    throw new AppError("Invalid DOCX file or document body exceeds 10 MB", 400);
  }
};
