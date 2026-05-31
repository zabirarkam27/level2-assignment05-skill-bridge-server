type InvoicePayment = {
  id: string;
  transactionId: string;
  status: string;
  gateway: string;
  amount: number;
  currency: string;
  date: string;
  createdAt: Date | string;
  student?: {
    name: string;
    email: string;
  } | null;
  tutor?: {
    user?: {
      name: string;
    } | null;
  } | null;
  course?: {
    title: string;
    category?: {
      name: string;
    } | null;
  } | null;
  booking?: {
    status: string;
    dateTime: Date | string;
  } | null;
};

const escapePdfText = (text: string) =>
  String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const safeText = (text: string, maxLength = 80) => {
  const normalized = String(text ?? "N/A").replace(/[^\x20-\x7E]/g, "");
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3)}...`
    : normalized || "N/A";
};

const text = (
  value: string,
  x: number,
  y: number,
  size = 10,
  font = "F1",
  maxLength = 80,
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
  maxLength = 80,
) => `${color.join(" ")} rg\n${text(value, x, y, size, font, maxLength)}`;

const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number],
) => `${color.join(" ")} rg ${x} ${y} ${width} ${height} re f`;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const gradientRect = (
  x: number,
  y: number,
  width: number,
  height: number,
  from: [number, number, number],
  mid: [number, number, number],
  to: [number, number, number],
  steps = 140,
) => {
  const sliceWidth = width / steps;

  return Array.from({ length: steps })
    .map((_, i) => {
      const t = i / (steps - 1);

      const color =
        t < 0.5
          ? ([
              lerp(from[0], mid[0], t * 2),
              lerp(from[1], mid[1], t * 2),
              lerp(from[2], mid[2], t * 2),
            ] as [number, number, number])
          : ([
              lerp(mid[0], to[0], (t - 0.5) * 2),
              lerp(mid[1], to[1], (t - 0.5) * 2),
              lerp(mid[2], to[2], (t - 0.5) * 2),
            ] as [number, number, number]);

      return rect(x + i * sliceWidth, y, sliceWidth + 0.8, height, color);
    })
    .join("\n");
};

const roundedRect = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: [number, number, number],
  mode: "fill" | "stroke" = "fill",
) => {
  const op = mode === "fill" ? "f" : "S";
  const colorOp = mode === "fill" ? "rg" : "RG";
  const x2 = x + width;
  const y2 = y + height;
  const r = Math.min(radius, width / 2, height / 2);

  return [
    `${color.join(" ")} ${colorOp}`,
    `${x + r} ${y} m`,
    `${x2 - r} ${y} l`,
    `${x2} ${y} ${x2} ${y} ${x2} ${y + r} c`,
    `${x2} ${y2 - r} l`,
    `${x2} ${y2} ${x2} ${y2} ${x2 - r} ${y2} c`,
    `${x + r} ${y2} l`,
    `${x} ${y2} ${x} ${y2} ${x} ${y2 - r} c`,
    `${x} ${y + r} l`,
    `${x} ${y} ${x} ${y} ${x + r} ${y} c`,
    `h ${op}`,
  ].join("\n");
};

const info = (label: string, value: string, x: number, y: number, width = 46) =>
  [
    coloredText(label.toUpperCase(), x, y, 7, "F2", [0.5, 0.58, 0.72], width),
    coloredText(value, x, y - 16, 9, "F2", [0.02, 0.04, 0.08], width),
  ].join("\n");

const courseRow = (label: string, value: string, y: number) =>
  [
    coloredText(label, 46, y, 9, "F1", [0.36, 0.45, 0.58], 28),
    coloredText(value, 318, y, 9, "F2", [0.02, 0.04, 0.08], 42),
  ].join("\n");

const buildPdf = (contentLines: string) => {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(
      contentLines,
      "utf8",
    )} >>\nstream\n${contentLines}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
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

export function renderInvoicePdf(payment: InvoicePayment) {
  const invoiceId = `INV-${payment.id.slice(0, 8).toUpperCase()}`;
  const invoiceDate = new Date(payment.createdAt).toLocaleString("en-BD");

  const sessionDate = payment.booking?.dateTime
    ? new Date(payment.booking.dateTime).toLocaleString("en-BD")
    : payment.date;

  const amount = `${payment.currency.toUpperCase()} ${payment.amount}`;

  const contentLines = [
    // Page background
    rect(0, 0, 612, 792, [1, 1, 1]),

    // Smooth gradient header
    gradientRect(
      0,
      690,
      612,
      102,
      [0.39, 0.32, 0.94],
      [0.71, 0.16, 0.88],
      [0.35, 0.13, 0.84],
      160,
    ),

    // Header text
    coloredText("SkillBridge Invoice", 28, 742, 20, "F2", [1, 1, 1], 34),
    coloredText(
      "Thank you for learning with SkillBridge.",
      28,
      722,
      8,
      "F1",
      [0.9, 0.9, 1],
      52,
    ),

    // Paid badge
    roundedRect(520, 732, 58, 28, 14, [0.28, 0.42, 0.82]),
    coloredText(payment.status, 535, 742, 8, "F2", [1, 1, 1], 12),

    // Invoice meta
    info("Invoice ID", invoiceId, 28, 660, 28),
    info("Transaction ID", payment.transactionId, 312, 660, 34),
    info("Gateway", payment.gateway, 28, 615, 24),
    info("Invoice Date", invoiceDate, 312, 615, 30),

    rect(0, 570, 612, 1, [0.86, 0.89, 0.93]),

    // Student card
    roundedRect(28, 402, 268, 136, 14, [0.98, 0.99, 1]),
    roundedRect(28, 402, 268, 136, 14, [0.84, 0.88, 0.93], "stroke"),

    // Session card
    roundedRect(316, 402, 268, 136, 14, [0.98, 0.99, 1]),
    roundedRect(316, 402, 268, 136, 14, [0.84, 0.88, 0.93], "stroke"),

    coloredText("STUDENT DETAILS", 46, 510, 7, "F2", [0.36, 0.48, 0.7], 24),
    info("Name", payment.student?.name ?? "N/A", 46, 480, 30),
    info("Email", payment.student?.email ?? "N/A", 46, 440, 34),

    coloredText("SESSION DETAILS", 334, 510, 7, "F2", [0.36, 0.48, 0.7], 24),
    info("Tutor", payment.tutor?.user?.name ?? "N/A", 334, 480, 28),
    info("Session Date", sessionDate, 334, 440, 30),

    // Course summary card
    roundedRect(28, 222, 556, 160, 14, [1, 1, 1]),
    roundedRect(28, 222, 556, 160, 14, [0.84, 0.88, 0.93], "stroke"),

    // Header
    rect(28, 326, 556, 56, [0.98, 0.99, 1]),
    coloredText("Course Summary", 46, 352, 10, "F2", [0.02, 0.06, 0.12], 30),

    // Divider lines
    rect(28, 326, 556, 1, [0.86, 0.89, 0.94]),
    rect(28, 286, 556, 1, [0.86, 0.89, 0.94]),
    rect(28, 246, 556, 1, [0.86, 0.89, 0.94]),

    // Rows text
    courseRow("Course", payment.course?.title ?? "N/A", 304),
    courseRow("Category", payment.course?.category?.name ?? "N/A", 264),
    courseRow(
      "Booking Status",
      payment.booking?.status ?? "Not created yet",
      232,
    ),

    // Total paid box
    roundedRect(28, 72, 556, 102, 18, [0.01, 0.03, 0.1]),
    coloredText("Total Paid", 46, 135, 10, "F1", [1, 1, 1], 20),
    coloredText(amount, 46, 100, 26, "F2", [1, 1, 1], 22),

    // Payment small card
    roundedRect(476, 94, 82, 64, 10, [0.12, 0.15, 0.25]),
    coloredText("Payment", 494, 130, 8, "F1", [1, 1, 1], 14),
    coloredText(payment.status, 502, 110, 9, "F2", [0.13, 0.9, 0.55], 12),

    // Footer
    coloredText(
      "This invoice confirms your SkillBridge booking and payment record.",
      130,
      38,
      8,
      "F1",
      [0.34, 0.44, 0.62],
      62,
    ),
  ].join("\n");

  return buildPdf(contentLines);
}
