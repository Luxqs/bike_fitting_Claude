// ─── Export Utilities ─────────────────────────────────────────────────────────

import type { FitResult } from '@/types/fit';
import { BIKE_CATEGORIES } from '@/config/bikeCategories';

// ─── PDF Export ───────────────────────────────────────────────────────────────

export async function exportToPDF(result: FitResult): Promise<void> {
  // Dynamic import to keep initial bundle small
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const category = BIKE_CATEGORIES[result.bikeCategory];
  const margin = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const pageBreakIfNeeded = (needed: number) => {
    if (y + needed > 280) {
      doc.addPage();
      y = margin;
    }
  };

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(14, 165, 233); // brand-500
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BikeFit Camera — Fit Report', margin, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date(result.generatedAt).toLocaleDateString()}`, margin, 23);
  doc.text(`Rider: ${result.riderSnapshot.name}`, margin, 29);
  y = 45;

  // ── Rider summary ───────────────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Rider Profile', margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const rp = result.riderSnapshot;
  const profileLines = [
    `Height: ${rp.heightCm} cm  |  Weight: ${rp.weightKg} kg  |  Riding goal: ${rp.ridingGoal}`,
    `Experience: ${rp.experienceLevel}  |  Flexibility: ${rp.fitnessLevel}  |  Terrain: ${rp.preferredTerrain}`,
    `Bike category: ${category.label}`,
  ];
  profileLines.forEach(line => { doc.text(line, margin, y); y += 5; });
  y += 4;

  // ── Frame size ──────────────────────────────────────────────────────────────
  pageBreakIfNeeded(30);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(14, 165, 233);
  doc.text(`Recommended Frame Size: ${result.frameSize}`, margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Size range: ${result.frameSizeRange[0]} – ${result.frameSizeRange[1]}`, margin, y);
  y += 8;

  // ── Dimensions table ────────────────────────────────────────────────────────
  pageBreakIfNeeded(60);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Recommended Dimensions', margin, y);
  y += 6;

  const dimRows: [string, string, string, string][] = [
    ['Saddle Height', `${result.saddleHeightMm} mm`, `±10 mm`, `${Math.round(result.overallConfidence * 100)}%`],
    ['Saddle Setback', `${result.saddleSetbackMm} mm`, '±5 mm', ''],
    ['Saddle-to-Bar Drop', `${result.barDropMm} mm`, '±15 mm', ''],
    ['Handlebar Width', `${result.barWidthMm} mm`, '±10 mm', ''],
    ['Stem Length', `${result.stemLengthMm} mm`, '±15 mm', ''],
    ['Crank Length', `${result.crankLengthMm} mm`, '±2.5 mm', ''],
    ['Target Stack', `${result.stackMm} mm`, '±20 mm', ''],
    ['Target Reach', `${result.reachMm} mm`, '±20 mm', ''],
    ['Target ETT', `${result.ettMm} mm`, '±20 mm', ''],
  ];

  // Table header
  doc.setFillColor(240, 249, 255);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(14, 116, 163);
  doc.text('Dimension', margin + 2, y + 4);
  doc.text('Value', margin + 60, y + 4);
  doc.text('Range', margin + 90, y + 4);
  doc.text('Confidence', margin + 130, y + 4);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  dimRows.forEach(([label, value, range, conf], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 1, contentWidth, 6, 'F');
    }
    doc.setFontSize(9);
    doc.text(label, margin + 2, y + 3.5);
    doc.text(value, margin + 60, y + 3.5);
    doc.text(range, margin + 90, y + 3.5);
    if (conf) doc.text(conf, margin + 130, y + 3.5);
    y += 6;
  });
  y += 4;

  // ── Knee angle ──────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Estimated knee angle at BDC: ${result.kneeAngleAtBDC}° (target 145–155°)`, margin, y);
  y += 8;

  // ── Warnings ────────────────────────────────────────────────────────────────
  if (result.warnings.length > 0) {
    pageBreakIfNeeded(20 + result.warnings.length * 6);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 120, 0);
    doc.text('Warnings & Notes', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    result.warnings.forEach(w => {
      const lines = doc.splitTextToSize(`• ${w}`, contentWidth);
      lines.forEach((line: string) => {
        pageBreakIfNeeded(5);
        doc.text(line, margin, y);
        y += 4.5;
      });
    });
    y += 3;
  }

  // ── Assumptions ─────────────────────────────────────────────────────────────
  if (result.assumptions.length > 0) {
    pageBreakIfNeeded(20 + result.assumptions.length * 5);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Assumptions & Methodology', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    result.assumptions.forEach(a => {
      const lines = doc.splitTextToSize(`→ ${a}`, contentWidth);
      lines.forEach((line: string) => {
        pageBreakIfNeeded(5);
        doc.text(line, margin, y);
        y += 4;
      });
    });
    y += 3;
  }

  // ── Disclaimer ──────────────────────────────────────────────────────────────
  pageBreakIfNeeded(30);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  const disclaimer =
    'DISCLAIMER: This report provides estimates only, not medical or professional bike-fit advice. ' +
    'Final bike selection should be validated by a certified professional fitter, especially if you ' +
    'experience pain, have injuries, or are purchasing an expensive bicycle. Camera measurements are ' +
    'approximate and depend on calibration quality. No video frames were uploaded — all processing ' +
    'occurred locally in your browser.';
  const dLines = doc.splitTextToSize(disclaimer, contentWidth);
  dLines.forEach((line: string) => { doc.text(line, margin, y); y += 4; });

  doc.save(`bikefit-${result.riderSnapshot.name.replace(/\s+/g, '-')}-${result.bikeCategory}.pdf`);
}

