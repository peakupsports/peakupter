import moment from 'moment';
import XLSX from 'xlsx-js-style';

import { APPLICATION_STATUSES, formatApplicationType } from './coachApplicationAdmin';
import { normalizeReferralCode } from './referralCode';

const CERTIFICATION_EXPORT_LABELS = {
  none: 'No formal certification yet',
  national: 'National certification',
  international: 'International certification',
  federation: 'Federation certified',
  instructor: 'Licensed instructor',
  other: 'Other',
};

const STATUS_EXPORT_LABELS = {
  [APPLICATION_STATUSES.PENDING]: 'Pending',
  [APPLICATION_STATUSES.APPROVED]: 'Approved',
  [APPLICATION_STATUSES.REJECTED]: 'Rejected',
  [APPLICATION_STATUSES.NEED_MORE_INFO]: 'Need more info',
};

const APPLICATION_TYPE_EXPORT_LABELS = {
  ambassador_interest: 'Ambassador interest',
  independent: 'Independent',
  referral: 'Referral',
  standard: 'Standard',
};

/**
 * Split combined Instagram / website field for export columns.
 *
 * @param {string} raw
 * @returns {{ instagram: string, website: string }}
 */
export const splitInstagramWebsite = raw => {
  const value = (raw || '').trim();
  if (!value) {
    return { instagram: '', website: '' };
  }

  const parts = value
    .split(/[\s,;|]+/)
    .map(part => part.trim())
    .filter(Boolean);

  const instagramParts = [];
  const websiteParts = [];

  parts.forEach(part => {
    if (/instagram\.com|instagr\.am|^@/i.test(part)) {
      instagramParts.push(part);
    } else if (/^https?:\/\//i.test(part) || /^www\./i.test(part) || /\.[a-z]{2,}(\/|$)/i.test(part)) {
      websiteParts.push(part);
    } else {
      instagramParts.push(part);
    }
  });

  if (instagramParts.length === 0 && websiteParts.length === 0) {
    return { instagram: value, website: '' };
  }

  return {
    instagram: instagramParts.join(' '),
    website: websiteParts.join(' '),
  };
};

const formatExportDate = (value, { asDateObject = false } = {}) => {
  if (!value) {
    return asDateObject ? null : '';
  }
  const m = moment(value);
  if (!m.isValid()) {
    return asDateObject ? null : String(value);
  }
  return asDateObject ? m.toDate() : m.format('YYYY-MM-DD HH:mm');
};

const EXPORT_DATE_COLUMN_INDEXES = [17, 18];

const XLSX_HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'F4F6FA' } },
  fill: { patternType: 'solid', fgColor: { rgb: '1A2838' } },
  alignment: { vertical: 'center', horizontal: 'left' },
};

const XLSX_DATE_STYLE = {
  numFmt: 'yyyy-mm-dd hh:mm',
};

/**
 * Map one application to export column values.
 *
 * @param {object} app
 * @param {{ datesAsDateObjects?: boolean }} [options]
 * @returns {Array<string|Date|null>}
 */
export const applicationToExportValues = (app, { datesAsDateObjects = false } = {}) => {
  const { instagram, website } = splitInstagramWebsite(app.instagramWebsite);

  return [
    app.fullName,
    app.email,
    app.phone,
    app.country,
    app.cityArea,
    app.languagesSpoken,
    app.mainSport,
    app.otherSports,
    app.yearsExperience,
    certificationLabel(app.certificationLevel),
    app.federationSchool,
    instagram,
    website,
    normalizeReferralCode(app.ambassadorReferralCode),
    formatYesNo(app.interestedInAmbassador),
    applicationTypeLabel(app),
    statusLabel(app.status),
    formatExportDate(app.submittedAt, { asDateObject: datesAsDateObjects }),
    formatExportDate(app.updatedAt, { asDateObject: datesAsDateObjects }),
  ];
};

/**
 * @param {Array<Array<unknown>>} rows
 * @returns {Array<{ wch: number }>}
 */
const computeColumnWidths = rows => {
  const columnCount = rows[0]?.length || 0;
  return Array.from({ length: columnCount }, (_, columnIndex) => {
    let maxWidth = 10;
    rows.forEach(row => {
      const cell = row[columnIndex];
      const length =
        cell instanceof Date
          ? 18
          : String(cell === null || cell === undefined ? '' : cell).length;
      maxWidth = Math.max(maxWidth, Math.min(length + 2, 48));
    });
    return { wch: maxWidth };
  });
};

const formatYesNo = value => (value ? 'Yes' : 'No');

const certificationLabel = key => CERTIFICATION_EXPORT_LABELS[key] || key || '';

const statusLabel = key => STATUS_EXPORT_LABELS[key] || key || '';

const applicationTypeLabel = application => {
  const type = formatApplicationType(application);
  return APPLICATION_TYPE_EXPORT_LABELS[type] || type || '';
};

export const COACH_APPLICATION_EXPORT_HEADERS = [
  'Full name',
  'Email',
  'Phone / WhatsApp',
  'Country',
  'City / area',
  'Languages',
  'Main sport you teach',
  'Other sports you teach',
  'Years of experience',
  'Certification level',
  'Federation / school',
  'Instagram',
  'Website',
  'Ambassador referral code',
  'Interested in becoming ambassador',
  'Application type',
  'Status',
  'Submitted at',
  'Updated at',
];

/**
 * Trigger download of filtered coach applications as a formatted .xlsx workbook.
 *
 * @param {object[]} applications
 * @param {string} [dateStamp] YYYY-MM-DD for filename
 */
export const downloadCoachApplicationsXlsx = (applications, dateStamp) => {
  if (typeof window === 'undefined') {
    return;
  }

  const stamp = dateStamp || moment().format('YYYY-MM-DD');
  const dataRows = applications.map(app =>
    applicationToExportValues(app, { datesAsDateObjects: true })
  );
  const sheetRows = [COACH_APPLICATION_EXPORT_HEADERS, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const headerAddress = XLSX.utils.encode_cell({ r: 0, c: column });
    if (worksheet[headerAddress]) {
      worksheet[headerAddress].s = XLSX_HEADER_STYLE;
    }
  }

  for (let row = 1; row <= range.e.r; row += 1) {
    EXPORT_DATE_COLUMN_INDEXES.forEach(column => {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      const cell = worksheet[address];
      if (cell?.v instanceof Date) {
        cell.s = { ...(cell.s || {}), ...XLSX_DATE_STYLE };
      }
    });
  }

  worksheet['!cols'] = computeColumnWidths(sheetRows);
  worksheet['!views'] = [
    {
      state: 'frozen',
      ySplit: 1,
      topLeftCell: 'A2',
      activePane: 'bottomLeft',
    },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Applications');
  XLSX.writeFile(workbook, `peakup-coach-applications-${stamp}.xlsx`);
};
