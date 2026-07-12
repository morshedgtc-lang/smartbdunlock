<?php
session_start();

require_once __DIR__ . '/database.php';

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function jsonError($message, $code = 400) {
    jsonResponse(['error' => $message], $code);
}

function requireAuth() {
    if (!isset($_SESSION['user_id'])) {
        jsonError('Unauthorized', 401);
    }
    return [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'],
        'name' => $_SESSION['user_name'],
        'role' => $_SESSION['user_role'],
    ];
}

function requireAdmin() {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        jsonError('Forbidden', 403);
    }
    return $user;
}

function getInput() {
    $input = json_decode(file_get_contents('php://input'), true);
    return $input ?: [];
}

function generateId() {
    return bin2hex(random_bytes(12));
}
