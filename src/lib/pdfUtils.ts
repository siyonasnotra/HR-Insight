import jsPDF from 'jspdf';

// ─── Brand Palette ────────────────────────────────────────────────────────────
export const BRAND = {
  primary:    [40, 53, 147] as [number, number, number],   // indigo
  accent:     [63, 81, 181] as [number, number, number],   // lighter indigo
  gold:       [255, 190, 40] as [number, number, number],
  silver:     [158, 158, 158] as [number, number, number],
  diamond:    [100, 181, 246] as [number, number, number],
  success:    [46, 125, 50] as [number, number, number],
  warning:    [230, 81, 0] as [number, number, number],
  dark:       [30, 30, 30] as [number, number, number],
  body:       [55, 55, 55] as [number, number, number],
  muted:      [120, 120, 120] as [number, number, number],
  light:      [245, 247, 255] as [number, number, number],
  border:     [210, 215, 230] as [number, number, number],
  white:      [255, 255, 255] as [number, number, number],
};

export function rgb(doc: jsPDF, ...color: [number, number, number]) {
  return color;
}

// ─── Page Header (full-width banner) ─────────────────────────────────────────
export function drawPageHeader(doc: jsPDF, subtitle: string): number {
  const pW = doc.internal.pageSize.getWidth();

  // Dark band
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pW, 72, 'F');

  // Accent stripe
  doc.setFillColor(...BRAND.gold);
  doc.rect(0, 72, pW, 4, 'F');

  // Logo text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...BRAND.white);
  doc.text('HR-Insight', 40, 32);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 210, 255);
  doc.text(subtitle, 40, 52);

  // Date stamp, right-aligned
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pW - 40, 52, { align: 'right' });

  return 96; // y position after header
}

// ─── Page Footer ──────────────────────────────────────────────────────────────
export function drawPageFooter(doc: jsPDF, pageNum?: number, totalPages?: number) {
  const pW = doc.internal.pageSize.getWidth();
  const pH = doc.internal.pageSize.getHeight();

  doc.setFillColor(...BRAND.light);
  doc.rect(0, pH - 28, pW, 28, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text('HR-Insight — Confidential', 40, pH - 10);
  if (pageNum != null && totalPages != null) {
    doc.text(`Page ${pageNum} of ${totalPages}`, pW - 40, pH - 10, { align: 'right' });
  }
}

// ─── Section Heading ──────────────────────────────────────────────────────────
export function drawSectionHeading(doc: jsPDF, title: string, y: number): number {
  const pW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BRAND.light);
  doc.roundedRect(32, y - 2, pW - 64, 22, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.primary);
  doc.text(title.toUpperCase(), 40, y + 13);

  return y + 30;
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function drawDivider(doc: jsPDF, y: number): number {
  const pW = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.5);
  doc.line(32, y, pW - 32, y);
  return y + 12;
}

// ─── Key-Value Row ────────────────────────────────────────────────────────────
export function drawKV(doc: jsPDF, label: string, value: string, y: number, col = 40): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.muted);
  doc.text(label, col, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...BRAND.dark);
  doc.text(value || '—', col + 130, y);
  return y + 16;
}

// ─── Progress Bar Row ─────────────────────────────────────────────────────────
export function drawProgressRow(
  doc: jsPDF,
  label: string,
  pct: number,
  y: number,
  barColor?: [number, number, number],
): number {
  const pW = doc.internal.pageSize.getWidth();
  const barX = 190;
  const barW = pW - barX - 80;
  const barH = 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.body);
  doc.text(label, 40, y + barH / 2 + 2);

  // Track
  doc.setFillColor(...BRAND.border);
  doc.roundedRect(barX, y, barW, barH, 3, 3, 'F');

  // Fill
  const fillPct = Math.min(Math.max(pct, 0), 100);
  const color = barColor ?? (fillPct >= 65 ? BRAND.success : fillPct >= 45 ? BRAND.gold : BRAND.warning);
  doc.setFillColor(...color);
  doc.roundedRect(barX, y, (fillPct / 100) * barW, barH, 3, 3, 'F');

  // Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.dark);
  doc.text(`${Math.round(pct)}%`, pW - 48, y + barH / 2 + 2.5);

  return y + barH + 10;
}

