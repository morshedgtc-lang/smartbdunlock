<?php
require_once __DIR__ . '/../config/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

if ($method === 'GET') {
    $search = $_GET['search'] ?? '';
    $status = $_GET['status'] ?? '';
    $limit = min(500, max(1, (int)($_GET['limit'] ?? 500)));

    $where = [];
    $params = [];

    if ($search) {
        $where[] = '(name LIKE ? OR email LIKE ?)';
        $s = "%$search%";
        $params[] = $s;
        $params[] = $s;
    }
    if ($status) {
        $where[] = 'status = ?';
        $params[] = $status;
    }

    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $params[] = $limit;

    $sql = "SELECT s.*,
                   (SELECT COUNT(*) FROM Service WHERE supplierId = s.id) as serviceCount,
                   (SELECT COUNT(*) FROM Order WHERE supplierId = s.id) as orderCount
            FROM Supplier s $whereSql ORDER BY priority ASC LIMIT ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $suppliers = $stmt->fetchAll();

    jsonResponse(['suppliers' => $suppliers]);
}

if ($method === 'POST') {
    if ($user['role'] !== 'admin') {
        jsonError('Forbidden', 403);
    }

    $input = getInput();
    $name = $input['name'] ?? '';
    $type = $input['type'] ?? '';
    $email = $input['email'] ?? null;
    $phone = $input['phone'] ?? null;
    $website = $input['website'] ?? null;
    $apiKey = $input['apiKey'] ?? null;
    $priority = $input['priority'] ?? 1;

    if (!$name || !$type) {
        jsonError('Name and type are required');
    }

    $id = generateId();
    $stmt = $pdo->prepare('INSERT INTO Supplier (id, name, email, phone, website, type, apiKey, priority, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))');
    $stmt->execute([$id, $name, $email, $phone, $website, $type, $apiKey, $priority]);

    $stmt = $pdo->prepare('SELECT * FROM Supplier WHERE id = ?');
    $stmt->execute([$id]);
    $supplier = $stmt->fetch();

    jsonResponse($supplier, 201);
}

if ($method === 'PATCH') {
    if ($user['role'] !== 'admin') {
        jsonError('Forbidden', 403);
    }

    $input = getInput();
    $id = $input['id'] ?? '';
    unset($input['id']);

    if (!$id) {
        jsonError('Supplier ID is required');
    }

    $updates = [];
    $params = [];
    foreach ($input as $key => $value) {
        $updates[] = "`$key` = ?";
        $params[] = $value;
    }

    if (!empty($updates)) {
        $updates[] = 'updatedAt = datetime(\'now\')';
        $params[] = $id;
        $sql = 'UPDATE Supplier SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    $stmt = $pdo->prepare('SELECT * FROM Supplier WHERE id = ?');
    $stmt->execute([$id]);
    $supplier = $stmt->fetch();

    jsonResponse($supplier);
}

if ($method === 'DELETE') {
    if ($user['role'] !== 'admin') {
        jsonError('Forbidden', 403);
    }

    $id = $_GET['id'] ?? '';
    if (!$id) {
        jsonError('Supplier ID is required');
    }

    $stmt = $pdo->prepare('SELECT COUNT(*) FROM Service WHERE supplierId = ?');
    $stmt->execute([$id]);
    if ((int)$stmt->fetchColumn() > 0) {
        jsonError('Cannot delete supplier with active services');
    }

    $stmt = $pdo->prepare('DELETE FROM Supplier WHERE id = ?');
    $stmt->execute([$id]);

    jsonResponse(['message' => 'Supplier deleted successfully']);
}

jsonError('Method not allowed', 405);
