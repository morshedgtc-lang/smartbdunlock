<?php
require_once __DIR__ . '/../config/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT walletBalance FROM User WHERE id = ?');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();
    $balance = $row ? $row['walletBalance'] : 0;

    $stmt = $pdo->prepare('SELECT * FROM Transaction WHERE userId = ? ORDER BY createdAt DESC LIMIT 20');
    $stmt->execute([$user['id']]);
    $transactions = $stmt->fetchAll();

    jsonResponse(['balance' => (float)$balance, 'transactions' => $transactions]);
}

if ($method === 'POST') {
    $input = getInput();
    $type = $input['type'] ?? '';
    $amount = $input['amount'] ?? 0;
    $description = $input['description'] ?? '';
    $targetUserId = $input['targetUserId'] ?? null;

    $allowed = ['deposit', 'withdraw', 'transfer'];
    if (!in_array($type, $allowed)) {
        jsonError('Invalid transaction type');
    }
    if (!is_numeric($amount) || $amount <= 0) {
        jsonError('Amount must be a positive number');
    }
    $amount = (float)$amount;

    if (($type === 'deposit' || $type === 'withdraw') && $user['role'] !== 'admin') {
        jsonError('Only admin can deposit or withdraw funds', 403);
    }

    try {
        $pdo->beginTransaction();

        if ($type === 'transfer') {
            if (!$targetUserId) {
                jsonError('Target user ID is required for transfers');
            }
            if ($targetUserId === $user['id']) {
                jsonError('Cannot transfer funds to yourself');
            }

            $stmt = $pdo->prepare('SELECT id, resellerId FROM User WHERE id = ?');
            $stmt->execute([$targetUserId]);
            $target = $stmt->fetch();
            if (!$target) {
                $pdo->rollBack();
                jsonError('Target user not found', 404);
            }
            if ($user['role'] === 'reseller' && $target['resellerId'] !== $user['id']) {
                $pdo->rollBack();
                jsonError('You can only transfer to your assigned users', 403);
            }

            // Debit sender
            $stmt = $pdo->prepare('UPDATE User SET walletBalance = walletBalance - ? WHERE id = ? AND walletBalance >= ?');
            $stmt->execute([$amount, $user['id'], $amount]);
            if ($stmt->rowCount() === 0) {
                $pdo->rollBack();
                jsonError('Insufficient balance');
            }

            $stmt = $pdo->prepare('SELECT walletBalance FROM User WHERE id = ?');
            $stmt->execute([$user['id']]);
            $senderBalance = $stmt->fetch()['walletBalance'];

            $stmt = $pdo->prepare('INSERT INTO Transaction (id, userId, type, amount, balanceAfter, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))');
            $stmt->execute([generateId(), $user['id'], 'transfer', -$amount, $senderBalance, $description ?: 'Transfer to user']);

            // Credit target
            $stmt = $pdo->prepare('UPDATE User SET walletBalance = walletBalance + ? WHERE id = ?');
            $stmt->execute([$amount, $targetUserId]);

            $stmt = $pdo->prepare('SELECT walletBalance FROM User WHERE id = ?');
            $stmt->execute([$targetUserId]);
            $targetBalance = $stmt->fetch()['walletBalance'];

            $stmt->execute([generateId(), $targetUserId, 'deposit', $amount, $targetBalance, $description ?: 'Transfer from reseller']);

            $pdo->commit();
            jsonResponse(['success' => true], 201);
        }

        // Deposit or withdraw
        $delta = $type === 'deposit' ? $amount : -$amount;

        if ($delta < 0) {
            $stmt = $pdo->prepare('UPDATE User SET walletBalance = walletBalance + ? WHERE id = ? AND walletBalance >= ?');
            $stmt->execute([$delta, $user['id'], -$delta]);
            if ($stmt->rowCount() === 0) {
                $pdo->rollBack();
                jsonError('Insufficient balance');
            }
        } else {
            $stmt = $pdo->prepare('UPDATE User SET walletBalance = walletBalance + ? WHERE id = ?');
            $stmt->execute([$delta, $user['id']]);
        }

        $stmt = $pdo->prepare('SELECT walletBalance FROM User WHERE id = ?');
        $stmt->execute([$user['id']]);
        $newBalance = $stmt->fetch()['walletBalance'];

        $stmt = $pdo->prepare('INSERT INTO Transaction (id, userId, type, amount, balanceAfter, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))');
        $stmt->execute([generateId(), $user['id'], $type, $delta, $newBalance, $description]);

        $pdo->commit();
        jsonResponse(['success' => true], 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonError('Transaction failed: ' . $e->getMessage(), 500);
    }
}

jsonError('Method not allowed', 405);
