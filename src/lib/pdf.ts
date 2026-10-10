/**
 * Minimal, dependency-free PDF 1.4 writer.
 *
 * The project does not ship a PDF library, and certificate generation must
 * work offline at build/runtime — so this writes raw PDF objects using the
 * 14 standard base-14 fonts (no font embedding, WinAnsi encoding).
 *
 * Coordinates are in points with the origin at the bottom-left, as per PDF.
 */

type RGB = [number, number, number];

const PAGE_MARGIN = 0;

/** Map a few typographic characters into the WinAnsi code page. */
function toWinAnsi(input: string): string {
  const map: Record<string, number> = {
    "\u2018": 0x91, // ‘
    "\u2019": 0x92, // ’
    "\u201c": 0x93, // “
    "\u201d": 0x94, // ”
    "\u2013": 0x96, // –
    "\u2014": 0x97, // —
    "\u2022": 0x95, // •
    "\u2026": 0x85, // …
    "\u00a0": 0x20, // nbsp
  };

  let out = "";
  for (const char of Array.from(input)) {
    if (map[char] !== undefined) {
      out += String.fromCharCode(map[char]);
    } else if (char.codePointAt(0)! > 0xff) {
      out += "?";
    } else {
      out += char;
    }
  }
  return out;
}

function escapeText(text: string): string {
  return toWinAnsi(text).replace(/([\\()])/g, "\\$1");
}

/**
 * Rough advance-width factor for Helvetica family, used for alignment.
 * Good enough for centring headings; exact kerning is not the goal here.
 */
function measureWidth(text: string, size: number, bold: boolean): number {
  const factor = bold ? 0.55 : 0.5;
  return text.length * size * factor;
}

export type TextOptions = {
  x: number;
  y: number;
  size?: number;
  bold?: boolean;
  color?: RGB;
  align?: "left" | "center" | "right";
  maxWidth?: number;
  letterSpacing?: number;
};

export class PdfBuilder {
  private ops: string[] = [];

  constructor(
    private width = 842, // A4 landscape
    private height = 595
  ) {}

