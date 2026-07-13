import QRCode from "qrcode";

type CertificatePdfData = {
  certificateNo: string;
  issuedAt: Date | string;
  verificationUrl: string;
  student: {
    name: string;
  };
  course: {
    title: string;
    tutor?: {
      name?: string | null;
    } | null;
    category?: {
      name?: string | null;
    } | null;
  };
};

const escapePdfText = (text: string) =>
  String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const safeText = (text: string, maxLength = 92) => {
  const normalized = String(text ?? "N/A").replace(/[^\x20-\x7E]/g, "");
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3)}...`
    : normalized || "N/A";
};

const text = (
  value: string,
  x: number,
  y: number,
  size = 12,
  font = "F1",
  maxLength = 92,
) =>
  `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(
    safeText(value, maxLength),
  )}) Tj ET`;

const coloredText = (
  value: string,
  x: number,
  y: number,
  size: number,
  font: string,
  color: [number, number, number],
  maxLength = 92,
) => `${color.join(" ")} rg\n${text(value, x, y, size, font, maxLength)}`;

const estimateTextWidth = (value: string, size: number, font = "F1") => {
  const weight = font === "F2" ? 0.58 : font === "F3" ? 0.5 : 0.52;
  return safeText(value).length * size * weight;
};

const centeredText = (
  value: string,
  centerX: number,
  y: number,
  size: number,
  font: string,
  color: [number, number, number],
  maxLength = 92,
) => {
  const displayValue = safeText(value, maxLength);
  const x = centerX - estimateTextWidth(displayValue, size, font) / 2;
  return coloredText(displayValue, x, y, size, font, color, maxLength);
};

const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number],
) => `${color.join(" ")} rg ${x} ${y} ${width} ${height} re f`;

const line = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  color: [number, number, number],
) => `${color.join(" ")} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`;

const strokeRect = (
  x: number,
  y: number,
  width: number,
  height: number,
  lineWidth: number,
  color: [number, number, number],
) => `${color.join(" ")} RG ${lineWidth} w ${x} ${y} ${width} ${height} re S`;

const renderQrCode = (value: string, x: number, y: number, size = 86) => {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" }) as {
    modules: { size: number; data: ArrayLike<boolean | number> };
  };
  const cells = qr.modules.size;
  const cell = size / cells;
  const blocks: string[] = [rect(x, y, size, size, [1, 1, 1])];

  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const isDark = Boolean(qr.modules.data[row * cells + col]);
      if (isDark) {
        blocks.push(
          rect(
            x + col * cell,
            y + (cells - row - 1) * cell,
            cell + 0.15,
            cell + 0.15,
            [0.02, 0.04, 0.08],
          ),
        );
      }
    }
  }

  blocks.push(strokeRect(x, y, size, size, 1.2, [0.88, 0.72, 0.32]));
  return blocks.join("\n");
};

const buildPdf = (contentLines: string) => {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 6 0 R /F3 7 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(
      contentLines,
      "utf8",
    )} >>\nstream\n${contentLines}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
};

export function renderCertificatePdf(certificate: CertificatePdfData) {
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString(
    "en-BD",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  const instructor = certificate.course.tutor?.name ?? "MentorForge Instructor";
  const category = certificate.course.category?.name ?? "Professional Learning";
  const centerX = 421;

  const contentLines = [
    rect(0, 0, 842, 595, [0.98, 0.97, 0.93]),
    strokeRect(28, 28, 786, 539, 2.5, [0.74, 0.52, 0.18]),
    strokeRect(42, 42, 758, 511, 0.9, [0.86, 0.72, 0.36]),
    rect(60, 505, 722, 2, [0.74, 0.52, 0.18]),
    rect(60, 86, 722, 2, [0.74, 0.52, 0.18]),

    centeredText("MentorForge", centerX, 522, 25, "F2", [0.38, 0.12, 0.41], 32),
    centeredText("Official MentorForge Certification", centerX, 496, 10, "F1", [0.47, 0.38, 0.22], 48),
    centeredText("Certificate of Completion", centerX, 436, 30, "F2", [0.05, 0.08, 0.16], 46),
    centeredText("This certificate is proudly awarded to", centerX, 398, 12, "F1", [0.39, 0.45, 0.55], 54),
    centeredText(certificate.student.name, centerX, 352, 34, "F3", [0.38, 0.12, 0.41], 42),
    line(263, 336, 579, 336, 1, [0.78, 0.62, 0.26]),
    centeredText("for successfully completing", centerX, 296, 12, "F1", [0.39, 0.45, 0.55], 48),
    centeredText(certificate.course.title, centerX, 260, 23, "F2", [0.05, 0.08, 0.16], 52),
    centeredText(category, centerX, 234, 11, "F1", [0.43, 0.29, 0.09], 38),

    coloredText("Issued Date", 112, 160, 9, "F2", [0.39, 0.45, 0.55], 24),
    coloredText(issuedDate, 112, 140, 12, "F2", [0.05, 0.08, 0.16], 34),
    coloredText("Certificate No", 356, 160, 9, "F2", [0.39, 0.45, 0.55], 24),
    coloredText(certificate.certificateNo, 356, 140, 12, "F2", [0.05, 0.08, 0.16], 36),
    coloredText("Instructor", 624, 160, 9, "F2", [0.39, 0.45, 0.55], 24),
    coloredText(instructor, 624, 140, 12, "F2", [0.05, 0.08, 0.16], 32),
    line(612, 130, 748, 130, 1, [0.78, 0.62, 0.26]),

    renderQrCode(certificate.verificationUrl, 664, 412, 76),
    centeredText("Scan to Verify", 702, 397, 8, "F2", [0.39, 0.45, 0.55], 20),
    coloredText(certificate.verificationUrl, 542, 65, 8, "F1", [0.39, 0.45, 0.55], 58),
  ].join("\n");

  return buildPdf(contentLines);
}
