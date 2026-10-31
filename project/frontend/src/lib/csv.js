// Tiện ích xuất CSV phía client (Phase 6.3) — dùng cho trang admin.

/** Escape 1 ô CSV: bọc nháy kép nếu có dấu phẩy, nháy kép hoặc xuống dòng. */
export function csvCell(value) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Chặn CSV injection: ô bắt đầu bằng = + - @ bị Excel hiểu là công thức
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Tạo nội dung CSV từ danh sách cột + dòng.
 * @param {{ header: string, value: (row: any) => any }[]} columns
 * @param {any[]} rows
 */
export function toCsv(columns, rows) {
  const head = columns.map((c) => csvCell(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(","));
  return [head, ...body].join("\r\n");
}

/** Tải file CSV có BOM UTF-8 để Excel hiển thị đúng tiếng Việt. */
export function downloadCsv(filename, csvText) {
  const blob = new Blob(["﻿" + csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
