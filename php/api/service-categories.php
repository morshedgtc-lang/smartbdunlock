<?php
require_once __DIR__ . '/../config/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

if ($method === 'GET') {
    $limit = min(200, max(1, (int)($_GET['limit'] ?? 200)));

    $sql = "SELECT sc.*,
                   (SELECT COUNT(*) FROM Service WHERE categoryId = sc.id) as serviceCount
            FROM ServiceCategory sc
            ORDER BY sc.name ASC
            LIMIT $limit";
    $categories = $pdo->query($sql)->fetchAll();

    jsonResponse(['categories' => $categories]);
}

if ($method === 'POST') {
    if ($user['role'] !== 'admin') {
        jsonError('Forbidden', 403);
    }

    $input = getInput();
    $name = trim($input['name'] ?? '');

    if (!$name) {
        jsonError('Category name is required');
    }

    $stmt = $pdo->prepare('SELECT id FROM ServiceCategory WHERE name = ?');
    $stmt->execute([$name]);
    if ($stmt->fetch()) {
        jsonError('Category already exists', 409);
    }

    $id = generateId();
    $stmt = $pdo->prepare('INSERT INTO ServiceCategory (id, name, createdAt, updatedAt) VALUES (?, ?, datetime(\'now\'), datetime(\'now\'))');
    $stmt->execute([$id, $name]);

    $stmt = $pdo->prepare('SELECT * FROM ServiceCategory WHERE id = ?');
    $stmt->execute([$id]);
    $category = $stmt->fetch();

    jsonResponse($category, 201);
}

if ($method === 'PATCH') {
    if ($user['role'] !== 'admin') {
        jsonError('Forbidden', 403);
    }

    $input = getInput();
    $id = $input['id'] ?? '';
    $name = trim($input['name'] ?? '');

    if (!$id) {
        jsonError('Category ID is required');
    }
    if (!$name) {
        jsonError('Category name is required');
    }

    $stmt = $pdo->prepare('SELECT id FROM ServiceCategory WHERE name = ? AND id != ?');
    $stmt->execute([$name, $id]);
    if ($stmt->fetch()) {
        jsonError('Category name already exists', 409);
    }

    $stmt = $pdo->prepare('UPDATE ServiceCategory SET name = ?, updatedAt = datetime(\'now\') WHERE id = ?');
    $stmt->execute([$name, $id]);

    $stmt = $pdo->prepare('SELECT * FROM ServiceCategory WHERE id = ?');
    $stmt->execute([$id]);
    $category = $stmt->fetch();

    jsonResponse($category);
}

if ($method === 'DELETE') {
    if ($user['role'] !== 'admin') {
        jsonError('Forbidden', 403);
    }

    $id = $_GET['id'] ?? '';
    if (!$id) {
        jsonError('Category ID is required');
    }

    $stmt = $pdo->prepare('SELECT COUNT(*) FROM Service WHERE categoryId = ?');
    $stmt->execute([$id]);
    $count = (int)$stmt->fetchColumn();

    if ($count > 0) {
        jsonError("Cannot delete category with $count service(s). Reassign or remove them first.");
    }

    $stmt = $pdo->prepare('DELETE FROM ServiceCategory WHERE id = ?');
    $stmt->execute([$id]);

    jsonResponse(['message' => 'Category deleted successfully']);
}

jsonError('Method not allowed', 405);
