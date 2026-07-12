<?php
require_once __DIR__ . '/../config/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

if ($method === 'GET') {
    $search = $_GET['search'] ?? '';
    $type = $_GET['type'] ?? '';
    $status = $_GET['status'] ?? '';
    $categoryId = $_GET['categoryId'] ?? '';
    $limit = min(500, max(1, (int)($_GET['limit'] ?? 500)));

    $where = [];
    $params = [];

    if ($search) {
        $where[] = '(name LIKE ? OR description LIKE ?)';
        $s = "%$search%";
        $params[] = $s;
        $params[] = $s;
    }
    if ($type) {
        $where[] = 'type = ?';
        $params[] = $type;
    }
    if ($status) {
        $where[] = 'status = ?';
        $params[] = $status;
    }
    if ($categoryId) {
        $where[] = 'categoryId = ?';
        $params[] = $categoryId;
    }

    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $params[] = $limit;

    $sql = "SELECT s.*, sc.name as categoryName, su.name as supplierName, su.status as supplierStatus,
                   (SELECT COUNT(*) FROM Order WHERE serviceId = s.id) as orderCount
            FROM Service s
            LEFT JOIN ServiceCategory sc ON s.categoryId = sc.id
            LEFT JOIN Supplier su ON s.supplierId = su.id
            $whereSql
            ORDER BY s.createdAt DESC LIMIT ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $services = $stmt->fetchAll();

    // Fetch custom fields for each service
    foreach ($services as &$service) {
        $stmt = $pdo->prepare('SELECT * FROM ServiceCustomField WHERE serviceId = ? ORDER BY `order` ASC');
        $stmt->execute([$service['id']]);
        $service['customFields'] = $stmt->fetchAll();
    }

    jsonResponse(['services' => $services]);
}

if ($method === 'POST') {
    if ($user['role'] !== 'admin') {
        jsonError('Forbidden', 403);
    }

    $input = getInput();
    $name = $input['name'] ?? '';
    $description = $input['description'] ?? null;
    $type = $input['type'] ?? '';
    $cost = $input['cost'] ?? 0;
    $sellingPrice = $input['sellingPrice'] ?? 0;
    $processingTime = $input['processingTime'] ?? null;
    $supplierId = $input['supplierId'] ?? null;
    $status = $input['status'] ?? 'active';
    $categoryId = $input['categoryId'] ?? null;
    $customFields = $input['customFields'] ?? [];

    if (!$name || !$type) {
        jsonError('Name, type, cost, and selling price are required');
    }

    try {
        $pdo->beginTransaction();
        $id = generateId();

        $stmt = $pdo->prepare('INSERT INTO Service (id, name, description, type, cost, sellingPrice, processingTime, supplierId, status, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))');
        $stmt->execute([$id, $name, $description, $type, $cost, $sellingPrice, $processingTime, $supplierId, $status, $categoryId]);

        if (!empty($customFields)) {
            $fieldStmt = $pdo->prepare('INSERT INTO ServiceCustomField (id, serviceId, fieldType, label, placeholder, options, required, visibleToClient, `order`, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))');
            foreach ($customFields as $index => $field) {
                $fieldStmt->execute([
                    generateId(), $id,
                    $field['fieldType'], $field['label'],
                    $field['placeholder'] ?? null,
                    isset($field['options']) ? json_encode($field['options']) : null,
                    $field['required'] ?? false,
                    $field['visibleToClient'] ?? true,
                    $field['order'] ?? $index,
                ]);
            }
        }

        $pdo->commit();

        // Return created service
        $stmt = $pdo->prepare('SELECT * FROM Service WHERE id = ?');
        $stmt->execute([$id]);
        $service = $stmt->fetch();

        $stmt = $pdo->prepare('SELECT * FROM ServiceCustomField WHERE serviceId = ? ORDER BY `order` ASC');
        $stmt->execute([$id]);
        $service['customFields'] = $stmt->fetchAll();

        jsonResponse($service, 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonError('Service creation failed', 500);
    }
}

if ($method === 'PATCH') {
    if ($user['role'] !== 'admin') {
        jsonError('Forbidden', 403);
    }

    $input = getInput();
    $id = $input['id'] ?? '';
    $customFields = $input['customFields'] ?? null;
    unset($input['id'], $input['customFields']);

    if (!$id) {
        jsonError('Service ID is required');
    }

    try {
        $pdo->beginTransaction();

        $updates = [];
        $params = [];
        foreach ($input as $key => $value) {
            $updates[] = "`$key` = ?";
            $params[] = $value;
        }

        if (!empty($updates)) {
            $updates[] = 'updatedAt = datetime(\'now\')';
            $params[] = $id;
            $sql = 'UPDATE Service SET ' . implode(', ', $updates) . ' WHERE id = ?';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }

        if ($customFields !== null) {
            $stmt = $pdo->prepare('DELETE FROM ServiceCustomField WHERE serviceId = ?');
            $stmt->execute([$id]);

            if (!empty($customFields)) {
                $fieldStmt = $pdo->prepare('INSERT INTO ServiceCustomField (id, serviceId, fieldType, label, placeholder, options, required, visibleToClient, `order`, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))');
                foreach ($customFields as $index => $field) {
                    $fieldStmt->execute([
                        generateId(), $id,
                        $field['fieldType'], $field['label'],
                        $field['placeholder'] ?? null,
                        isset($field['options']) ? json_encode($field['options']) : null,
                        $field['required'] ?? false,
                        $field['visibleToClient'] ?? true,
                        $field['order'] ?? $index,
                    ]);
                }
            }
        }

        $pdo->commit();

        $stmt = $pdo->prepare('SELECT * FROM Service WHERE id = ?');
        $stmt->execute([$id]);
        $service = $stmt->fetch();

        $stmt = $pdo->prepare('SELECT * FROM ServiceCustomField WHERE serviceId = ? ORDER BY `order` ASC');
        $stmt->execute([$id]);
        $service['customFields'] = $stmt->fetchAll();

        jsonResponse($service);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonError('Service update failed', 500);
    }
}

if ($method === 'DELETE') {
    if ($user['role'] !== 'admin') {
        jsonError('Forbidden', 403);
    }

    $id = $_GET['id'] ?? '';
    if (!$id) {
        jsonError('Service ID is required');
    }

    $stmt = $pdo->prepare('DELETE FROM Service WHERE id = ?');
    $stmt->execute([$id]);

    jsonResponse(['message' => 'Service deleted successfully']);
}

jsonError('Method not allowed', 405);
