import { describe, it, expect } from "vitest";
import { isAllowedUpload } from "@/lib/uploads";

describe("isAllowedUpload (extension is authoritative)", () => {
  it("accepts the permitted document types, case-insensitively", () => {
    for (const f of ["statement.pdf", "ledger.xls", "ledger.xlsx", "export.csv", "STATEMENT.PDF", "Data.XlsX"]) {
      expect(isAllowedUpload(f)).toBe(true);
    }
  });

  it("rejects executables/scripts/markup even if MIME were spoofed", () => {
    for (const f of ["malware.exe", "evil.js", "page.html", "vector.svg", "bundle.zip", "shell.sh", "app.bat"]) {
      expect(isAllowedUpload(f)).toBe(false);
    }
  });

  it("rejects files with no extension", () => {
    expect(isAllowedUpload("noextension")).toBe(false);
    expect(isAllowedUpload("")).toBe(false);
  });

  it("uses the LAST extension (defends double-extension tricks)", () => {
    expect(isAllowedUpload("statement.pdf.exe")).toBe(false);
    expect(isAllowedUpload("report.csv.js")).toBe(false);
  });

  it("does not admit a trailing-space disguise", () => {
    expect(isAllowedUpload("evil.pdf .exe")).toBe(false);
  });
});
