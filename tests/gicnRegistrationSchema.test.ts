import { describe, it, expect } from "vitest";
import { parseBulkRegistration } from "@/lib/gicnRegistrationSchema";

const LABELS = [
  "Full Name",
  "Date of Birth (YYYY-MM-DD)",
  "Class / Level",
  "Parent/Guardian Name",
  "Guardian Consent (yes/no)",
  "Media Release (yes/no)",
  "Address",
];

const csv = (rows: string[][]) => Buffer.from(rows.map((r) => r.join(",")).join("\n"), "utf8");
const parse = (rows: string[][]) => parseBulkRegistration(csv(rows), "bulk.csv");
const validRow = ["Ada Obi", "2015-06-01", "JSS1", "Mrs Obi", "yes", "no", "12 Lagos St"];

describe("parseBulkRegistration — happy path", () => {
  it("parses a valid row into a typed participant", async () => {
    const { rows, rejected, missingColumns } = await parse([LABELS, validRow]);
    expect(missingColumns).toEqual([]);
    expect(rejected).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ fullName: "Ada Obi", classLevel: "JSS1", guardianName: "Mrs Obi", mediaReleaseGranted: false });
    expect(rows[0].dateOfBirth).toBeInstanceOf(Date);
    expect(rows[0].dateOfBirth.getUTCFullYear()).toBe(2015);
  });

  it("nulls optional empties and reads media-release truthiness", async () => {
    const { rows } = await parse([LABELS, ["Ada Obi", "2015-06-01", "", "Mrs Obi", "yes", "yes", ""]]);
    expect(rows[0]).toMatchObject({ classLevel: null, address: null, mediaReleaseGranted: true });
  });

  it("accepts header keys as well as labels", async () => {
    const keys = ["fullName", "dateOfBirth", "classLevel", "guardianName", "guardianConsent", "mediaRelease", "address"];
    const { rows, missingColumns } = await parse([keys, validRow]);
    expect(missingColumns).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it("skips fully-empty rows", async () => {
    const { rows, rejected } = await parse([LABELS, validRow, ["", "", "", "", "", "", ""]]);
    expect(rows).toHaveLength(1);
    expect(rejected).toEqual([]);
  });
});

describe("parseBulkRegistration — NDPA consent + validation", () => {
  it("rejects a row without guardian consent (the critical rule)", async () => {
    const { rows, rejected } = await parse([LABELS, ["Ada Obi", "2015-06-01", "JSS1", "Mrs Obi", "no", "no", ""]]);
    expect(rows).toHaveLength(0);
    expect(rejected[0].reason).toMatch(/consent/i);
    expect(rejected[0].rowNumber).toBe(2);
  });

  it("treats yes/y/true/1 as consent and everything else as refusal", async () => {
    for (const v of ["yes", "y", "true", "1", "YES"]) {
      const { rows } = await parse([LABELS, ["A", "2015-06-01", "", "G", v, "", ""]]);
      expect(rows, `consent="${v}"`).toHaveLength(1);
    }
    for (const v of ["no", "", "maybe", "0", "false"]) {
      const { rejected } = await parse([LABELS, ["A", "2015-06-01", "", "G", v, "", ""]]);
      expect(rejected, `consent="${v}"`).toHaveLength(1);
    }
  });

  it("rejects missing required fields", async () => {
    const { rejected } = await parse([LABELS, ["", "2015-06-01", "", "Mrs Obi", "yes", "", ""]]);
    expect(rejected[0].reason).toMatch(/Missing required field/i);
  });

  it("rejects invalid and future dates of birth", async () => {
    const bad = await parse([LABELS, ["Ada", "not-a-date", "", "G", "yes", "", ""]]);
    expect(bad.rejected[0].reason).toMatch(/Invalid date of birth/i);
    const nextYear = `${new Date().getFullYear() + 1}-01-01`;
    const future = await parse([LABELS, ["Ada", nextYear, "", "G", "yes", "", ""]]);
    expect(future.rejected[0].reason).toMatch(/future/i);
  });

  it("reports missing required columns and parses no rows", async () => {
    const noConsentCol = LABELS.filter((l) => !/consent/i.test(l));
    const row = validRow.filter((_, i) => !/consent/i.test(LABELS[i]));
    const { rows, missingColumns } = await parse([noConsentCol, row]);
    expect(rows).toHaveLength(0);
    expect(missingColumns).toContain("Guardian Consent (yes/no)");
  });
});
