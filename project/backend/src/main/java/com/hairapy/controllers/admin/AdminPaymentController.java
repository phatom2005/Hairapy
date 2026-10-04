package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.AdminPaymentResponse;
import com.hairapy.dto.admin.AdminPaymentSummaryResponse;
import com.hairapy.models.Payment;
import com.hairapy.models.PaymentStatus;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.models.User;
import com.hairapy.repositories.PaymentRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Controller quản trị dành cho việc tra cứu lịch sử thanh toán và thống kê giao dịch.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
public class AdminPaymentController {

    private final PaymentRepository paymentRepository;
    private final EntityManager entityManager;

    /**
     * Lấy danh sách giao dịch thanh toán có phân trang, hỗ trợ lọc theo trạng thái, gói, khoảng ngày và từ khoá.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getPayments(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String plan,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        PaymentStatus paymentStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                paymentStatus = PaymentStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Trạng thái thanh toán không hợp lệ: " + status));
            }
        }

        SubscriptionPlan subscriptionPlan = null;
        if (plan != null && !plan.isBlank()) {
            try {
                subscriptionPlan = SubscriptionPlan.valueOf(plan.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Gói dịch vụ không hợp lệ: " + plan));
            }
        }

        LocalDate fromDate = null;
        if (from != null && !from.isBlank()) {
            try {
                fromDate = LocalDate.parse(from.trim());
            } catch (DateTimeParseException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Định dạng ngày 'from' không hợp lệ (yyyy-MM-dd)"));
            }
        }

        LocalDate toDate = null;
        if (to != null && !to.isBlank()) {
            try {
                toDate = LocalDate.parse(to.trim());
            } catch (DateTimeParseException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Định dạng ngày 'to' không hợp lệ (yyyy-MM-dd)"));
            }
        }

        Specification<Payment> spec = buildSpecification(paymentStatus, subscriptionPlan, fromDate, toDate, keyword);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Payment> paymentPage = paymentRepository.findAll(spec, pageable);
        Page<AdminPaymentResponse> responsePage = paymentPage.map(p -> new AdminPaymentResponse(
                p.getId(),
                p.getOrderCode(),
                p.getUser() != null ? p.getUser().getId() : null,
                p.getUser() != null ? p.getUser().getEmail() : null,
                p.getUser() != null ? p.getUser().getFullName() : null,
                p.getPlan(),
                p.getAmount(),
                p.getStatus(),
                p.getPayosTransactionId(),
                p.getCreatedAt(),
                p.getPaidAt(),
                p.isSubscriptionGranted()
        ));

        return ResponseEntity.ok(responsePage);
    }

    /**
     * Lấy tóm tắt số liệu các giao dịch trong khoảng thời gian từ ngày - đến ngày.
     */
    @GetMapping("/summary")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getPaymentSummary(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {

        LocalDate fromDate = null;
        if (from != null && !from.isBlank()) {
            try {
                fromDate = LocalDate.parse(from.trim());
            } catch (DateTimeParseException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Định dạng ngày 'from' không hợp lệ (yyyy-MM-dd)"));
            }
        }

        LocalDate toDate = null;
        if (to != null && !to.isBlank()) {
            try {
                toDate = LocalDate.parse(to.trim());
            } catch (DateTimeParseException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Định dạng ngày 'to' không hợp lệ (yyyy-MM-dd)"));
            }
        }

        long paidCount = paymentRepository.count(buildSpecification(PaymentStatus.PAID, null, fromDate, toDate, null));
        long pendingCount = paymentRepository.count(buildSpecification(PaymentStatus.PENDING, null, fromDate, toDate, null));
        long cancelledCount = paymentRepository.count(buildSpecification(PaymentStatus.CANCELLED, null, fromDate, toDate, null));

        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<Payment> root = cq.from(Payment.class);

        Specification<Payment> paidSpec = buildSpecification(PaymentStatus.PAID, null, fromDate, toDate, null);
        Predicate predicate = paidSpec.toPredicate(root, cq, cb);
        cq.select(cb.coalesce(cb.sum(cb.toLong(root.get("amount"))), 0L));
        if (predicate != null) {
            cq.where(predicate);
        }

        Long totalAmountPaid = entityManager.createQuery(cq).getSingleResult();

        return ResponseEntity.ok(new AdminPaymentSummaryResponse(
                totalAmountPaid != null ? totalAmountPaid : 0L,
                paidCount,
                pendingCount,
                cancelledCount
        ));
    }

    private Specification<Payment> buildSpecification(
            PaymentStatus status,
            SubscriptionPlan plan,
            LocalDate from,
            LocalDate to,
            String keyword) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (plan != null) {
                predicates.add(cb.equal(root.get("plan"), plan));
            }

            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from.atStartOfDay()));
            }

            if (to != null) {
                predicates.add(cb.lessThan(root.get("createdAt"), to.plusDays(1).atStartOfDay()));
            }

            if (keyword != null && !keyword.trim().isEmpty()) {
                String kw = "%" + keyword.trim().toLowerCase() + "%";
                Join<Payment, User> userJoin = root.join("user", JoinType.LEFT);
                Predicate emailPredicate = cb.like(cb.lower(userJoin.get("email")), kw);
                Predicate namePredicate = cb.like(cb.lower(userJoin.get("fullName")), kw);

                Predicate kwPredicate;
                try {
                    Long orderVal = Long.parseLong(keyword.trim());
                    Predicate orderPredicate = cb.equal(root.get("orderCode"), orderVal);
                    kwPredicate = cb.or(emailPredicate, namePredicate, orderPredicate);
                } catch (NumberFormatException e) {
                    kwPredicate = cb.or(emailPredicate, namePredicate);
                }
                predicates.add(kwPredicate);
            }

            // Tránh N+1 bằng fetch join khi không phải count query
            if (query != null && query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("user", JoinType.LEFT);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
