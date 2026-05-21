import fs from "node:fs";
import path from "node:path";
import MarkdownIt from "markdown-it";
import sharp from "sharp";
import { Document, Packer, Paragraph, HeadingLevel, TextRun, ImageRun } from "docx";

const md = new MarkdownIt();

function mapHeading(level) {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    case 5:
      return HeadingLevel.HEADING_5;
    default:
      return HeadingLevel.HEADING_6;
  }
}

function inlineRunsFromChildren(children = []) {
  const runs = [];

  for (const child of children) {
    if (child.type === "text") {
      runs.push(new TextRun(child.content));
      continue;
    }

    if (child.type === "code_inline") {
      runs.push(new TextRun({ text: child.content, font: "Consolas" }));
      continue;
    }

    if (child.type === "strong") {
      const strongText = (child.children || []).map((c) => c.content || "").join("");
      runs.push(new TextRun({ text: strongText, bold: true }));
      continue;
    }

    if (child.type === "em") {
      const emText = (child.children || []).map((c) => c.content || "").join("");
      runs.push(new TextRun({ text: emText, italics: true }));
      continue;
    }

    if (child.type === "link_open") {
      continue;
    }

    if (child.type === "link_close") {
      continue;
    }

    // Inline image embedding is handled in tokensToParagraphs to allow async processing.
  }

  if (runs.length === 0) {
    runs.push(new TextRun(""));
  }

  return runs;
}

async function createImageRun(imagePath) {
  const buffer = fs.readFileSync(imagePath);
  const extension = path.extname(imagePath).toLowerCase();

  let pngBuffer = buffer;
  if (extension === ".svg") {
    pngBuffer = await sharp(buffer).png().toBuffer();
  }

  const metadata = await sharp(pngBuffer).metadata();
  const sourceWidth = metadata.width || 1200;
  const sourceHeight = metadata.height || 800;
  const maxWidth = 620;
  const scale = sourceWidth > maxWidth ? maxWidth / sourceWidth : 1;
  const width = Math.max(200, Math.round(sourceWidth * scale));
  const height = Math.max(120, Math.round(sourceHeight * scale));

  return new ImageRun({
    data: pngBuffer,
    transformation: {
      width,
      height,
    },
  });
}

async function tokensToParagraphs(tokens, sourceDir) {
  const paragraphs = [];
  let i = 0;

  while (i < tokens.length) {
    const t = tokens[i];

    if (t.type === "heading_open") {
      const level = Number(t.tag.replace("h", ""));
      const inline = tokens[i + 1];
      paragraphs.push(
        new Paragraph({
          heading: mapHeading(level),
          children: inlineRunsFromChildren(inline?.children),
        })
      );
      i += 3;
      continue;
    }

    if (t.type === "paragraph_open") {
      const inline = tokens[i + 1];

      const imageToken = inline?.children?.find((child) => child.type === "image");
      if (imageToken && inline.children.length === 1) {
        const src = imageToken.attrGet("src") || "";
        const alt = imageToken.content || "Bild";
        const imagePath = path.resolve(sourceDir, src);

        if (fs.existsSync(imagePath)) {
          const imageRun = await createImageRun(imagePath);
          paragraphs.push(
            new Paragraph({
              children: [imageRun],
            })
          );
          if (alt) {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: alt, italics: true })],
              })
            );
          }
        } else {
          paragraphs.push(new Paragraph({ children: [new TextRun(`[Bild saknas: ${src}]`)] }));
        }

        i += 3;
        continue;
      }

      paragraphs.push(
        new Paragraph({
          children: inlineRunsFromChildren(inline?.children),
        })
      );
      i += 3;
      continue;
    }

    if (t.type === "bullet_list_open") {
      i += 1;
      while (i < tokens.length && tokens[i].type !== "bullet_list_close") {
        if (tokens[i].type === "list_item_open") {
          const inline = tokens[i + 2];
          paragraphs.push(
            new Paragraph({
              text: (inline?.content || "").trim(),
              bullet: { level: 0 },
            })
          );
          i += 5;
          continue;
        }
        i += 1;
      }
      i += 1;
      continue;
    }

    if (t.type === "ordered_list_open") {
      i += 1;
      while (i < tokens.length && tokens[i].type !== "ordered_list_close") {
        if (tokens[i].type === "list_item_open") {
          const inline = tokens[i + 2];
          paragraphs.push(
            new Paragraph({
              text: (inline?.content || "").trim(),
              numbering: { reference: "default-numbering", level: 0 },
            })
          );
          i += 5;
          continue;
        }
        i += 1;
      }
      i += 1;
      continue;
    }

    if (t.type === "fence") {
      const lines = t.content.split("\n");
      for (const line of lines) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line, font: "Consolas" })],
          })
        );
      }
      i += 1;
      continue;
    }

    i += 1;
  }

  return paragraphs;
}

async function convertFile(src, dst) {
  const markdown = fs.readFileSync(src, "utf8");
  const tokens = md.parse(markdown, {});
  const paragraphs = await tokensToParagraphs(tokens, path.dirname(src));

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: "left",
            },
          ],
        },
      ],
    },
    sections: [{ children: paragraphs }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(dst, buffer);
  console.log(`Created: ${dst}`);
}

async function main() {
  const [, , srcArg, dstArg] = process.argv;
  if (!srcArg || !dstArg) {
    console.error("Usage: node scripts/md-to-docx.mjs <source.md> <target.docx>");
    process.exit(1);
  }

  const src = path.resolve(srcArg);
  const dst = path.resolve(dstArg);

  if (!fs.existsSync(src)) {
    console.error(`Source not found: ${src}`);
    process.exit(1);
  }

  await convertFile(src, dst);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
