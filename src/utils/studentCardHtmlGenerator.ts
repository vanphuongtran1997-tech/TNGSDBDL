import { Student, ClassRoom } from '../types';
import { escapeHtml, sanitizeUrl } from './security';

export interface CardPrintOptions {
  mode: 'a4_sheet' | 'cr80_single';
  orientation: 'landscape' | 'portrait';
  sides: 'front_only' | 'both_sides' | 'back_only';
  theme: 'classic' | 'modern' | 'eco';
  showCutGuides: boolean;
  showParentPhone: boolean;
  showLanyardHole: boolean;
  academicYear?: string;
}

export function generateCardPrintHtml(
  selectedStudents: Student[],
  classes: ClassRoom[],
  qrMap: Record<string, string>,
  options: CardPrintOptions
): string {
  const getClassName = (cid: string) => {
    return classes.find(c => c.id === cid)?.name || cid;
  };

  const academicYear = options.academicYear || '2026 - 2027';
  const isLandscape = options.orientation === 'landscape';
  const isCR80 = options.mode === 'cr80_single';

  // Physical ATM card dimensions: 85.6mm x 54mm (or 54mm x 85.6mm)
  const cardWidthMm = isLandscape ? '85.6mm' : '54mm';
  const cardHeightMm = isLandscape ? '54mm' : '85.6mm';

  // Build card HTML items
  const cardHtmlList: string[] = [];

  for (const st of selectedStudents) {
    const rawQr = qrMap[st.id] || '';
    const safeQrUrl = sanitizeUrl(rawQr);
    const rawClass = getClassName(st.classId);
    const dobFormatted = st.dob ? new Date(st.dob).toLocaleDateString('vi-VN') : '---';

    // XSS defense: HTML-escape all user-controlled text strings
    const safeId = escapeHtml(st.id);
    const safeFullName = escapeHtml(st.fullName);
    const safeHolyName = escapeHtml(st.holyName);
    const safeClassName = escapeHtml(rawClass);
    const safeDobFormatted = escapeHtml(dobFormatted);
    const safeSubParish = escapeHtml(st.subParish || 'Don Bosco');
    const safeParentName = escapeHtml(st.parentName || 'PH');
    const safeParentPhone = escapeHtml(st.parentPhone || '---');
    const safeAcademicYear = escapeHtml(academicYear);
    const safeAvatarUrl = sanitizeUrl(st.avatarUrl);

    // FRONT CARD HTML
    const frontCardHtml = `
      <div class="atm-card ${options.theme} ${options.orientation} ${options.showCutGuides ? 'cut-guides' : ''}" style="width: ${cardWidthMm}; height: ${cardHeightMm};">
        ${options.showLanyardHole ? '<div class="lanyard-hole"></div>' : ''}
        
        <!-- Card Header -->
        <div class="card-header">
          <div class="header-logo-row">
            <span class="cross-icon">✝</span>
            <div class="header-text-block">
              <div class="parish-name">GIÁO SỞ DON BOSCO ĐÀ LẠT</div>
              <div class="sub-header">BAN GIÁO LÝ THIẾU NHI</div>
            </div>
            <div class="academic-year-badge">${safeAcademicYear}</div>
          </div>
          <div class="card-title-bar">
            <span class="card-title">THẺ HỌC SINH GIÁO LÝ</span>
          </div>
        </div>

        <!-- Card Body -->
        <div class="card-body">
          ${isLandscape ? `
            <!-- LANDSCAPE BODY: 3 columns (Photo, Info, QR) -->
            <div class="landscape-layout">
              <!-- Column 1: Photo & ID -->
              <div class="col-photo">
                <div class="photo-box">
                  ${safeAvatarUrl ? `
                    <img src="${safeAvatarUrl}" alt="${safeFullName}" class="photo-img" />
                  ` : `
                    <div class="photo-placeholder">
                      <div class="avatar-initial">${safeHolyName.charAt(0) || '✝'}</div>
                      <div class="avatar-tag">ẢNH 3x4</div>
                    </div>
                  `}
                </div>
                <div class="student-id-tag">${safeId}</div>
              </div>

              <!-- Column 2: Student Details -->
              <div class="col-info">
                <div class="holy-name">${safeHolyName}</div>
                <div class="full-name">${safeFullName}</div>
                
                <div class="info-grid">
                  <div class="info-row"><span class="lbl">Lớp:</span> <strong class="cls-name">${safeClassName}</strong></div>
                  <div class="info-row"><span class="lbl">Sinh:</span> <span>${safeDobFormatted}</span></div>
                  <div class="info-row"><span class="lbl">Giáo họ:</span> <span>${safeSubParish}</span></div>
                  ${options.showParentPhone ? `
                    <div class="info-row parent-row"><span class="lbl">PH:</span> <span>${safeParentName} (${safeParentPhone})</span></div>
                  ` : ''}
                </div>
              </div>

              <!-- Column 3: High Contrast QR Code -->
              <div class="col-qr">
                <div class="qr-container">
                  ${safeQrUrl ? `<img src="${safeQrUrl}" alt="QR ${safeId}" class="qr-image" />` : '<div class="qr-loading">Đang nạp QR...</div>'}
                </div>
                <div class="qr-caption">QUÉT ĐIỂM DANH</div>
              </div>
            </div>
          ` : `
            <!-- PORTRAIT BODY: Top photo+info, bottom QR -->
            <div class="portrait-layout">
              <div class="portrait-top">
                <div class="photo-box-portrait">
                  ${safeAvatarUrl ? `
                    <img src="${safeAvatarUrl}" alt="${safeFullName}" class="photo-img" />
                  ` : `
                    <div class="photo-placeholder">
                      <div class="avatar-initial">${safeHolyName.charAt(0) || '✝'}</div>
                      <div class="avatar-tag">ẢNH 3x4</div>
                    </div>
                  `}
                </div>
                <div class="portrait-details">
                  <div class="holy-name">${safeHolyName}</div>
                  <div class="full-name">${safeFullName}</div>
                  <div class="info-row"><span class="lbl">Lớp:</span> <strong class="cls-name">${safeClassName}</strong></div>
                  <div class="info-row"><span class="lbl">Mã:</span> <strong class="id-text">${safeId}</strong></div>
                </div>
              </div>

              <div class="portrait-divider"></div>

              <div class="portrait-bottom">
                <div class="portrait-qr-wrap">
                  ${safeQrUrl ? `<img src="${safeQrUrl}" alt="QR ${safeId}" class="qr-image-portrait" />` : '<div class="qr-loading">Đang nạp QR...</div>'}
                  <div class="qr-caption">QUÉT ĐIỂM DANH CHUYÊN CẦN</div>
                </div>
                <div class="portrait-footer-info">
                  <span>${safeSubParish}</span>
                  ${options.showParentPhone ? ` • <span>${safeParentPhone}</span>` : ''}
                </div>
              </div>
            </div>
          `}
        </div>

        <!-- Card Footer -->
        <div class="card-footer">
          <span class="motto">✝ Yêu thương &amp; Phục vụ</span>
          <span class="system-tag">Don Bosco Đà Lạt</span>
        </div>
      </div>
    `;

    // BACK CARD HTML
    const backCardHtml = `
      <div class="atm-card back-card ${options.theme} ${options.orientation} ${options.showCutGuides ? 'cut-guides' : ''}" style="width: ${cardWidthMm}; height: ${cardHeightMm};">
        <div class="card-header back-header">
          <div class="header-logo-row">
            <span class="cross-icon">✝</span>
            <div class="header-text-block">
              <div class="parish-name">GIÁO SỞ DON BOSCO ĐÀ LẠT</div>
              <div class="sub-header">NỘI QUY &amp; HƯỚNG DẪN SỬ DỤNG THẺ</div>
            </div>
          </div>
        </div>

        <div class="card-body back-body">
          <ol class="rules-list">
            <li><strong>1. Đeo thẻ:</strong> Thiếu nhi luôn mang theo và đeo thẻ khi tham dự Thánh lễ &amp; các giờ học giáo lý.</li>
            <li><strong>2. Điểm danh:</strong> Quẹt mã QR tại cửa nhà thờ hoặc lớp học để hệ thống tự động ghi nhận chuyên cần.</li>
            <li><strong>3. Bảo quản:</strong> Giữ gìn thẻ phẳng phiu, sạch sẽ; không uốn cong, dán đè hoặc làm trầy xước mã QR.</li>
            <li><strong>4. Thất lạc:</strong> Nếu làm mất hoặc hỏng thẻ, báo ngay cho GLV Chủ nhiệm để được cấp lại.</li>
          </ol>
        </div>

        <div class="card-footer back-footer">
          <div class="back-contact">
            <div>Ban Giáo Lý Thiếu Nhi • 40 Bùi Thị Xuân, P.2, TP. Đà Lạt</div>
            <div class="student-ref-id">Mã thẻ: <strong>${safeId}</strong> - ${safeHolyName} ${safeFullName}</div>
          </div>
        </div>
      </div>
    `;

    if (options.sides === 'front_only') {
      cardHtmlList.push(frontCardHtml);
    } else if (options.sides === 'back_only') {
      cardHtmlList.push(backCardHtml);
    } else {
      // Both sides
      cardHtmlList.push(frontCardHtml);
      cardHtmlList.push(backCardHtml);
    }
  }

  // Chunking for A4 page layout (8 cards per page in landscape, or 10 in compact)
  const cardsPerPage = isLandscape ? 8 : 8;
  const pages: string[] = [];

  if (isCR80) {
    // CR80: Every single card is 1 page
    for (const card of cardHtmlList) {
      pages.push(`
        <div class="cr80-page">
          ${card}
        </div>
      `);
    }
  } else {
    // A4 layout: group into batches
    for (let i = 0; i < cardHtmlList.length; i += cardsPerPage) {
      const pageCards = cardHtmlList.slice(i, i + cardsPerPage);
      pages.push(`
        <div class="a4-page">
          <div class="a4-grid ${options.orientation}">
            ${pageCards.join('')}
          </div>
          <div class="page-footer-note">
            Trang ${Math.floor(i / cardsPerPage) + 1} / ${Math.ceil(cardHtmlList.length / cardsPerPage)} • Kích thước chuẩn thẻ ATM (85.6mm × 54mm) • Ban Giáo Lý Don Bosco Đà Lạt
          </div>
        </div>
      `);
    }
  }

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>In Thẻ Học Sinh & Mã QR - Kích Thước Thẻ ATM (85.6mm × 54mm)</title>
  <style>
    /* CSS Reset and Font Setup */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      line-height: 1.25;
    }

    /* Screen Toolbar */
    .screen-toolbar {
      position: sticky;
      top: 0;
      z-index: 999;
      background: #1e293b;
      color: #ffffff;
      padding: 12px 20px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .toolbar-title {
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .badge-atm {
      background: #d97706;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }

    .btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }

    .btn-success {
      background: #059669;
      color: #ffffff;
    }
    .btn-success:hover {
      background: #047857;
    }

    .btn-secondary {
      background: #475569;
      color: #ffffff;
    }
    .btn-secondary:hover {
      background: #334155;
    }

    .print-tip {
      font-size: 12px;
      color: #94a3b8;
      width: 100%;
      border-top: 1px solid #334155;
      padding-top: 8px;
      margin-top: 4px;
    }

    /* Print Preview Wrapper */
    .pages-container {
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }

    /* A4 Page Layout */
    .a4-page {
      background: #ffffff;
      width: 210mm;
      min-height: 297mm;
      padding: 10mm 10mm 6mm 10mm;
      margin: 0 auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .a4-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-content: flex-start;
      gap: 4.5mm 6mm;
    }

    .a4-grid.portrait {
      gap: 4mm 4.5mm;
    }

    .page-footer-note {
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
      padding-top: 4mm;
      border-top: 1px solid #e2e8f0;
    }

    /* CR80 Single Card Page */
    .cr80-page {
      background: #ffffff;
      width: ${cardWidthMm};
      height: ${cardHeightMm};
      margin: 10px auto;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    /* ATM CARD BASE STYLES */
    /* Exact CR80 dimensions: 85.60mm x 53.98mm (rounded to 85.6mm x 54mm) */
    .atm-card {
      width: 85.6mm;
      height: 54mm;
      max-width: 85.6mm;
      max-height: 54mm;
      background: #ffffff;
      border-radius: 3.18mm;
      border: 1px solid #cbd5e1;
      padding: 2.2mm 2.8mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .atm-card.portrait {
      width: 54mm;
      height: 85.6mm;
      max-width: 54mm;
      max-height: 85.6mm;
      padding: 2.5mm;
    }

    /* Cut guides (dashed line surrounding card for scissors cutting) */
    .atm-card.cut-guides {
      outline: 1px dashed #94a3b8;
      outline-offset: 1mm;
    }

    /* Optional lanyard punch hole indicator */
    .lanyard-hole {
      position: absolute;
      top: 1.5mm;
      left: 50%;
      transform: translateX(-50%);
      width: 12mm;
      height: 2.5mm;
      border: 1px dashed #94a3b8;
      border-radius: 2mm;
      background: rgba(255,255,255,0.8);
      z-index: 10;
    }

    /* CARD THEMES */
    /* 1. Classic Don Bosco Theme */
    .atm-card.classic {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border: 1.2px solid #1e3a8a;
    }
    .atm-card.classic .card-header {
      border-bottom: 1px solid #d97706;
      padding-bottom: 1.5mm;
    }
    .atm-card.classic .parish-name {
      color: #1e3a8a;
    }
    .atm-card.classic .card-title {
      background: #1e3a8a;
      color: #ffffff;
    }
    .atm-card.classic .holy-name {
      color: #b45309;
    }

    /* 2. Modern Theme */
    .atm-card.modern {
      background: #ffffff;
      border: 1.2px solid #0369a1;
    }
    .atm-card.modern .card-header {
      background: #f0f9ff;
      border-bottom: 1px solid #0284c7;
      margin: -2.2mm -2.8mm 1mm -2.8mm;
      padding: 1.5mm 2.8mm;
    }
    .atm-card.modern .parish-name {
      color: #0369a1;
    }
    .atm-card.modern .card-title {
      background: #0284c7;
      color: #ffffff;
    }
    .atm-card.modern .holy-name {
      color: #0284c7;
    }

    /* 3. Eco (Ink-Saving Laser Print) */
    .atm-card.eco {
      background: #ffffff;
      border: 1px solid #334155;
    }
    .atm-card.eco .card-header {
      border-bottom: 1px solid #334155;
      padding-bottom: 1.2mm;
    }
    .atm-card.eco .parish-name {
      color: #000000;
    }
    .atm-card.eco .card-title {
      background: transparent;
      border: 1px solid #000000;
      color: #000000;
    }
    .atm-card.eco .holy-name {
      color: #000000;
    }

    /* Header Components */
    .header-logo-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5mm;
    }

    .cross-icon {
      font-size: 13px;
      font-weight: bold;
      color: #d97706;
      line-height: 1;
    }

    .header-text-block {
      flex: 1;
    }

    .parish-name {
      font-size: 8.5px;
      font-weight: 800;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      line-height: 1.1;
    }

    .sub-header {
      font-size: 7px;
      font-weight: 700;
      color: #b45309;
      text-transform: uppercase;
      line-height: 1.1;
    }

    .academic-year-badge {
      font-size: 6.5px;
      font-weight: 700;
      background: #e0f2fe;
      color: #0369a1;
      border: 0.5px solid #bae6fd;
      padding: 1px 3px;
      border-radius: 2px;
      white-space: nowrap;
    }

    .card-title-bar {
      text-align: center;
      margin-top: 1mm;
    }

    .card-title {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 1px 6px;
      border-radius: 2px;
      display: inline-block;
    }

    /* Card Body Components */
    .card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0.5mm 0;
    }

    .landscape-layout {
      display: flex;
      align-items: center;
      gap: 2mm;
      height: 100%;
    }

    /* Photo Box */
    .col-photo {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 17mm;
      flex-shrink: 0;
    }

    .photo-box {
      width: 17mm;
      height: 22mm;
      border: 1px solid #cbd5e1;
      border-radius: 2px;
      background: #f8fafc;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .photo-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .avatar-initial {
      width: 7mm;
      height: 7mm;
      background: #dbeafe;
      color: #1e40af;
      font-size: 9px;
      font-weight: 800;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1mm;
    }

    .avatar-tag {
      font-size: 6px;
      color: #94a3b8;
      font-weight: 600;
    }

    .student-id-tag {
      font-size: 7px;
      font-family: "Courier New", Courier, monospace;
      font-weight: 800;
      color: #1e293b;
      margin-top: 0.8mm;
      text-align: center;
      background: #f1f5f9;
      border-radius: 2px;
      padding: 0.5px 2px;
      width: 100%;
    }

    /* Info Column */
    .col-info {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .holy-name {
      font-size: 10px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 0.3mm;
    }

    .full-name {
      font-size: 10.5px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.1;
      margin-bottom: 1.2mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 0.6mm;
      font-size: 7.5px;
      color: #334155;
    }

    .info-row {
      display: flex;
      align-items: baseline;
      gap: 1.5mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .info-row .lbl {
      color: #64748b;
      font-size: 7px;
      font-weight: 600;
      min-width: 9.5mm;
    }

    .cls-name {
      color: #1e3a8a;
      font-weight: 800;
    }

    .parent-row {
      font-size: 7px;
      color: #475569;
    }

    /* QR Code Column */
    .col-qr {
      width: 19.5mm;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-left: 0.5px dashed #cbd5e1;
      padding-left: 1.5mm;
    }

    .qr-container {
      width: 18.5mm;
      height: 18.5mm;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 2px;
      padding: 0.5mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }

    .qr-caption {
      font-size: 5.5px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      margin-top: 0.8mm;
      text-align: center;
    }

    /* Portrait Layout Specifics */
    .portrait-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: space-between;
    }

    .portrait-top {
      display: flex;
      gap: 2mm;
      align-items: center;
    }

    .photo-box-portrait {
      width: 15mm;
      height: 19mm;
      border: 1px solid #cbd5e1;
      border-radius: 2px;
      background: #f8fafc;
      overflow: hidden;
      flex-shrink: 0;
    }

    .portrait-details {
      flex: 1;
      overflow: hidden;
    }

    .portrait-divider {
      height: 1px;
      border-top: 0.5px dashed #cbd5e1;
      margin: 1.5mm 0;
    }

    .portrait-bottom {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .portrait-qr-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #ffffff;
      padding: 1mm;
      border: 1px solid #e2e8f0;
      border-radius: 2px;
    }

    .qr-image-portrait {
      width: 22mm;
      height: 22mm;
      object-fit: contain;
      image-rendering: pixelated;
    }

    .portrait-footer-info {
      font-size: 6.5px;
      color: #64748b;
      margin-top: 1mm;
      text-align: center;
    }

    /* Card Footer */
    .card-footer {
      border-top: 0.5px solid #e2e8f0;
      padding-top: 0.8mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 6.5px;
      color: #64748b;
    }

    .card-footer .motto {
      font-style: italic;
      color: #92400e;
      font-weight: 600;
    }

    .card-footer .system-tag {
      font-weight: 700;
      letter-spacing: 0.2px;
    }

    /* BACK CARD SPECIFICS */
    .back-card {
      background: #f8fafc;
    }

    .back-header {
      border-bottom: 1px solid #cbd5e1;
    }

    .back-body {
      padding: 1mm 0;
    }

    .rules-list {
      list-style-type: none;
      font-size: 6.8px;
      color: #334155;
      display: flex;
      flex-direction: column;
      gap: 0.8mm;
      padding: 0;
    }

    .rules-list li strong {
      color: #1e3a8a;
    }

    .back-footer {
      border-top: 0.5px solid #cbd5e1;
      padding-top: 0.8mm;
    }

    .back-contact {
      width: 100%;
      text-align: center;
      font-size: 6.5px;
      color: #475569;
      line-height: 1.2;
    }

    .student-ref-id {
      font-size: 6px;
      color: #94a3b8;
      margin-top: 0.5mm;
    }

    /* PRINT MEDIA RULES */
    @media print {
      body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .no-print {
        display: none !important;
      }

      .pages-container {
        padding: 0 !important;
        gap: 0 !important;
      }

      .a4-page {
        box-shadow: none !important;
        margin: 0 !important;
        width: 100% !important;
        min-height: auto !important;
        page-break-after: always !important;
        break-after: page !important;
      }

      .cr80-page {
        box-shadow: none !important;
        margin: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
      }

      ${isCR80 ? `
        @page {
          size: ${cardWidthMm} ${cardHeightMm};
          margin: 0;
        }
      ` : `
        @page {
          size: A4 portrait;
          margin: 8mm 6mm;
        }
      `}
    }
  </style>
</head>
<body>
  <!-- Screen Action Toolbar (Hidden when printing) -->
  <div class="screen-toolbar no-print">
    <div class="toolbar-title">
      <span>🖨️ Bản In Thẻ Học Sinh &amp; Mã QR</span>
      <span class="badge-atm">Chuẩn kích thước thẻ ATM (85.6mm × 54mm)</span>
      <span style="font-size: 12px; color: #94a3b8; font-weight: normal;">• Đang hiển thị ${selectedStudents.length} học sinh (${cardHtmlList.length} thẻ)</span>
    </div>

    <div class="toolbar-actions">
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        <span>Bấm Vào Đây Để In Ngay (Ctrl + P)</span>
      </button>

      <button class="btn btn-success" onclick="downloadHtmlFile()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        <span>Tải File HTML Offline</span>
      </button>

      <button class="btn btn-secondary" onclick="window.close()">
        <span>Đóng Cửa Sổ</span>
      </button>
    </div>

    <div class="print-tip">
      💡 <strong>Lưu ý quan trọng khi in:</strong> Trong hộp thoại in của trình duyệt, tại mục <em>"Tùy chọn khác (More settings)"</em>, hãy bật mục <strong>"Đồ họa nền (Background graphics)"</strong> để in đầy đủ màu sắc, logo và viền thẻ. Chọn khổ giấy <strong>A4</strong>, lề <strong>Tối thiểu (Minimum)</strong> hoặc <strong>Không có (None)</strong>.
    </div>
  </div>

  <!-- Cards Container -->
  <div class="pages-container">
    ${pages.join('')}
  </div>

  <script>
    function downloadHtmlFile() {
      const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'The_Hoc_Sinh_DonBosco_ATM_Card_' + new Date().toISOString().slice(0, 10) + '.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>
  `;
}

/**
 * Print standalone HTML via isolated hidden iframe
 * Guarantees no modal background leak, no clipped pages, and 100% clean output
 */
export function printViaIsolatedIframe(htmlContent: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const existingIframe = document.getElementById('student-card-print-iframe');
      if (existingIframe) {
        existingIframe.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'student-card-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc || !iframe.contentWindow) {
        resolve(false);
        return;
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      // Wait for images/styles to settle then trigger print
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (err) {
          console.warn('Iframe print failed', err);
          resolve(false);
        }
      }, 500);
    } catch (e) {
      console.error('Print iframe error', e);
      resolve(false);
    }
  });
}

/**
 * Opens printable HTML in a new tab/window via Blob URL
 * Highly recommended for embedded iframes like AI Studio
 */
export function openPrintTab(htmlContent: string): boolean {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to open print tab', err);
    return false;
  }
}

/**
 * Download standalone HTML file containing all cards and embedded QR codes
 */
export function downloadPrintHtmlFile(htmlContent: string, fileName?: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || `The_Hoc_Sinh_DonBosco_ATM_Card_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Export a single student's card as a crisp 300 DPI PNG image matching ATM Card dimensions
 */
export async function downloadCardAsPng(
  student: Student,
  className: string,
  qrDataUrl: string
): Promise<void> {
  const canvas = document.createElement('canvas');
  // CR80 ATM Card Aspect Ratio 85.6mm x 53.98mm (~1.586)
  // At 300 DPI: 1011 x 638 px
  canvas.width = 1011;
  canvas.height = 638;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Rounded outer border
  const r = 38;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(canvas.width - r, 0);
  ctx.arcTo(canvas.width, 0, canvas.width, r, r);
  ctx.lineTo(canvas.width, canvas.height - r);
  ctx.arcTo(canvas.width, canvas.height, canvas.width - r, canvas.height, r);
  ctx.lineTo(r, canvas.height);
  ctx.arcTo(0, canvas.height, 0, canvas.height - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#1e3a8a';
  ctx.stroke();

  // Top header banner
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(4, 4, canvas.width - 8, 120);

  // Cross icon
  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('✝', 35, 68);

  // Parish Name
  ctx.fillStyle = '#1e3a8a';
  ctx.font = '900 25px sans-serif';
  ctx.fillText('GIÁO SỞ DON BOSCO ĐÀ LẠT', 85, 48);

  // Subtitle
  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('BAN GIÁO LÝ THIẾU NHI', 85, 76);

  // Academic year badge
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(canvas.width - 230, 32, 195, 36);
  ctx.fillStyle = '#0369a1';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Niên khóa 2026-2027', canvas.width - 220, 56);

  // Title bar
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 105, canvas.width, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THẺ HỌC SINH GIÁO LÝ', canvas.width / 2, 130);
  ctx.textAlign = 'left';

  // Photo Box (Left)
  const photoX = 35;
  const photoY = 160;
  const photoW = 190;
  const photoH = 250;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(photoX, photoY, photoW, photoH);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.strokeRect(photoX, photoY, photoW, photoH);

  // Photo or placeholder
  ctx.fillStyle = '#1e40af';
  ctx.font = 'bold 50px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(student.holyName.charAt(0), photoX + photoW / 2, photoY + 130);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('ẢNH 3x4', photoX + photoW / 2, photoY + 175);

  // Student ID tag under photo
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(photoX, photoY + photoH + 12, photoW, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(student.id, photoX + photoW / 2, photoY + photoH + 39);
  ctx.textAlign = 'left';

  // Middle info
  const infoX = 255;
  let textY = 195;

  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(student.holyName, infoX, textY);

  textY += 38;
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 32px sans-serif';
  ctx.fillText(student.fullName, infoX, textY);

  textY += 45;
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Lớp:', infoX, textY);
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(className, infoX + 70, textY);

  textY += 35;
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Sinh:', infoX, textY);
  ctx.fillStyle = '#1e293b';
  ctx.font = '22px sans-serif';
  ctx.fillText(new Date(student.dob).toLocaleDateString('vi-VN'), infoX + 70, textY);

  textY += 35;
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Giáo họ:', infoX, textY);
  ctx.fillStyle = '#1e293b';
  ctx.font = '22px sans-serif';
  ctx.fillText(student.subParish || 'Don Bosco', infoX + 95, textY);

  textY += 35;
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PH:', infoX, textY);
  ctx.fillStyle = '#475569';
  ctx.font = '20px sans-serif';
  ctx.fillText(`${student.parentName || 'PH'} (${student.parentPhone || ''})`, infoX + 50, textY);

  // QR Code (Right)
  const qrSize = 220;
  const qrX = canvas.width - qrSize - 35;
  const qrY = 175;

  if (qrDataUrl) {
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    await new Promise((resolve) => {
      qrImg.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        resolve(null);
      };
      qrImg.onerror = () => resolve(null);
      qrImg.src = qrDataUrl;
    });
  }

  // QR Caption
  ctx.fillStyle = '#475569';
  ctx.font = '900 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('QUÉT ĐIỂM DANH', qrX + qrSize / 2, qrY + qrSize + 28);

  // Footer bar
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(4, canvas.height - 45, canvas.width - 8, 40);
  ctx.fillStyle = '#92400e';
  ctx.font = 'italic bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('✝ Yêu thương & Phục vụ', 35, canvas.height - 18);

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Don Bosco Đà Lạt', canvas.width - 35, canvas.height - 18);

  // Download trigger
  const downloadUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `The_ATM_${student.id}_${student.fullName.replace(/\s+/g, '_')}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