// ─── Score Badge (large centred) ─────────────────────────────────────────────
export function drawScoreBadge(
  doc: jsPDF,
  score: number,
  label: string,
  cx: number,
  cy: number,
  radius = 36,
) {
  const color: [number, number, number] = score >= 85 ? BRAND.diamond : score >= 65 ? BRAND.gold : score >= 45 ? BRAND.silver : BRAND.warning;
  doc.setFillColor(...color);
  doc.circle(cx, cy, radius, 'F');
  doc.setFillColor(...BRAND.white);
  doc.circle(cx, cy, radius - 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...BRAND.dark);
  doc.text(`${score}`, cx, cy + 7, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text(label, cx, cy + 18, { align: 'center' });
}

// ─── Info Box ─────────────────────────────────────────────────────────────────
export function drawInfoBox(
  doc: jsPDF,
  text: string,
  y: number,
  type: 'success' | 'warning' | 'info' = 'info',
): number {
  const pW = doc.internal.pageSize.getWidth();
  const colors = {
    success: { bg: [240, 249, 244] as [number, number, number], border: BRAND.success, text: BRAND.success },
    warning: { bg: [255, 243, 224] as [number, number, number], border: BRAND.warning, text: BRAND.warning },
    info:    { bg: BRAND.light,                                  border: BRAND.primary, text: BRAND.primary },
  };
  const cfg = colors[type];

  const lines = doc.splitTextToSize(text, pW - 100);
  const boxH = lines.length * 13 + 12;

  doc.setFillColor(...cfg.bg);
  doc.roundedRect(32, y, pW - 64, boxH, 3, 3, 'F');
  doc.setFillColor(...cfg.border);
  doc.rect(32, y, 4, boxH, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...cfg.text);
  doc.text(lines, 44, y + 11);

  return y + boxH + 8;
}

// ─── Table ────────────────────────────────────────────────────────────────────
export function drawTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  y: number,
  colWidths?: number[],
): number {
  const pW = doc.internal.pageSize.getWidth();
  const margin = 32;
  const tableW = pW - margin * 2;
  const cW = colWidths ?? headers.map(() => tableW / headers.length);
  const rowH = 18;

  // Header row
  doc.setFillColor(...BRAND.primary);
  doc.rect(margin, y, tableW, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.white);
  let cx = margin + 6;
  headers.forEach((h, i) => {
    doc.text(h, cx, y + 12);
    cx += cW[i];
  });

  y += rowH;

  rows.forEach((row, ri) => {
    const rowFill: [number, number, number] = ri % 2 === 0 ? [255, 255, 255] : BRAND.light;
    doc.setFillColor(...rowFill);
    doc.rect(margin, y, tableW, rowH, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.body);
    cx = margin + 6;
    row.forEach((cell, i) => {
      doc.text(String(cell), cx, y + 12);
      cx += cW[i];
    });
    y += rowH;
    if (y > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      drawPageFooter(doc);
      y = 40;
    }
  });

  // Bottom border
  doc.setDrawColor(...BRAND.border);
  doc.line(margin, y, margin + tableW, y);

  return y + 10;
}

// ─── Certificate helpers ──────────────────────────────────────────────────────
export function drawCertBorder(doc: jsPDF) {
  const pW = doc.internal.pageSize.getWidth();
  const pH = doc.internal.pageSize.getHeight();

  // Outer gold frame
  doc.setDrawColor(...BRAND.gold);
  doc.setLineWidth(6);
  doc.rect(12, 12, pW - 24, pH - 24);

  // Inner thin frame
  doc.setDrawColor(...BRAND.accent);
  doc.setLineWidth(1.5);
  doc.rect(22, 22, pW - 44, pH - 44);

  // Corner accent squares
  const cs = 12;
  doc.setFillColor(...BRAND.gold);
  [[12, 12], [pW - 12 - cs, 12], [12, pH - 12 - cs], [pW - 12 - cs, pH - 12 - cs]].forEach(([x, y]) =>
    doc.rect(x, y, cs, cs, 'F')
  );
}

export function drawCertLevelBadge(
  doc: jsPDF,
  level: string,
  cx: number,
  cy: number,
  radius = 30,
) {
  const colorMap: Record<string, [number, number, number]> = {
    diamond: BRAND.diamond,
    gold:    BRAND.gold,
    silver:  BRAND.silver,
  };
  const color = colorMap[level.toLowerCase()] ?? BRAND.muted;

  doc.setFillColor(...color);
  doc.circle(cx, cy, radius, 'F');
  doc.setFillColor(...BRAND.white);
  doc.circle(cx, cy, radius - 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.dark);
  doc.text(level.toUpperCase(), cx, cy + 3.5, { align: 'center' });
}
