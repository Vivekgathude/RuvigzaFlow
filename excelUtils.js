import * as XLSX from "xlsx";

export const STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Follow Up",
  "Interested",
  "Sent Proposal",
  "Onboarded",
  "Not Interested",
  "Closed",
];
export const SOURCE_OPTIONS = [
  "Google Ads",
  "Meta Ads",
  "Referral",
  "Organic",
  "WhatsApp",
  "Other",
];

const HEADER_GUESSES = {
  name: [
    "name",
    "full name",
    "lead name",
    "customer name",
    "client name",
    "business name",
    "company name",
  ],

  category: [
    "category",
    "business category",
    "business type",
    "industry",
    "type",
  ],

  address: [
    "address",
    "full address",
    "location",
    "business address",
  ],

  phone: [
    "phone",
    "mobile",
    "contact",
    "contact number",
    "phone number",
    "mobile number",
    "whatsapp",
    "whatsapp number",
  ],

  website: [
    "website",
    "web site",
    "website url",
    "url",
    "web",
  ],

  source: [
    "source",
    "channel",
    "campaign",
    "lead source",
  ],

  status: [
    "status",
    "stage",
    "lead status",
  ],
};

export function guessMapping(headers) {
  const mapping = {
    name: "",
    category: "",
    address: "",
    phone: "",
    website: "",
    source: "",
    status: "",
  };

  const lower = headers.map((h) => ({
    h,
    l: String(h).toLowerCase().trim(),
  }));

  Object.keys(HEADER_GUESSES).forEach((field) => {
    const found = lower.find((x) =>
      HEADER_GUESSES[field].some(
        (g) => x.l === g || x.l.includes(g)
      )
    );

    if (found) {
      mapping[field] = found.h;
    }
  });

  return mapping;
}

/**
 * Reads a File (from an <input type="file">)
 * and returns { headers, rows }.
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);

        const wb = XLSX.read(data, {
          type: "array",
        });

        const sheet = wb.Sheets[wb.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json(sheet, {
          defval: "",
        });

        if (!rows.length) {
          return reject(
            new Error("This file has no data rows.")
          );
        }

        resolve({
          headers: Object.keys(rows[0]),
          rows,
        });
      } catch (err) {
        reject(
          new Error(
            "Couldn't read this file. Make sure it's a valid .xlsx or .csv file."
          )
        );
      }
    };

    reader.onerror = () =>
      reject(new Error("Couldn't read this file."));

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Applies field → column mapping to raw Excel rows.
 */
export function applyMapping(rawRows, mapping) {
  return rawRows.map((row) => ({
    name: mapping.name
      ? String(row[mapping.name] || "").trim()
      : "",

    category: mapping.category
      ? String(row[mapping.category] || "").trim()
      : "",

    address: mapping.address
      ? String(row[mapping.address] || "").trim()
      : "",

    phone: mapping.phone
      ? String(row[mapping.phone] || "").trim()
      : "",

    website: mapping.website
      ? String(row[mapping.website] || "").trim()
      : "",

    source: mapping.source
      ? String(row[mapping.source] || "").trim()
      : "",

    status:
      mapping.status &&
      STATUS_OPTIONS.includes(
        String(row[mapping.status]).trim()
      )
        ? String(row[mapping.status]).trim()
        : "",
  }));
}