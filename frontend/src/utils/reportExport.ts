import type { HealthRecord } from '@/types';
import type { CommunityReport } from '@/services/communityApi';

function escapeHtml(text?: string | number | null): string {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateDocHash(id: string | number): string {
  const seed = `${id}-${Date.now().toString(36)}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `AC-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

const MODERN_REPORT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

  @page {
    size: A4 portrait;
    margin: 10mm 12mm 12mm 12mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0f172a;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 12.5px;
    line-height: 1.5;
  }

  .report-container {
    max-width: 100%;
    margin: 0 auto;
  }

  /* ── Header Top Accent Bar ── */
  .top-accent-bar {
    height: 5px;
    background: linear-gradient(90deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%);
    border-radius: 4px 4px 0 0;
    margin-bottom: 14px;
  }

  /* ── Official Header ── */
  .official-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 14px;
    margin-bottom: 16px;
  }

  .brand-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-logo {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(2, 132, 199, 0.25);
  }

  .brand-text h1 {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .brand-text .sub {
    font-size: 10.5px;
    font-weight: 600;
    color: #0284c7;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 2px;
  }

  .doc-control-box {
    text-align: right;
  }

  .doc-badge {
    display: inline-block;
    background: #0f172a;
    color: #ffffff;
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 5px;
  }

  .doc-meta {
    font-size: 10.5px;
    color: #64748b;
    margin-top: 4px;
    font-weight: 500;
  }

  .doc-meta strong {
    color: #0f172a;
  }

  /* ── Title & Status Ribbon ── */
  .title-ribbon {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #0284c7;
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 14px;
  }

  .title-ribbon h2 {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .title-ribbon .desc {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }

  /* ── KPI Metric Grid ── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 16px;
  }

  .kpi-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    position: relative;
    overflow: hidden;
  }

  .kpi-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #cbd5e1;
  }

  .kpi-card.kpi-primary::before { background: #0284c7; }
  .kpi-card.kpi-danger::before { background: #e11d48; }
  .kpi-card.kpi-warning::before { background: #d97706; }
  .kpi-card.kpi-success::before { background: #059669; }

  .kpi-label {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
  }

  .kpi-value {
    font-size: 19px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 3px;
    line-height: 1.2;
  }

  .kpi-sub {
    font-size: 10px;
    color: #94a3b8;
    margin-top: 2px;
  }

  /* ── Section Card Layout ── */
  .section-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    padding: 12px 14px;
    margin-bottom: 14px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    page-break-inside: avoid;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #334155;
    margin-bottom: 10px;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 6px;
  }

  .section-header svg {
    color: #0284c7;
  }

  /* ── Info Grid ── */
  .info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    font-size: 11.5px;
  }

  .info-cell {
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 6px;
    padding: 8px 10px;
  }

  .info-lbl {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 2px;
  }

  .info-val {
    font-weight: 700;
    color: #0f172a;
  }

  /* ── Symptom Chips ── */
  .symptom-chip-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .symptom-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #fff1f2;
    color: #9f1239;
    border: 1px solid #ffe4e6;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
  }

  .symptom-chip .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #e11d48;
  }

  .symptom-chip.fever { background: #fef2f2; color: #991b1b; border-color: #fee2e2; }
  .symptom-chip.fever .dot { background: #dc2626; }

  .symptom-chip.diarrhea { background: #fff1f2; color: #9f1239; border-color: #ffe4e6; }
  .symptom-chip.diarrhea .dot { background: #e11d48; }

  .symptom-chip.vomiting { background: #fffbeb; color: #92400e; border-color: #fef3c7; }
  .symptom-chip.vomiting .dot { background: #d97706; }

  .symptom-chip.pain { background: #fff7ed; color: #9a3412; border-color: #ffedd5; }
  .symptom-chip.pain .dot { background: #ea580c; }

  .symptom-chip.dehydration { background: #f0f9ff; color: #0369a1; border-color: #e0f2fe; }
  .symptom-chip.dehydration .dot { background: #0284c7; }

  .symptom-chip.neutral { background: #f8fafc; color: #334155; border-color: #e2e8f0; }
  .symptom-chip.neutral .dot { background: #64748b; }

  /* ── USER OBSERVATION DOSSIER (FEATURED BLOCK) ── */
  .user-narrative-box {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px solid #cbd5e1;
    border-left: 4px solid #0284c7;
    border-radius: 8px;
    padding: 12px 16px;
    position: relative;
    margin-bottom: 14px;
    page-break-inside: avoid;
  }

  .quote-watermark {
    position: absolute;
    right: 14px;
    top: 6px;
    font-size: 54px;
    font-family: Georgia, serif;
    color: rgba(2, 132, 199, 0.12);
    line-height: 1;
    pointer-events: none;
  }

  .user-narrative-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #0369a1;
    margin-bottom: 6px;
  }

  .user-narrative-content {
    font-size: 13px;
    font-weight: 500;
    color: #1e293b;
    line-height: 1.6;
    font-style: italic;
    white-space: pre-wrap;
    position: relative;
    z-index: 1;
  }

  .user-narrative-footer {
    font-size: 10px;
    color: #64748b;
    margin-top: 6px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* ── Status Badges ── */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: 9999px;
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
  .badge-warning { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
  .badge-danger { background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; }
  .badge-info { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }

  /* ── Water Environment Box ── */
  .env-card {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    font-size: 11.5px;
    page-break-inside: avoid;
  }

  .env-item .env-lbl {
    font-size: 9.5px;
    font-weight: 800;
    text-transform: uppercase;
    color: #166534;
    margin-bottom: 2px;
  }

  .env-item .env-val {
    font-weight: 700;
    color: #14532d;
  }

  /* ── Advisory Protocol Box ── */
  .advisory-box {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 16px;
    page-break-inside: avoid;
  }

  .advisory-title {
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
    color: #1e40af;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .advisory-list {
    margin: 0;
    padding-left: 18px;
    font-size: 11px;
    color: #1e3a8a;
    line-height: 1.5;
  }

  /* ── Digital Seal & Authentication Footer ── */
  .auth-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1.5px solid #e2e8f0;
    padding-top: 12px;
    margin-top: 18px;
    page-break-inside: avoid;
  }

  .compliance-notes {
    font-size: 10px;
    color: #64748b;
    max-width: 65%;
    line-height: 1.45;
  }

  .compliance-notes strong {
    color: #334155;
  }

  .seal-container {
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: right;
  }

  .seal-text {
    font-size: 9px;
    color: #64748b;
    line-height: 1.35;
  }

  .seal-text .hash {
    font-family: monospace;
    font-weight: 700;
    color: #0f172a;
    font-size: 10px;
  }

  /* ── Multi-record Table Styling ── */
  table.modern-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 16px;
    font-size: 11px;
  }

  table.modern-table th {
    background: #f8fafc;
    padding: 8px 10px;
    font-weight: 800;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
    text-align: left;
  }

  table.modern-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
    color: #1e293b;
  }

  table.modern-table tr:last-child td {
    border-bottom: none;
  }

  table.modern-table tr:nth-child(even) td {
    background: #fbfcfd;
  }

  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
`;

function getSymptomBadgeClass(symptom: string): string {
  const s = symptom.toLowerCase();
  if (s.includes('fever')) return 'fever';
  if (s.includes('diarrhea')) return 'diarrhea';
  if (s.includes('vomit')) return 'vomiting';
  if (s.includes('pain') || s.includes('abdominal')) return 'pain';
  if (s.includes('dehydration')) return 'dehydration';
  return 'neutral';
}

/**
 * Downloads / Prints a single Citizen-submitted report as a publication-grade PDF dossier.
 * Prominently features the exact user-entered details in an executive document format.
 */
export function printSingleCommunityReport(report: CommunityReport) {
  if (!report) {
    alert('No report selected for PDF download.');
    return;
  }

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const token = `CR-${String(report.id).padStart(4, '0')}`;
  const docHash = generateDocHash(report.id);

  const statusLabel =
    report.status === 'reviewed'
      ? 'Verified / Reviewed'
      : report.status === 'under_review'
      ? 'Under Review'
      : 'Submitted (Active)';

  const statusBadgeClass =
    report.status === 'reviewed'
      ? 'badge-success'
      : report.status === 'under_review'
      ? 'badge-warning'
      : 'badge-info';

  const symptomsList = report.symptoms || [];
  const symptomsHtml =
    symptomsList.length > 0
      ? symptomsList
          .map((s) => {
            const cls = getSymptomBadgeClass(s);
            return `<span class="symptom-chip ${cls}"><span class="dot"></span>${escapeHtml(s)}</span>`;
          })
          .join(' ')
      : '<span style="color: #94a3b8; font-style: italic;">No specific symptoms checked</span>';

  const reportHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>AquaCare Health Incident Dossier - ${token}</title>
        <meta charset="utf-8" />
        <style>${MODERN_REPORT_CSS}</style>
      </head>
      <body>
        <div class="report-container">
          <!-- Top Gradient Accent Bar -->
          <div class="top-accent-bar"></div>

          <!-- Official Executive Header -->
          <div class="official-header">
            <div class="brand-group">
              <div class="brand-logo">
                <!-- Drop & Cross SVG Icon -->
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.69L6.5 8.19C4.1 10.6 4.1 14.5 6.5 16.9C8.9 19.3 12.8 19.3 15.2 16.9C17.6 14.5 17.6 10.6 15.2 8.19L12 2.69Z" fill="white" fill-opacity="0.95"/>
                  <path d="M12 9V15M9 12H15" stroke="#0284c7" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="brand-text">
                <h1>AquaCare Surveillance Network</h1>
                <div class="sub">CPCB & Jal Jeevan Public Health Monitoring</div>
              </div>
            </div>

            <div class="doc-control-box">
              <div class="doc-badge">Official Incident Dossier</div>
              <div class="doc-meta">
                Ref Token: <strong>${token}</strong> · Security: <strong>${docHash}</strong>
              </div>
              <div class="doc-meta" style="font-size: 10px;">
                Generated: <strong>${dateStr}</strong>
              </div>
            </div>
          </div>

          <!-- Incident Title Ribbon -->
          <div class="title-ribbon">
            <div>
              <h2>Citizen Health Contamination & Case Dossier</h2>
              <div class="desc">
                Public health epidemiological record logged in <strong>${escapeHtml(report.villageName)}</strong> jurisdiction.
              </div>
            </div>
            <div>
              <span class="badge ${statusBadgeClass}">● ${statusLabel}</span>
            </div>
          </div>

          <!-- KPI Executive Metrics (4 Blocks) -->
          <div class="kpi-grid">
            <div class="kpi-card kpi-danger">
              <div class="kpi-label">People Affected</div>
              <div class="kpi-value" style="color: #e11d48;">
                ${escapeHtml(report.peopleAffected)}
              </div>
              <div class="kpi-sub">${escapeHtml(report.peopleAffected) === '1' ? 'Individual' : 'Illness Cluster'}</div>
            </div>

            <div class="kpi-card kpi-primary">
              <div class="kpi-label">Age Group Impacted</div>
              <div class="kpi-value" style="font-size: 15px; color: #0284c7; padding-top: 2px;">
                ${escapeHtml(report.ageGroup || 'All Ages')}
              </div>
              <div class="kpi-sub">Target Demographics</div>
            </div>

            <div class="kpi-card kpi-warning">
              <div class="kpi-label">Filing Date</div>
              <div class="kpi-value" style="font-size: 15px; color: #b45309; padding-top: 2px;">
                ${escapeHtml(report.date)}
              </div>
              <div class="kpi-sub">Submission Timestamp</div>
            </div>

            <div class="kpi-card kpi-success">
              <div class="kpi-label">Report Status</div>
              <div class="kpi-value" style="font-size: 14px; color: #15803d; padding-top: 3px;">
                ${escapeHtml(statusLabel)}
              </div>
              <div class="kpi-sub">Field Priority</div>
            </div>
          </div>

          <!-- Location & Reporter Details Card -->
          <div class="section-card">
            <div class="section-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Location & Citizen Reporter Identity
            </div>
            <div class="info-grid">
              <div class="info-cell">
                <div class="info-lbl">Jurisdiction Village</div>
                <div class="info-val">${escapeHtml(report.villageName)}</div>
              </div>
              <div class="info-cell">
                <div class="info-lbl">Citizen Reporter</div>
                <div class="info-val">${escapeHtml(report.reporterName || 'Registered Community Citizen')}</div>
              </div>
              <div class="info-cell">
                <div class="info-lbl">Contact Phone Number</div>
                <div class="info-val">${escapeHtml(report.reporterPhone || 'Verified Account on File')}</div>
              </div>
            </div>
          </div>

          <!-- Observed Clinical Symptoms -->
          <div class="section-card">
            <div class="section-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Observed Clinical Symptoms (Citizen-Reported)
            </div>
            <div class="symptom-chip-grid">
              ${symptomsHtml}
            </div>
          </div>

          <!-- Water Source & Environmental Exposure -->
          <div class="env-card">
            <div class="env-item">
              <div class="env-lbl">💧 Suspected Water Point</div>
              <div class="env-val">${escapeHtml(report.waterSourceName || 'Local Community Water Supply')}</div>
            </div>
            <div class="env-item">
              <div class="env-lbl">⚠️ Physical Water Anomaly Observed</div>
              <div class="env-val">${escapeHtml(report.waterIssueObserved || 'Turbidity / Illness Cluster Associated')}</div>
            </div>
          </div>

          <!-- USER-ENTERED DETAIL: Exact Written Narrative & Observations -->
          <div class="user-narrative-box">
            <div class="quote-watermark">“</div>
            <div class="user-narrative-header">
              <span>📝</span> Citizen's Written Observations & Narrative (Direct User Input)
            </div>
            <div class="user-narrative-content">
              ${report.notes ? `"${escapeHtml(report.notes)}"` : '<em>"No additional descriptive remarks provided by citizen at submission."</em>'}
            </div>
            <div class="user-narrative-footer">
              <span>✓ Logged verbatim by citizen reporter for epidemiological assessment</span>
            </div>
          </div>

          <!-- Health Authority Review (if available) -->
          ${
            report.reviewNotes
              ? `
            <div class="section-card" style="border-left: 4px solid #059669; background: #f0fdf4;">
              <div class="section-header" style="color: #047857;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Primary Health Centre (PHC) Field Review
              </div>
              <div style="font-size: 12px; color: #064e3b; font-weight: 500; line-height: 1.55;">
                ${escapeHtml(report.reviewNotes)}
              </div>
              ${report.reviewedAt ? `<div style="font-size: 10px; color: #059669; margin-top: 4px; font-weight: 600;">Reviewed on: ${escapeHtml(report.reviewedAt)}</div>` : ''}
            </div>
          `
              : ''
          }

          <!-- Public Health Precautionary Protocol -->
          <div class="advisory-box">
            <div class="advisory-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Mandated Public Health Advisory Guidelines
            </div>
            <ul class="advisory-list">
              <li><strong>Safe Water:</strong> Vigorously boil all household drinking and cooking water for at least 10 minutes.</li>
              <li><strong>Hydration:</strong> Administer Oral Rehydration Salts (ORS) and clean fluids immediately upon symptoms onset.</li>
              <li><strong>Escalation:</strong> If vomiting or diarrhea exceeds 12 hours, immediately reach the nearest CHC or alert your ASHA worker.</li>
            </ul>
          </div>

          <!-- Official Digital Seal & Authentication Footer -->
          <div class="auth-footer">
            <div class="compliance-notes">
              <strong>Official Public Health Surveillance Record</strong> · AquaCare Early Warning Node<br/>
              Transmitted to District Surveillance Officer (IDSP) & PHC network. Valid for public health intervention under CPCB guidelines.
            </div>

            <div class="seal-container">
              <div class="seal-text">
                <div class="hash">${docHash}</div>
                <div>DIGITALLY CERTIFIED</div>
                <div>STATE HEALTH DEPT</div>
              </div>
              <!-- SVG Circular Official Stamp -->
              <svg width="56" height="56" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="46" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="5 3"/>
                <circle cx="50" cy="50" r="39" stroke="#0369a1" stroke-width="1.5"/>
                <path d="M50 24L34 32V52C34 64 41 74 50 77C59 74 66 64 66 52V32L50 24Z" fill="#0284c7" fill-opacity="0.12" stroke="#0284c7" stroke-width="2"/>
                <path d="M43 51L47 55L57 45" stroke="#0284c7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(reportHTML);
    printWindow.document.close();
  }
}

/**
 * Downloads / Prints a consolidated dossier of Citizen-submitted reports.
 * Formats every report card with all user-entered details (notes, symptoms, people, age, water).
 */
export function printCommunityReportsList(
  reports: CommunityReport[],
  title = 'Citizen Health Incident & Surveillance Dossier'
) {
  if (!reports || reports.length === 0) {
    alert('No citizen reports available to download.');
    return;
  }

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const totalReports = reports.length;
  const totalAffected = reports.reduce((acc, r) => {
    const val = parseInt(r.peopleAffected, 10);
    return acc + (isNaN(val) ? 1 : val);
  }, 0);
  const reviewedCount = reports.filter((r) => r.status === 'reviewed').length;
  const pendingCount = reports.filter((r) => r.status === 'submitted' || r.status === 'under_review').length;
  const masterHash = generateDocHash(reports[0]?.id || 'BATCH');

  const cardsHtml = reports
    .map((r, i) => {
      const token = `CR-${String(r.id).padStart(4, '0')}`;
      const statusLabel =
        r.status === 'reviewed'
          ? 'Reviewed'
          : r.status === 'under_review'
          ? 'Under Review'
          : 'Submitted';

      const statusClass =
        r.status === 'reviewed'
          ? 'badge-success'
          : r.status === 'under_review'
          ? 'badge-warning'
          : 'badge-info';

      const symptomsHtml = (r.symptoms || [])
        .map((s) => {
          const cls = getSymptomBadgeClass(s);
          return `<span class="symptom-chip ${cls}" style="font-size: 10px; padding: 2px 8px;"><span class="dot"></span>${escapeHtml(s)}</span>`;
        })
        .join(' ');

      return `
      <div class="section-card" style="margin-bottom: 12px; border: 1px solid #cbd5e1; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 800; color: #0284c7; font-size: 13px;">${token}</span>
            <span style="font-weight: 800; color: #0f172a; font-size: 13px;">${escapeHtml(r.villageName)}</span>
            <span style="color: #64748b; font-size: 11px;">· Date: ${escapeHtml(r.date)}</span>
          </div>
          <div>
            <span class="badge ${statusClass}">● ${statusLabel}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 11px; margin-bottom: 8px;">
          <div style="background: #f8fafc; padding: 6px 8px; border-radius: 6px;">
            <span style="color: #64748b; font-size: 9.5px; text-transform: uppercase; font-weight: 700; display: block;">People Affected:</span>
            <strong style="color: #e11d48; font-size: 12px;">${escapeHtml(r.peopleAffected)}</strong>
          </div>
          <div style="background: #f8fafc; padding: 6px 8px; border-radius: 6px;">
            <span style="color: #64748b; font-size: 9.5px; text-transform: uppercase; font-weight: 700; display: block;">Age Group:</span>
            <strong style="color: #0f172a;">${escapeHtml(r.ageGroup || 'All Ages')}</strong>
          </div>
          <div style="background: #f8fafc; padding: 6px 8px; border-radius: 6px;">
            <span style="color: #64748b; font-size: 9.5px; text-transform: uppercase; font-weight: 700; display: block;">Reporter:</span>
            <strong style="color: #0f172a;">${escapeHtml(r.reporterName || 'Citizen')}</strong>
          </div>
          <div style="background: #f8fafc; padding: 6px 8px; border-radius: 6px;">
            <span style="color: #64748b; font-size: 9.5px; text-transform: uppercase; font-weight: 700; display: block;">Water Source:</span>
            <strong style="color: #0369a1;">${escapeHtml(r.waterSourceName || 'Community')}</strong>
          </div>
        </div>

        <div style="margin-bottom: 8px;">
          <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">
            Reported Symptoms:
          </div>
          <div class="symptom-chip-grid">${symptomsHtml || '<span style="color: #94a3b8; font-size: 11px;">None logged</span>'}</div>
        </div>

        <!-- USER-ENTERED OBSERVATION / DESCRIPTION -->
        <div class="user-narrative-box" style="padding: 8px 12px; margin-bottom: 0;">
          <div class="user-narrative-header" style="font-size: 9.5px; margin-bottom: 3px;">
            <span>📝</span> Citizen's Written Observations (Direct User Input):
          </div>
          <div class="user-narrative-content" style="font-size: 12px;">
            ${r.notes ? `"${escapeHtml(r.notes)}"` : '<em>"No additional remarks provided."</em>'}
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  const reportHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - ${dateStr}</title>
        <meta charset="utf-8" />
        <style>${MODERN_REPORT_CSS}</style>
      </head>
      <body>
        <div class="report-container">
          <div class="top-accent-bar"></div>

          <div class="official-header">
            <div class="brand-group">
              <div class="brand-logo">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.69L6.5 8.19C4.1 10.6 4.1 14.5 6.5 16.9C8.9 19.3 12.8 19.3 15.2 16.9C17.6 14.5 17.6 10.6 15.2 8.19L12 2.69Z" fill="white" fill-opacity="0.95"/>
                  <path d="M12 9V15M9 12H15" stroke="#0284c7" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="brand-text">
                <h1>AquaCare Surveillance Network</h1>
                <div class="sub">National Public Health Registry · Consolidated Dossier</div>
              </div>
            </div>

            <div class="doc-control-box">
              <div class="doc-badge">Consolidated Report (PDF)</div>
              <div class="doc-meta">
                Batch Ref: <strong>${masterHash}</strong> · Date: <strong>${dateStr}</strong>
              </div>
            </div>
          </div>

          <!-- KPI Executive Metrics (4 Cards) -->
          <div class="kpi-grid">
            <div class="kpi-card kpi-primary">
              <div class="kpi-label">Total Submissions</div>
              <div class="kpi-value" style="color: #0284c7;">${totalReports}</div>
              <div class="kpi-sub">Citizen Cases Logged</div>
            </div>

            <div class="kpi-card kpi-danger">
              <div class="kpi-label">Estimated Affected</div>
              <div class="kpi-value" style="color: #e11d48;">${totalAffected}</div>
              <div class="kpi-sub">Total Impacted Individuals</div>
            </div>

            <div class="kpi-card kpi-warning">
              <div class="kpi-label">Pending Review</div>
              <div class="kpi-value" style="color: #d97706;">${pendingCount}</div>
              <div class="kpi-sub">Awaiting PHC Follow-up</div>
            </div>

            <div class="kpi-card kpi-success">
              <div class="kpi-label">Verified & Treated</div>
              <div class="kpi-value" style="color: #059669;">${reviewedCount}</div>
              <div class="kpi-sub">Action Confirmed</div>
            </div>
          </div>

          <div style="margin-bottom: 12px; font-size: 11.5px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em;">
            Citizen Field Submissions & Case Details:
          </div>

          <div>
            ${cardsHtml}
          </div>

          <div class="auth-footer">
            <div class="compliance-notes">
              AquaCare Surveillance & Early Warning Network · Jal Jeevan Mission Public Health Alignment<br/>
              Confidential epidemiological field archive. For authorized public health personnel only.
            </div>

            <div class="seal-container">
              <div class="seal-text">
                <div class="hash">${masterHash}</div>
                <div>DIGITALLY ARCHIVED</div>
              </div>
              <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="46" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="5 3"/>
                <path d="M50 24L34 32V52C34 64 41 74 50 77C59 74 66 64 66 52V32L50 24Z" fill="#0284c7" fill-opacity="0.12" stroke="#0284c7" stroke-width="2"/>
                <path d="M43 51L47 55L57 45" stroke="#0284c7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(reportHTML);
    printWindow.document.close();
  }
}

/**
 * Downloads / Prints clinical surveillance records as an executive Epidemiological Report.
 * Displays case symptoms, disease categorization, patient treatment, and clinical observations.
 */
export function printHealthRecordsReport(
  records: HealthRecord[],
  reportTitle = 'Health Surveillance Epidemiological Report',
  subTitle = 'Official Water-Borne Disease Case Monitoring Summary'
) {
  if (!records || records.length === 0) {
    alert('No health records found to generate report.');
    return;
  }

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const totalCases = records.reduce((sum, r) => sum + (r.suspectedCases || 1), 0);
  const criticalCount = records.filter((r) => r.riskLevel === 'critical').length;
  const highCount = records.filter((r) => r.riskLevel === 'high').length;
  const mediumCount = records.filter((r) => r.riskLevel === 'medium').length;
  const safeCount = records.filter((r) => r.riskLevel === 'low').length;
  const masterHash = generateDocHash(records[0]?.id || 'SURVEILLANCE');

  const tableRows = records
    .map(
      (r, i) => `
    <tr>
      <td style="font-weight: 700; color: #0f172a;">${escapeHtml(r.villageName || 'N/A')}</td>
      <td style="color: #64748b;">${escapeHtml(r.reportingDate || 'N/A')}</td>
      <td style="font-weight: 700; color: #0369a1;">${escapeHtml(r.diseaseCategory || 'Other')}</td>
      <td style="font-weight: 800; text-align: center; color: #0f172a; font-size: 12px;">${r.suspectedCases || 1}</td>
      <td>
        ${
          (r.symptoms || [])
            .map((s) => {
              const cls = getSymptomBadgeClass(s);
              return `<span class="symptom-chip ${cls}" style="font-size: 9.5px; padding: 2px 7px;"><span class="dot"></span>${escapeHtml(s)}</span>`;
            })
            .join(' ') || '<span style="color:#94a3b8;">None noted</span>'
        }
      </td>
      <td style="color: #475569;">${escapeHtml(r.ageGroup || '19-40')}</td>
      <td>
        <span class="badge ${
          r.riskLevel === 'critical'
            ? 'badge-danger'
            : r.riskLevel === 'high'
            ? 'badge-warning'
            : r.riskLevel === 'medium'
            ? 'badge-warning'
            : 'badge-success'
        }">
          ● ${r.riskLevel === 'low' ? 'Safe' : r.riskLevel}
        </span>
      </td>
      <td style="color: #475569; font-size: 10.5px; font-weight: 600;">
        ${escapeHtml(r.reportedBy || 'Staff Worker')}
      </td>
    </tr>
    ${
      r.notes || r.treatment
        ? `
      <tr style="background: #fffbeb;">
        <td colspan="8" style="padding: 6px 12px; font-size: 11px; border-bottom: 2px solid #fed7aa;">
          ${r.notes ? `<strong>Notes:</strong> <span style="font-style: italic; color: #9a3412;">"${escapeHtml(r.notes)}"</span> &nbsp;|&nbsp; ` : ''}
          ${r.treatment ? `<strong>Treatment:</strong> <span style="color: #166534; font-weight: 600;">${escapeHtml(r.treatment)}</span>` : ''}
        </td>
      </tr>
    `
        : ''
    }
  `
    )
    .join('');

  const reportHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${reportTitle} - ${dateStr}</title>
        <meta charset="utf-8" />
        <style>${MODERN_REPORT_CSS}</style>
      </head>
      <body>
        <div class="report-container">
          <div class="top-accent-bar"></div>

          <div class="official-header">
            <div class="brand-group">
              <div class="brand-logo">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.69L6.5 8.19C4.1 10.6 4.1 14.5 6.5 16.9C8.9 19.3 12.8 19.3 15.2 16.9C17.6 14.5 17.6 10.6 15.2 8.19L12 2.69Z" fill="white" fill-opacity="0.95"/>
                  <path d="M12 9V15M9 12H15" stroke="#0284c7" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="brand-text">
                <h1>AquaCare Surveillance Network</h1>
                <div class="sub">${reportTitle} · ${subTitle}</div>
              </div>
            </div>

            <div class="doc-control-box">
              <div class="doc-badge">Epidemiological Dossier</div>
              <div class="doc-meta">
                Archive ID: <strong>${masterHash}</strong> · Date: <strong>${dateStr}</strong>
              </div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card kpi-primary">
              <div class="kpi-label">Total Surveillance Records</div>
              <div class="kpi-value" style="color: #0284c7;">${records.length}</div>
              <div class="kpi-sub">Monitored Nodes</div>
            </div>

            <div class="kpi-card kpi-danger">
              <div class="kpi-label">Suspected Cases</div>
              <div class="kpi-value" style="color: #e11d48;">${totalCases}</div>
              <div class="kpi-sub">Reported Patients</div>
            </div>

            <div class="kpi-card kpi-warning">
              <div class="kpi-label">Critical / High Risk</div>
              <div class="kpi-value" style="color: #ea580c;">${criticalCount + highCount}</div>
              <div class="kpi-sub">High Priority Response</div>
            </div>

            <div class="kpi-card kpi-success">
              <div class="kpi-label">Safe / Baseline</div>
              <div class="kpi-value" style="color: #059669;">${safeCount + mediumCount}</div>
              <div class="kpi-sub">Stable Risk Score</div>
            </div>
          </div>

          <table class="modern-table">
            <thead>
              <tr>
                <th>Village</th>
                <th>Date</th>
                <th>Disease</th>
                <th style="text-align: center;">Cases</th>
                <th>Symptoms</th>
                <th>Age Group</th>
                <th>Risk Tier</th>
                <th>Reported By</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="auth-footer">
            <div class="compliance-notes">
              AquaCare Surveillance & Early Warning Network · Jal Jeevan Mission Alignment<br/>
              National Health Systems Resource Centre (NHSRC) · Confidential Public Health Surveillance Dossier.
            </div>

            <div class="seal-container">
              <div class="seal-text">
                <div class="hash">${masterHash}</div>
                <div>PUBLIC HEALTH ARCHIVE</div>
              </div>
              <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="46" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="5 3"/>
                <path d="M50 24L34 32V52C34 64 41 74 50 77C59 74 66 64 66 52V32L50 24Z" fill="#0284c7" fill-opacity="0.12" stroke="#0284c7" stroke-width="2"/>
                <path d="M43 51L47 55L57 45" stroke="#0284c7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(reportHTML);
    printWindow.document.close();
  }
}
