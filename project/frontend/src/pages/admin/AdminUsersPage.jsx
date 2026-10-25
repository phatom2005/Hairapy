import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { Card, Button, Input } from "../../components/ui";
import useAuthStore from "../../store/useAuthStore";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import UserDetailDrawer from "../../components/admin/UserDetailDrawer";
import { PLAN_LABEL } from "../../lib/plans";

export default function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [verifiedFilter, setVerifiedFilter] = useState(""); // "" | "true" | "false"
  const [page, setPage] = useState(0);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState(null); // { user, newRole }

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Query users via TanStack Query
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-users", page, debouncedSearch, includeDeleted, verifiedFilter],
    queryFn: async () => {
      const params = {
        page,
        size: 10,
        includeDeleted,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (verifiedFilter === "true") params.verified = true;
      if (verifiedFilter === "false") params.verified = false;

      const res = await api.get("/admin/users", { params });
      return res.data;
    },
  });

  const users = data?.content || [];
  const totalPages = data?.totalPages || 1;

  // Mutation for role update
  const roleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      const res = await api.put(`/admin/users/${userId}/role`, { role: newRole });
      return res.data;
    },
    onSuccess: () => {
      setConfirmRoleChange(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ["admin-user-overview", selectedUserId] });
      }
    },
    onError: (err) => {
      alert(err.response?.data?.message || err.response?.data || "Đổi vai trò thất bại.");
    },
  });

  const handleRoleSelectChange = (user, newRole) => {
    if (newRole === user.role) return;
    const isSelf = currentUser?.email && user.email?.toLowerCase() === currentUser.email.toLowerCase();
    if (user.role === "ADMIN" && isSelf) {
      alert("Bạn không thể tự hạ vai trò quản trị viên của chính mình.");
      return;
    }
    setConfirmRoleChange({ user, newRole });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("vi-VN") + " " + date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink">Quản lý người dùng</h2>
          <p className="text-sm text-mauve">Danh sách thành viên, trạng thái gói và vai trò hệ thống</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-canvas p-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Tìm theo email hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted">Xác minh:</span>
            <select
              value={verifiedFilter}
              onChange={(e) => {
                setVerifiedFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink focus:border-primary focus:outline-hidden"
            >
              <option value="">Tất cả</option>
              <option value="true">Đã xác minh</option>
              <option value="false">Chưa xác minh</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.target.checked);
                setPage(0);
              }}
              className="size-4 rounded accent-primary cursor-pointer"
            />
            Hiện tài khoản đã xoá
          </label>
        </div>

        {isFetching && (
          <span className="text-xs text-mauve animate-pulse">Đang tải...</span>
        )}
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden border border-divider/10" padded={false}>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted text-sm">
            Không tìm thấy người dùng nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/80 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-3.5">ID</th>
                  <th className="px-5 py-3.5">Người dùng</th>
                  <th className="px-5 py-3.5">Gói hiện tại</th>
                  <th className="px-5 py-3.5">Xác minh</th>
                  <th className="px-5 py-3.5">Đăng nhập bằng</th>
                  <th className="px-5 py-3.5">Vai trò</th>
                  <th className="px-5 py-3.5">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => {
                  const isSelf = !!(currentUser?.email && u.email?.toLowerCase() === currentUser.email.toLowerCase());
                  const isSelfAdmin = isSelf && u.role === "ADMIN";

                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className="hover:bg-line/20 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4 font-bold text-ink">#{u.id}</td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-ink hover:text-primary transition-colors">
                            {u.fullName || "—"}
                          </span>
                          <span className="text-mauve text-[11px]">{u.email}</span>
                          {u.deleted && (
                            <span className="text-[10px] text-red-500 font-semibold">[Đã xoá]</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-ink">
                            {PLAN_LABEL[u.plan] || u.plan}
                          </span>
                          {u.planEndDate && (
                            <span className="text-[10px] text-muted">
                              hạn: {new Date(u.planEndDate).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {u.emailVerified ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">
                            ✓ Đã xác minh
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px]">
                            ✗ Chưa
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 font-semibold text-mauve">
                        {u.provider || "LOCAL"}
                      </td>

                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleSelectChange(u, e.target.value)}
                          disabled={roleMutation.isPending || isSelfAdmin}
                          title={isSelfAdmin ? "Không thể tự hạ vai trò admin của chính mình" : undefined}
                          className="rounded-xl border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink focus:border-primary focus:outline-hidden disabled:bg-line/30 disabled:text-muted cursor-pointer"
                        >
                          <option value="USER">USER</option>
                          <option value="TESTER">TESTER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>

                      <td className="px-5 py-4 text-muted text-[11px]">
                        {formatDate(u.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-semibold text-muted">
            Trang {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page === 0 || isLoading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page === totalPages - 1 || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmRoleChange}
        title="Đổi vai trò người dùng"
        message={`Bạn có chắc chắn muốn chuyển vai trò của ${
          confirmRoleChange?.user?.fullName || confirmRoleChange?.user?.email
        } từ "${confirmRoleChange?.user?.role}" sang "${confirmRoleChange?.newRole}"?`}
        confirmText="Xác nhận đổi vai trò"
        loading={roleMutation.isPending}
        onConfirm={() => {
          if (confirmRoleChange) {
            roleMutation.mutate({
              userId: confirmRoleChange.user.id,
              newRole: confirmRoleChange.newRole,
            });
          }
        }}
        onCancel={() => setConfirmRoleChange(null)}
      />

      {/* User Detail Drawer */}
      <UserDetailDrawer
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
}
