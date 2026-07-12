<?php
require_once __DIR__ . '/../../config/auth.php';

$user = requireAuth();

$stmt = $pdo->prepare('SELECT id, email, name, role, phone, status, walletBalance FROM User WHERE id = ?');
$stmt->execute([$user['id']]);
$userData = $stmt->fetch();

if (!$userData) {
    jsonError('User not found', 404);
}

jsonResponse(['user' => $userData]);
