import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PdfBuilder, generateCertificatePdf } from "../pdf";

const params = {
  studentName: "Ama Mensah",
  courseTitle: "Web Development Bootcamp",
  cohortName: "Cohort 12",
  certificateNumber: "ST-2026-00042",
  issuedAt: new Date("2026-03-05T00:00:00.000Z"),
  completionPercent: 96,
  verifyUrl: "https://startech.example/verify/ST-2026-00042",
  instructorName: "Kofi Boateng",
};

describe("generateCertificatePdf", () => {
  it("returns a buffer that starts with the PDF magic number", () => {
    const pdf = generateCertificatePdf(params);
    assert.ok(pdf.length > 0);
    assert.equal(pdf.indexOf("%PDF-"), 0);
  });

  it("embeds the certificate number as bytes", () => {
    const pdf = generateCertificatePdf(params);
    assert.ok(pdf.includes(Buffer.from("ST-2026-00042", "latin1")));
    assert.ok(pdf.includes(Buffer.from("Certificate No.", "latin1")));
  });

  it("embeds the student name as bytes", () => {
    const pdf = generateCertificatePdf(params);
    assert.ok(pdf.includes(Buffer.from("Ama Mensah", "latin1")));
  });

  it("embeds the course title and verification url", () => {
    const pdf = generateCertificatePdf(params);
    assert.ok(pdf.includes(Buffer.from("Web Development Bootcamp", "latin1")));
    assert.ok(pdf.includes(Buffer.from(params.verifyUrl, "latin1")));
  });
});

describe("PdfBuilder", () => {
  it("renders basic shapes without throwing", () => {
    const builder = new PdfBuilder(200, 100);
    assert.doesNotThrow(() => {
      builder
        .rect(0, 0, 200, 100, [1, 1, 1])
        .strokeRect(10, 10, 50, 50, [0, 0, 0], 1)
        .line(0, 0, 200, 100, [0, 0, 0], 1)
        .text("Hello", { x: 20, y: 50, size: 12, bold: true });
    });
  });

  it("produces a valid-looking PDF buffer", () => {
    const builder = new PdfBuilder(200, 100);
    builder.rect(0, 0, 200, 100, [1, 1, 1]).text("Hi", { x: 5, y: 5 });
    const out = builder.render();
    assert.equal(out.indexOf("%PDF-"), 0);
    assert.ok(out.toString("latin1").includes("%%EOF"));
  });

  it("wraps paragraphs and returns the next y position", () => {
    const builder = new PdfBuilder(200, 100);
    const nextY = builder.paragraph(
      "one two three four five six seven eight nine ten",
      { x: 10, y: 90, maxWidth: 40, size: 10 }
    );
    assert.equal(typeof nextY, "number");
    assert.ok(nextY < 90);
    const out = builder.render();
    assert.equal(out.indexOf("%PDF-"), 0);
  });

  it("handles text alignment and special characters", () => {
    const builder = new PdfBuilder(200, 100);
    assert.doesNotThrow(() => {
      builder
        .text("Left — right", { x: 100, y: 50, align: "center" })
        .text("Right", { x: 190, y: 40, align: "right", color: [1, 0, 0] });
    });
    const out = builder.render();
    assert.equal(out.indexOf("%PDF-"), 0);
  });
});
