<?php
require_once __DIR__ . '/../config/auth.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        jsonError('Forbidden', 403);
    }

    $search = $_GET['search'] ?? '';
    $role = $_GET['role'] ?? '';
    $limit = min(1000, max(1, (int)($_GET['limit'] ?? 500)));

    $where = [];
    $params = [];

    if ($search) {
        $where[] = '(name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        $s = "%$search%";
        $params[] = $s;
        $params[] = $s;
        $params[] = $s;
    }
    if ($role) {
        $where[] = 'role = ?';
        $params[] = $role;
    }

    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $params[] = $limit;

    $sql = "SELECT id, email, name, role, phone, status, walletBalance, resellerId, createdAt,
                   (SELECT COUNT(*) FROM Order WHERE userId = User.id) as orderCount,
                   (SELECT COUNT(*) FROM Transaction WHERE userId = User.id) as transactionCount
            FROM User $whereSql ORDER BY createdAt DESC LIMIT ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    jsonResponse(['users' => $users]);
}

if ($method === 'POST') {
    $user = requireAdmin();
    $input = getInput();

    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    $name = $input['name'] ?? '';
    $phone = $input['phone'] ?? null;
    $role = $input['role'] ?? 'reseller';
    $resellerId = $input['resellerId'] ?? null;

    if (!$email || !$password || !$name) {
        jsonError('Email, password, and name are required');
    }

    $stmt = $pdo->prepare('SELECT id FROM User WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonError('Email already exists', 409);
    }

    $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $id = generateId();

    $stmt = $pdo->prepare('INSERT INTO User (id, email, password, name, phone, role, resellerId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))');
    $stmt->execute([$id, $email, $hashedPassword, $name, $phone, $role, $resellerId]);

    $stmt = $pdo->prepare('SELECT id, email, name, role, status, walletBalance, resellerId FROM User WHERE id = ?');
    $stmt->execute([$id]);
    $newUser = $stmt->fetch();

    jsonResponse($newUser, 201);
}

if ($method === 'PATCH') {
    $user = requireAdmin();
    $input = getInput();

    $id = $input['id'] ?? '';
    if (!$id) {
        jsonError('User ID is required');
    }

    $updates = [];
    $params = [];

    foreach (['name', 'phone', 'role', 'status', 'resellerId'] as $field) {
        if (array_key_exists($field, $input)) {
            $updates[] = "$field = ?";
            $params[] = $input[$field];
        }
    }

    if (!empty($input['password'])) {
        $updates[] = 'password = ?';
        $params[] = password_hash($input['password'], PASSWORD_BCRYPT, ['cost' => 12]);
    }

    if (empty($updates)) {
        jsonError('No fields to update');
    }

    $updates[] = 'updatedAt = datetime(\'now\')';
    $params[] = $id;

    $sql = 'UPDATE User SET ' . implode(', ', $updates) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $stmt = $pdo->prepare('SELECT id, email, name, role, phone, status, walletBalance, resellerId FROM User WHERE id = ?');
    $stmt->execute([$id]);
    $updated = $stmt->fetch();

    jsonResponse($updated);
}

if ($method === 'DELETE') {
    $user = requireAdmin();
    $id = $_GET['id'] ?? '';

    if (!$id) {
        jsonError('User ID is required');
    }
    if ($id === $user['id']) {
        jsonError('Cannot delete your own account');
    }

    $stmt = $pdo->prepare('DELETE FROM User WHERE id = ?');
    $stmt->execute([$id]);

    jsonResponse(['message' => 'User deleted successfully']);
}

jsonError('Method not allowed', 405);
