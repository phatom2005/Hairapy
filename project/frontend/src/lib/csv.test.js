import { describe, it, expect } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("để trống khi null/undefined", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("bọc nháy kép khi có dấu phẩy, nháy kép hoặc xuống dòng", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('nói "chào"')).toBe('"nói ""chào"""');
    expect(csvCell("dòng 1\ndòng 2")).toBe('"dòng 1\ndòng 2"');
  });

  it("chặn CSV injection: ô bắt đầu bằng = + - @ được thêm dấu nháy đơn", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });

  it("giữ nguyên số và tiếng Việt", () => {
    expect(csvCell(99000)).toBe("99000");
    expect(csvCell("Gói Tháng")).toBe("Gói Tháng");
  });
});

describe("toCsv", () => {
  it("tạo header + dòng, phân tách CRLF", () => {
    const csv = toCsv(
      [
        { header: "Mã", value: (r) => r.id },
        { header: "Email", value: (r) => r.email },
      ],
      [{ id: 1, email: "a@x.vn" }, { id: 2, email: "b,c@x.vn" }]
    );
    expect(csv).toBe('Mã,Email\r\n1,a@x.vn\r\n2,"b,c@x.vn"');
  });
});
