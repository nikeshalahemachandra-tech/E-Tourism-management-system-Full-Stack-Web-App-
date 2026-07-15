<?php
/**
 * payments_api.php  –  Explore Sri Lanka
 * Place this file at:  /php/payments_api.php
 *
 * DB Tables used:
 *   bookings  – guest + stay details
 *   payments  – payment method + status
 *
 * GET  ?action=stats           → KPI numbers for dashboard
 * GET  ?action=list            → paginated payments list (+ filters)
 * GET  ?action=get&id=N        → single payment detail
 * GET  ?action=invoice&invoice=INV-XXXX → full invoice by invoice_number
 *
 * POST ?action=save            → create booking + payment (from payment page)
 * POST ?action=cancel          → cancel booking
 * POST ?action=update_status   → change payment_status
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/db.php';   // defines $pdo (PDO)

session_start();
// Uncomment to enforce admin-only access on admin actions:
// $adminActions = ['list','get','invoice','stats','cancel','update_status'];
// if (in_array($action, $adminActions) && empty($_SESSION['admin_id'])) {
//     http_response_code(401);
//     echo json_encode(['success'=>false,'message'=>'Unauthorized']);
//     exit;
// }

// ── Helper ───────────────────────────────────────────────────────────────────
function resp(bool $ok, $data = null, string $msg = ''): void {
    echo json_encode(['success' => $ok, 'data' => $data, 'message' => $msg]);
    exit;
}

$action = $_GET['action'] ?? 'list';

// ═════════════════════════════════════════════════════════════════════════════
//  GET ACTIONS
// ═════════════════════════════════════════════════════════════════════════════
if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    // ── STATS ────────────────────────────────────────────────────────────────
    if ($action === 'stats') {
        $stats = [];

        // total revenue from completed payments
        $r = $pdo->query("SELECT COALESCE(SUM(amount_paid),0) AS rev FROM payments WHERE payment_status='completed'")->fetch(PDO::FETCH_ASSOC);
        $stats['total_revenue'] = (float)$r['rev'];

        // bookings by status
        $rows = $pdo->query("SELECT booking_status, COUNT(*) AS cnt FROM bookings GROUP BY booking_status")->fetchAll(PDO::FETCH_ASSOC);
        $stats['bookings_by_status'] = [];
        foreach ($rows as $r) $stats['bookings_by_status'][$r['booking_status']] = (int)$r['cnt'];

        // payments by status
        $rows = $pdo->query("SELECT payment_status, COUNT(*) AS cnt FROM payments GROUP BY payment_status")->fetchAll(PDO::FETCH_ASSOC);
        $stats['payments_by_status'] = [];
        foreach ($rows as $r) $stats['payments_by_status'][$r['payment_status']] = (int)$r['cnt'];

        // totals
        $stats['total_bookings']    = (int)$pdo->query("SELECT COUNT(*) FROM bookings")->fetchColumn();
        $stats['total_payments']    = (int)$pdo->query("SELECT COUNT(*) FROM payments")->fetchColumn();
        $stats['pending_payments']  = (int)$pdo->query("SELECT COUNT(*) FROM payments WHERE payment_status='pending'")->fetchColumn();
        $stats['cancelled_bookings']= (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE booking_status='cancelled'")->fetchColumn();

        resp(true, $stats);
    }

    // ── LIST ─────────────────────────────────────────────────────────────────
    if ($action === 'list') {
        $page   = max(1, (int)($_GET['page']  ?? 1));
        $limit  = max(1, min(100, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        $where  = [];
        $params = [];

        if (!empty($_GET['status'])) {
            $where[]  = 'p.payment_status = :status';
            $params[':status'] = $_GET['status'];
        }
        if (!empty($_GET['method'])) {
            $where[]  = 'p.payment_method = :method';
            $params[':method'] = $_GET['method'];
        }
        if (!empty($_GET['search'])) {
            $s = '%' . $_GET['search'] . '%';
            $where[] = '(p.invoice_number LIKE :s1 OR b.guest_email LIKE :s2 OR b.guest_fname LIKE :s3 OR b.guest_lname LIKE :s4 OR b.hotel_name LIKE :s5)';
            $params[':s1']=$s; $params[':s2']=$s; $params[':s3']=$s; $params[':s4']=$s; $params[':s5']=$s;
        }

        $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM payments p JOIN bookings b ON b.id=p.booking_id $whereSQL");
        $cntStmt->execute($params);
        $total = (int)$cntStmt->fetchColumn();

        $sql = "
            SELECT
                p.id, p.booking_id, p.invoice_number,
                p.payment_method, p.payment_status, p.amount_paid, p.currency,
                p.card_last4, p.card_brand, p.paypal_email,
                p.bank_reference, p.crypto_coin, p.transaction_id,
                p.paid_at, p.notes, p.created_at, p.updated_at,
                b.guest_fname, b.guest_lname, b.guest_email, b.guest_phone,
                b.hotel_name, b.hotel_location,
                b.checkin_date, b.checkout_date,
                b.num_nights, b.num_rooms, b.num_guests, b.room_rate,
                b.subtotal, b.tax_amount, b.discount_code, b.discount_amount, b.total_amount,
                b.booking_status, b.cancel_reason
            FROM payments p
            JOIN bookings b ON b.id = p.booking_id
            $whereSQL
            ORDER BY p.created_at DESC
            LIMIT :limit OFFSET :offset
        ";
        $stmt = $pdo->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        resp(true, [
            'items'       => $rows,
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int)ceil($total / $limit)
        ]);
    }

    // ── GET SINGLE ───────────────────────────────────────────────────────────
    if ($action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) resp(false, null, 'Missing id');

        $stmt = $pdo->prepare("
            SELECT p.*, b.guest_fname, b.guest_lname, b.guest_email, b.guest_phone,
                   b.hotel_name, b.hotel_location,
                   b.checkin_date, b.checkout_date,
                   b.num_nights, b.num_rooms, b.num_guests, b.room_rate,
                   b.subtotal, b.tax_amount, b.discount_code, b.discount_amount, b.total_amount,
                   b.booking_status, b.cancel_reason
            FROM payments p
            JOIN bookings b ON b.id = p.booking_id
            WHERE p.id = :id
        ");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) resp(false, null, 'Payment not found');
        resp(true, $row);
    }

    // ── INVOICE (by invoice_number) ──────────────────────────────────────────
    if ($action === 'invoice') {
        $inv = trim($_GET['invoice'] ?? '');
        if (!$inv) resp(false, null, 'Missing invoice number');

        $stmt = $pdo->prepare("
            SELECT p.*, b.guest_fname, b.guest_lname, b.guest_email, b.guest_phone,
                   b.hotel_name, b.hotel_location,
                   b.checkin_date, b.checkout_date,
                   b.num_nights, b.num_rooms, b.num_guests, b.room_rate,
                   b.subtotal, b.tax_amount, b.discount_code, b.discount_amount, b.total_amount,
                   b.booking_status, b.cancel_reason,
                   b.created_at AS booking_date
            FROM bookings b
            LEFT JOIN payments p ON p.booking_id = b.id
            WHERE b.invoice_number = :inv
            ORDER BY p.created_at DESC
            LIMIT 1
        ");
        $stmt->execute([':inv' => $inv]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) resp(false, null, 'Invoice not found');
        resp(true, $row);
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  POST ACTIONS
// ═════════════════════════════════════════════════════════════════════════════
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $body['action'] ?? ($_GET['action'] ?? '');

    // ── SAVE (from payment page) ─────────────────────────────────────────────
    if ($action === 'save') {

        // Validate required fields
        $required = ['guest_fname','guest_lname','guest_email',
                     'hotel_name','checkin_date','checkout_date',
                     'total_amount','payment_method'];
        foreach ($required as $f) {
            if (empty($body[$f])) resp(false, null, "Missing required field: $f");
        }

        // Generate next invoice number
        $year = date('Y');
        $lastInv = $pdo->query(
            "SELECT invoice_number FROM bookings ORDER BY id DESC LIMIT 1"
        )->fetchColumn();
        $lastNum = 0;
        if ($lastInv && preg_match('/(\d+)$/', $lastInv, $m)) {
            $lastNum = (int)$m[1];
        }
        $invoiceNumber = 'INV-' . $year . '-' . str_pad($lastNum + 1, 6, '0', STR_PAD_LEFT);

        // Parse values — match exact bookings column types
        $nights   = max(1, (int)($body['num_nights']      ?? 1));
        $rooms    = max(1, (int)($body['num_rooms']        ?? 1));
        $guests   = max(1, (int)($body['num_guests']       ?? 1));
        $rate     = round((float)($body['room_rate']       ?? 0), 2);
        $subtotal = round((float)($body['subtotal']        ?? 0), 2);
        $discount = round((float)($body['discount_amount'] ?? 0), 2);
        $tax      = round((float)($body['tax_amount']      ?? 0), 2);
        $total    = round((float)($body['total_amount']    ?? 0), 2);
        $dcode    = trim($body['discount_code']  ?? '') ?: '';
        $phone    = trim($body['guest_phone']    ?? '') ?: '';
        $loc      = trim($body['hotel_location'] ?? '') ?: '';

        // Payment fields
        $method   = $body['payment_method'];   // card|paypal|bank_transfer|crypto
        $last4    = $body['card_last4']    ?? null;
        $brand    = $body['card_brand']    ?? null;
        $ppEmail  = $body['paypal_email']  ?? null;
        $bankRef  = $body['bank_reference']?? null;
        $crypto   = $body['crypto_coin']   ?? null;
        $txnId    = 'TXN-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
        $paidAt   = date('Y-m-d H:i:s');

        try {
            $pdo->beginTransaction();

            // 1. Insert into bookings
            $s = $pdo->prepare("
                INSERT INTO bookings
                  (invoice_number,
                   guest_fname, guest_lname, guest_email, guest_phone,
                   hotel_name, hotel_location,
                   checkin_date, checkout_date,
                   num_nights, num_rooms, num_guests, room_rate,
                   subtotal, tax_amount, discount_code, discount_amount, total_amount,
                   booking_status)
                VALUES
                  (:inv,
                   :fname, :lname, :email, :phone,
                   :hotel, :loc,
                   :ci, :co,
                   :nights, :rooms, :guests, :rate,
                   :sub, :tax, :dcode, :disc, :total,
                   'confirmed')
            ");
            $s->execute([
                ':inv'    => $invoiceNumber,
                ':fname'  => trim($body['guest_fname']),
                ':lname'  => trim($body['guest_lname']),
                ':email'  => trim($body['guest_email']),
                ':phone'  => $phone,
                ':hotel'  => trim($body['hotel_name']),
                ':loc'    => $loc,
                ':ci'     => $body['checkin_date'],
                ':co'     => $body['checkout_date'],
                ':nights' => $nights,
                ':rooms'  => $rooms,
                ':guests' => $guests,
                ':rate'   => $rate,
                ':sub'    => $subtotal,
                ':tax'    => $tax,
                ':dcode'  => $dcode,
                ':disc'   => $discount,
                ':total'  => $total,
            ]);
            $bookingId = (int)$pdo->lastInsertId();

            // 2. Insert into payments
            $s2 = $pdo->prepare("
                INSERT INTO payments
                  (booking_id, invoice_number,
                   payment_method, payment_status,
                   amount_paid, currency,
                   card_last4, card_brand,
                   paypal_email, bank_reference, crypto_coin,
                   transaction_id, paid_at)
                VALUES
                  (:bid, :inv,
                   :method, 'completed',
                   :amount, 'USD',
                   :last4, :brand,
                   :pp, :bank, :crypto,
                   :txn, :paid)
            ");
            $s2->execute([
                ':bid'    => $bookingId,
                ':inv'    => $invoiceNumber,
                ':method' => $method,
                ':amount' => $total,
                ':last4'  => $last4,
                ':brand'  => $brand,
                ':pp'     => $ppEmail,
                ':bank'   => $bankRef,
                ':crypto' => $crypto,
                ':txn'    => $txnId,
                ':paid'   => $paidAt,
            ]);

            $pdo->commit();

            resp(true, [
                'invoice_number' => $invoiceNumber,
                'booking_id'     => $bookingId,
                'transaction_id' => $txnId,
            ], 'Booking saved successfully');

        } catch (Exception $e) {
            $pdo->rollBack();
            resp(false, null, 'DB error: ' . $e->getMessage());
        }
    }

    // ── CANCEL BOOKING ───────────────────────────────────────────────────────
    if ($action === 'cancel') {
        $bookingId = (int)($body['booking_id'] ?? 0);
        $reason    = trim($body['reason']      ?? 'Cancelled by admin');
        if (!$bookingId) resp(false, null, 'Missing booking_id');

        try {
            $pdo->beginTransaction();

            $pdo->prepare(
                "UPDATE bookings SET booking_status='cancelled', cancel_reason=:r WHERE id=:id"
            )->execute([':r' => $reason, ':id' => $bookingId]);

            $pdo->prepare(
                "UPDATE payments SET payment_status='cancelled'
                 WHERE booking_id=:id AND payment_status NOT IN ('refunded','completed')"
            )->execute([':id' => $bookingId]);

            $pdo->commit();
            resp(true, null, 'Booking cancelled successfully');
        } catch (Exception $e) {
            $pdo->rollBack();
            resp(false, null, 'DB error: ' . $e->getMessage());
        }
    }

    // ── UPDATE PAYMENT STATUS ────────────────────────────────────────────────
    if ($action === 'update_status') {
        $paymentId = (int)($body['payment_id'] ?? 0);
        $status    = $body['status'] ?? '';
        $allowed   = ['pending','completed','failed','refunded','cancelled'];
        if (!$paymentId)                  resp(false, null, 'Missing payment_id');
        if (!in_array($status, $allowed)) resp(false, null, 'Invalid status value');

        $paidAt = ($status === 'completed') ? date('Y-m-d H:i:s') : null;
        $pdo->prepare(
            "UPDATE payments SET payment_status=:st, paid_at=:pa WHERE id=:id"
        )->execute([':st' => $status, ':pa' => $paidAt, ':id' => $paymentId]);

        resp(true, null, 'Status updated successfully');
    }
}

resp(false, null, 'Unknown or unsupported action');