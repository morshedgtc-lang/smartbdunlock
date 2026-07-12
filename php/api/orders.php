<?php
require_once __DIR__ . '/../config/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

if ($method === 'GET') {
    $search = $_GET['search'] ?? '';
    $status = $_GET['status'] ?? '';
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    $where = [];
    $params = [];

    if ($user['role'] !== 'admin') {
        $where[] = 'o.userId = ?';
        $params[] = $user['id'];
    }

    if ($search) {
        $where[] = '(o.orderNumber LIKE ? OR o.imei LIKE ? OR o.deviceInfo LIKE ?)';
        $s = "%$search%";
        $params[] = $s;
        $params[] = $s;
        $params[] = $s;
    }

    if ($status) {
        $where[] = 'o.status = ?';
        $params[] = $status;
    }

    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    // Count
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM Order o $whereSql");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    // Fetch orders with joins
    $sql = "SELECT o.*, s.name as serviceName, s.type as serviceType, su.name as supplierName, u.name as userName, u.email as userEmail
            FROM Order o
            LEFT JOIN Service s ON o.serviceId = s.id
            LEFT JOIN Supplier su ON o.supplierId = su.id
            LEFT JOIN User u ON o.userId = u.id
            $whereSql
            ORDER BY o.createdAt DESC
            LIMIT $limit OFFSET $offset";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll();

    // Fetch custom field values for each order
    foreach ($orders as &$order) {
        $stmt = $pdo->prepare('SELECT ocfv.*, scf.label, scf.fieldType FROM OrderCustomFieldValue ocfv JOIN ServiceCustomField scf ON ocfv.customFieldId = scf.id WHERE ocfv.orderId = ?');
        $stmt->execute([$order['id']]);
        $order['customValues'] = $stmt->fetchAll();
    }

    jsonResponse([
        'orders' => $orders,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => (int)ceil($total / $limit),
        ]
    ]);
}

if ($method === 'POST') {
    $input = getInput();
    $serviceId = $input['serviceId'] ?? '';
    $imei = $input['imei'] ?? '';
    $deviceInfo = $input['deviceInfo'] ?? '';
    $notes = $input['notes'] ?? '';
    $customFieldValues = $input['customFieldValues'] ?? [];

    if (!$serviceId) {
        jsonError('Service ID is required');
    }

    $stmt = $pdo->prepare('SELECT * FROM Service WHERE id = ?');
    $stmt->execute([$serviceId]);
    $service = $stmt->fetch();
    if (!$service) {
        jsonError('Service not found', 404);
    }
    if ($service['status'] !== 'active') {
        jsonError('Service is not available');
    }

    // Check custom field requirements
    $stmt = $pdo->prepare('SELECT * FROM ServiceCustomField WHERE serviceId = ?');
    $stmt->execute([$serviceId]);
    $fields = $stmt->fetchAll();

    foreach ($fields as $field) {
        if ($field['required']) {
            $value = $customFieldValues[$field['id']] ?? '';
            if (!$value || (is_string($value) && !trim($value))) {
                jsonError('Field "' . $field['label'] . '" is required');
            }
        }
    }

    // Validate IMEI fields
    foreach ($fields as $field) {
        $value = $customFieldValues[$field['id']] ?? null;
        if (!$value) continue;

        if ($field['fieldType'] === 'imei_single') {
            $cleaned = preg_replace('/\D/', '', $value);
            if (strlen($cleaned) !== 15) {
                jsonError('IMEI must be exactly 15 digits');
            }
        }
        if ($field['fieldType'] === 'imei_multi') {
            $lines = array_filter(array_map(function($l) { return preg_replace('/\D/', '', trim($l)); }, explode("\n", $value)));
            foreach ($lines as $line) {
                if (strlen($line) !== 15) {
                    jsonError('IMEI "' . $line . '" must be exactly 15 digits');
                }
            }
        }
    }

    // Generate order number
    $today = date('Ymd');
    $dateStart = date('Y-m-d 00:00:00');
    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM Order WHERE createdAt >= ?');
    $countStmt->execute([$dateStart]);
    $orderCount = (int)$countStmt->fetchColumn();
    $orderNumber = 'ORD-' . $today . '-' . str_pad($orderCount + 1, 4, '0', STR_PAD_LEFT);

    // Deduct balance and create order
    try {
        $pdo->beginTransaction();

        $sellingPrice = (float)$service['sellingPrice'];
        $stmt = $pdo->prepare('UPDATE User SET walletBalance = walletBalance - ? WHERE id = ? AND walletBalance >= ?');
        $stmt->execute([$sellingPrice, $user['id'], $sellingPrice]);
        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            jsonError('Insufficient balance');
        }

        $stmt = $pdo->prepare('SELECT walletBalance FROM User WHERE id = ?');
        $stmt->execute([$user['id']]);
        $newBalance = $stmt->fetch()['walletBalance'];

        $stmt = $pdo->prepare('INSERT INTO Transaction (id, userId, type, amount, balanceAfter, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))');
        $stmt->execute([generateId(), $user['id'], 'order_payment', -$sellingPrice, $newBalance, 'Payment for ' . $service['name']]);

        $orderId = generateId();
        $profit = $sellingPrice - (float)$service['cost'];
        $stmt = $pdo->prepare('INSERT INTO Order (id, orderNumber, userId, serviceId, supplierId, imei, deviceInfo, notes, cost, sellingPrice, profit, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))');
        $stmt->execute([$orderId, $orderNumber, $user['id'], $serviceId, $service['supplierId'], $imei, $deviceInfo, $notes, $service['cost'], $sellingPrice, $profit, 'pending']);

        // Save custom field values
        foreach ($fields as $field) {
            $value = $customFieldValues[$field['id']] ?? null;
            if ($value === null) continue;

            if ($field['fieldType'] === 'imei_multi') {
                $uniqueImeis = array_unique(array_filter(array_map(function($l) { return preg_replace('/\D/', '', trim($l)); }, explode("\n", $value))));
                $value = json_encode(array_values($uniqueImeis));
            } elseif ($field['fieldType'] === 'serial_multi') {
                $uniqueSerials = array_unique(array_filter(array_map('trim', explode("\n", $value))));
                $value = json_encode(array_values($uniqueSerials));
            } elseif ($field['fieldType'] === 'multiselect' && is_array($value)) {
                $value = json_encode($value);
            }

            $stmt = $pdo->prepare('INSERT INTO OrderCustomFieldValue (id, orderId, customFieldId, value, createdAt) VALUES (?, ?, ?, ?, datetime(\'now\'))');
            $stmt->execute([generateId(), $orderId, $field['id'], (string)$value]);
        }

        $pdo->commit();

        // Fetch created order
        $stmt = $pdo->prepare('SELECT * FROM Order WHERE id = ?');
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        jsonResponse($order, 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonError('Order creation failed: ' . $e->getMessage(), 500);
    }
}