  /** Filled rectangle. */
  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    color: RGB,
    opacity?: number
  ): this {
    const [r, g, b] = color;
    const alpha = opacity === undefined ? "" : `/GS${opacity} gs `;
    this.ops.push(
      `q ${alpha}${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f Q`
    );
    return this;
  }

  /** Stroked line. */
  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: RGB = [0, 0, 0],
    lineWidth = 1
  ): this {
    const [r, g, b] = color;
    this.ops.push(
      `q ${r} ${g} ${b} RG ${lineWidth} w ${x1} ${y1} m ${x2} ${y2} l S Q`
    );
    return this;
  }

  /** Stroked rectangle (no fill). */
  strokeRect(
    x: number,
    y: number,
    w: number,
    h: number,
    color: RGB = [0, 0, 0],
    lineWidth = 1
  ): this {
    const [r, g, b] = color;
    this.ops.push(
      `q ${r} ${g} ${b} RG ${lineWidth} w ${x} ${y} ${w} ${h} re S Q`
    );
    return this;
  }

  text(content: string, options: TextOptions): this {
    const {
      x,
      y,
      size = 12,
      bold = false,
      color = [0, 0, 0],
      align = "left",
    } = options;

    let drawX = x;
    const width = measureWidth(content, size, bold);
    if (align === "center") drawX = x - width / 2;
    if (align === "right") drawX = x - width;

    const [r, g, b] = color;
    const font = bold ? "/F2" : "/F1";
    const spacing =
      options.letterSpacing && options.letterSpacing > 0
        ? ` ${options.letterSpacing} Tc`
        : "";

    this.ops.push(
      `BT ${font} ${size} Tf ${r} ${g} ${b} rg${spacing} ` +
        `1 0 0 1 ${drawX} ${y} Tm (${escapeText(content)}) Tj ET`
    );
    return this;
  }

  /**
   * Word-wrapped paragraph. Returns the y position after the last line
   * (i.e. the next line to draw below).
   */
  paragraph(
    content: string,
    options: TextOptions & { maxWidth: number; lineHeight?: number }
  ): number {
    const size = options.size ?? 12;
    const lineHeight = options.lineHeight ?? size * 1.4;
    const bold = options.bold ?? false;
    const words = content.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measureWidth(candidate, size, bold) > options.maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);

    let y = options.y;
    for (const line of lines) {
      this.text(line, { ...options, y, size, bold });
      y -= lineHeight;
    }
    return y;
  }

  private buildContentStream(): string {
    return this.ops.join("\n");
  }

  /** Serialise to a PDF file. */
  render(): Buffer {
    const content = this.buildContentStream();
    const contentLength = Buffer.byteLength(content, "latin1");

    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] ` +
        `/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
      `<< /Length ${contentLength} >>\nstream\n${content}\nendstream`,
    ];

    let body = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
    const offsets: number[] = [];

    objects.forEach((obj, index) => {
      offsets.push(Buffer.byteLength(body, "latin1"));
      body += `${index + 1} 0 obj\n${obj}\nendobj\n`;
    });

    const xrefOffset = Buffer.byteLength(body, "latin1");
    const entryCount = objects.length + 1;
    body += `xref\n0 ${entryCount}\n`;
    body += "0000000000 65535 f \n";
    for (const offset of offsets) {
      body += `${String(offset).padStart(10, "0")} 00000 n \n`;
    }
    body += `trailer\n<< /Size ${entryCount} /Root 1 0 R >>\n`;
    body += `startxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(body, "latin1");
  }
}

export type CertificatePdfParams = {
  studentName: string;
  courseTitle: string;
  cohortName: string;
  certificateNumber: string;
  issuedAt: Date;
  completionPercent: number;
  /** Absolute URL of the public verification page */
  verifyUrl: string;
  instructorName?: string;
};

const PRIMARY: RGB = [0.118, 0.227, 0.373]; // #1e3a5f
const ACCENT: RGB = [0.133, 0.773, 0.369]; // #22c55e
const DARK: RGB = [0.06, 0.09, 0.13];
const MUTED: RGB = [0.42, 0.45, 0.49];

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Generate a branded certificate PDF. */
export function generateCertificatePdf(
  params: CertificatePdfParams
): Buffer {
  const pdf = new PdfBuilder(842, 595); // A4 landscape

  // Page frame
  pdf.rect(0, 0, 842, 595, [1, 1, 1]);
  pdf.rect(0, 545, 842, 50, PRIMARY);
  pdf.rect(0, 0, 842, 14, PRIMARY);
  pdf.rect(0, 14, 842, 6, ACCENT);

  pdf.strokeRect(36, 36, 770, 523, PRIMARY, 2);
  pdf.strokeRect(44, 44, 754, 507, ACCENT, 0.75);

  // Header
  pdf.text("StarTech", {
    x: 421,
    y: 560,
    size: 20,
    bold: true,
    color: [1, 1, 1],
    align: "center",
    letterSpacing: 2,
  });
  pdf.text("CERTIFICATE OF COMPLETION", {
    x: 421,
    y: 480,
    size: 30,
    bold: true,
    color: PRIMARY,
    align: "center",
    letterSpacing: 3,
  });
  pdf.line(241, 466, 601, 466, ACCENT, 2);

  pdf.text("This is to certify that", {
    x: 421,
    y: 424,
    size: 13,
    color: MUTED,
    align: "center",
  });

  const nameSize = Math.min(
    44,
    Math.max(24, Math.floor(900 / Math.max(1, params.studentName.length)))
  );
  pdf.text(params.studentName, {
    x: 421,
    y: 372,
    size: nameSize,
    bold: true,
    color: DARK,
    align: "center",
  });
  pdf.line(191, 356, 651, 356, [0.85, 0.87, 0.89], 1);

  pdf.text("has successfully completed the course", {
    x: 421,
    y: 322,
    size: 13,
    color: MUTED,
    align: "center",
  });

  const courseY = pdf.paragraph(params.courseTitle, {
    x: 421,
    y: 286,
    size: 24,
    bold: true,
    color: PRIMARY,
    align: "center",
    maxWidth: 660,
    lineHeight: 30,
  });

  pdf.text(
    `${params.cohortName}  •  ${formatDate(params.issuedAt)}`,
    { x: 421, y: courseY - 8, size: 12, color: MUTED, align: "center" }
  );

  // Completion stats
  pdf.text(`Completed ${params.completionPercent}% of required work`, {
    x: 421,
    y: courseY - 44,
    size: 11,
    color: ACCENT,
    bold: true,
    align: "center",
  });

  // Signature block
  pdf.line(120, 150, 320, 150, [0.6, 0.63, 0.66], 1);
  pdf.text(params.instructorName ?? "StarTech Instructor", {
    x: 220,
    y: 130,
    size: 12,
    bold: true,
    color: DARK,
    align: "center",
  });
  pdf.text("Course Instructor", {
    x: 220,
    y: 114,
    size: 10,
    color: MUTED,
    align: "center",
  });

  pdf.line(522, 150, 722, 150, [0.6, 0.63, 0.66], 1);
  pdf.text("StarTech Academy", {
    x: 622,
    y: 130,
    size: 12,
    bold: true,
    color: DARK,
    align: "center",
  });
  pdf.text("Program Director", {
    x: 622,
    y: 114,
    size: 10,
    color: MUTED,
    align: "center",
  });

  // Verification footer
  pdf.text(`Certificate No. ${params.certificateNumber}`, {
    x: 421,
    y: 82,
    size: 10,
    color: MUTED,
    align: "center",
  });
  pdf.text(`Verify at ${params.verifyUrl}`, {
    x: 421,
    y: 66,
    size: 9,
    color: PRIMARY,
    align: "center",
  });

  return pdf.render();
}

/** Convenience: PDF bytes → data URI for previews. */
export function pdfToDataUri(pdf: Buffer): string {
  return `data:application/pdf;base64,${pdf.toString("base64")}`;
}

export { PAGE_MARGIN };