// ─── JSON export ──────────────────────────────────────────────────────────────

export function exportToJSON(result: FitResult): void {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `bikefit-${result.riderSnapshot.name.replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Plain-text share summary ─────────────────────────────────────────────────

export function buildShareText(result: FitResult): string {
  const category = BIKE_CATEGORIES[result.bikeCategory];
  const rp = result.riderSnapshot;
  const date = new Date(result.generatedAt).toLocaleDateString();
  const conf = Math.round(result.overallConfidence * 100);

  const lines: string[] = [
    '🚴 BikeFit Camera — Fit Summary',
    `Rider: ${rp.name} | ${rp.heightCm} cm / ${rp.weightKg} kg`,
    `Bike: ${category.label} | Goal: ${rp.ridingGoal} | Date: ${date}`,
    '',
    `📐 Frame Size: ${result.frameSize}  (range: ${result.frameSizeRange[0]}–${result.frameSizeRange[1]})`,
    '',
    '🪑 Saddle',
    `  Height:  ${result.saddleHeightMm} mm`,
    `  Setback: ${result.saddleSetbackMm} mm`,
    '',
    '🎛️ Cockpit',
    `  Bar Drop:  ${result.barDropMm} mm`,
    `  Bar Width: ${result.barWidthMm} mm`,
    `  Stem:      ${result.stemLengthMm} mm`,
    '',
    '⚙️ Drivetrain',
    `  Crank Length: ${result.crankLengthMm} mm`,
    '',
    '🖼️ Frame Geometry',
    `  Stack: ${result.stackMm} mm | Reach: ${result.reachMm} mm | ETT: ${result.ettMm} mm`,
    '',
    `Knee angle at BDC: ${result.kneeAngleAtBDC}° (target 145–155°)`,
    `Overall confidence: ${conf}%`,
  ];

  if (result.warnings.length > 0) {
    lines.push('', '⚠️ Notes:');
    result.warnings.forEach(w => lines.push(`  • ${w}`));
  }

  lines.push(
    '',
    'Generated by BikeFit Camera — all processing done locally in your browser.',
    'Estimates only. Consult a certified fitter before making final adjustments.',
  );

  return lines.join('\n');
}

// ─── Share via Email ───────────────────────────────────────────────────────────

export function shareViaEmail(result: FitResult): void {
  const subject = encodeURIComponent(
    `BikeFit Camera — Fit Results for ${result.riderSnapshot.name}`,
  );
  const body = encodeURIComponent(buildShareText(result));
  window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
}

// ─── Share via WhatsApp ────────────────────────────────────────────────────────

export function shareViaWhatsApp(result: FitResult): void {
  const text = encodeURIComponent(buildShareText(result));
  // wa.me works on mobile (opens app) and desktop (opens web.whatsapp.com)
  window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
}