if ($method === 'PATCH') {
    $input = getInput();
    $id = $input['id'] ?? '';
    $status = $input['status'] ?? null;
    $notes = $input['notes'] ?? null;
    $result = $input['result'] ?? null;

    if (!$id) {
        jsonError('Order ID is required');
    }

    $stmt = $pdo->prepare('SELECT * FROM Order WHERE id = ?');
    $stmt->execute([$id]);
    $order = $stmt->fetch();
    if (!$order) {
        jsonError('Order not found', 404);
    }

    if ($user['role'] !== 'admin' && $order['userId'] !== $user['id']) {
        jsonError('Forbidden', 403);
    }

    $newStatus = $status ?: $order['status'];
    $completedAt = $newStatus === 'completed' ? date('Y-m-d H:i:s') : $order['completedAt'];

    $stmt = $pdo->prepare('UPDATE Order SET status = ?, notes = COALESCE(?, notes), result = COALESCE(?, result), completedAt = ?, updatedAt = datetime(\'now\') WHERE id = ?');
    $stmt->execute([$newStatus, $notes, $result, $completedAt, $id]);

    // Increment supplier orders on completion
    if ($newStatus === 'completed' && $order['status'] !== 'completed' && $order['supplierId']) {
        $stmt = $pdo->prepare('UPDATE Supplier SET totalOrders = totalOrders + 1 WHERE id = ?');
        $stmt->execute([$order['supplierId']]);
    }

    // Refund on fail/cancel from pending/processing
    if (in_array($newStatus, ['failed', 'cancelled']) && in_array($order['status'], ['pending', 'processing'])) {
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare('UPDATE User SET walletBalance = walletBalance + ? WHERE id = ?');
            $stmt->execute([$order['sellingPrice'], $order['userId']]);

            $stmt = $pdo->prepare('SELECT walletBalance FROM User WHERE id = ?');
            $stmt->execute([$order['userId']]);
            $newBalance = $stmt->fetch()['walletBalance'];

            $stmt = $pdo->prepare('INSERT INTO Transaction (id, userId, orderId, type, amount, balanceAfter, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))');
            $stmt->execute([generateId(), $order['userId'], $id, 'order_refund', $order['sellingPrice'], $newBalance, 'Refund for ' . $order['orderNumber']]);
            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
        }
    }

    // Return updated order with joins
    $stmt = $pdo->prepare('SELECT o.*, s.name as serviceName, su.name as supplierName FROM Order o LEFT JOIN Service s ON o.serviceId = s.id LEFT JOIN Supplier su ON o.supplierId = su.id WHERE o.id = ?');
    $stmt->execute([$id]);
    $updated = $stmt->fetch();

    jsonResponse($updated);
}

jsonError('Method not allowed', 405);
