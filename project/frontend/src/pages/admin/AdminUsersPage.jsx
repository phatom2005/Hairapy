import { useEffect, useState, useCallback } from "react";
import api from "../../lib/api";
import { Card, Badge, Button, Input } from "../../components/ui";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Debounce tìm kiếm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0); // Reset về trang đầu khi tìm kiếm
    }, 300);

    return () => clearTimeout(handler);
  }, [search]);

  // Fetch danh sách user
  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = {
      page,
      size: 10,
      search: debouncedSearch || undefined,
    };
    api
      .get("/admin/users", { params })
      .then((res) => {
        setUsers(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Toggle role người dùng
  const handleToggleRole = (user) => {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    const confirmMessage = `Bạn có chắc chắn muốn chuyển vai trò của ${user.fullName || user.email} từ ${user.role} thành ${newRole}?`;

    if (!window.confirm(confirmMessage)) return;

    setActionLoading(true);
    api
      .put(`/admin/users/${user.id}/role`, { role: newRole })
      .then(() => {
        setActionLoading(false);
        fetchUsers();
      })
      .catch((err) => {
        setActionLoading(false);
        alert(err.response?.data || "Đổi vai trò thất bại. Vui lòng kiểm tra lại.");
      });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN") + " " + date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink">Quản lý người dùng</h2>
          <p className="text-sm text-mauve">Tìm kiếm và điều chỉnh vai trò thành viên</p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Tìm theo email hoặc tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden border border-divider/10" padded={false}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted">
            Không tìm thấy người dùng nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Họ & Tên</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Vai trò</th>
                  <th className="px-6 py-4">Ngày tạo</th>
                  <th className="px-6 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-ink">{u.id}</td>
                    <td className="px-6 py-4 font-semibold text-ink">{u.fullName || "-"}</td>
                    <td className="px-6 py-4 text-mauve">{u.email}</td>
                    <td className="px-6 py-4">
                      <Badge variant={u.role === "ADMIN" ? "hot" : "neutral"}>
                        {u.role === "ADMIN" ? "ADMIN" : "USER"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted">{formatDate(u.createdAt)}</td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        size="sm"
                        variant={u.role === "ADMIN" ? "outline" : "dark"}
                        className="px-4 py-1.5 text-xs rounded-xl"
                        disabled={actionLoading}
                        onClick={() => handleToggleRole(u)}
                      >
                        {u.role === "ADMIN" ? "Hạ quyền USER" : "Thăng quyền ADMIN"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs font-semibold text-muted">
            Trang {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page === totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
