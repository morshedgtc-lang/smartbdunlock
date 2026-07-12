<?php
require_once __DIR__ . '/../config/auth.php';

$user = requireAuth();
$isAdmin = $user['role'] === 'admin';
$userId = $user['id'];

$todayStart = date('Y-m-d 00:00:00');
$monthStart = date('Y-m-01 00:00:00');

$userFilter = $isAdmin ? '' : 'AND userId = ?';
$params = $isAdmin ? [] : [$userId];

// Total users
$totalUsers = $isAdmin
    ? (int)$pdo->query('SELECT COUNT(*) FROM User')->fetchColumn()
    : 1;

// Total orders
$stmt = $pdo->prepare("SELECT COUNT(*) FROM Order WHERE 1=1 $userFilter");
$stmt->execute($params);
$totalOrders = (int)$stmt->fetchColumn();

// Active services
$totalServices = (int)$pdo->query('SELECT COUNT(*) FROM Service WHERE status = "active"')->fetchColumn();

// Total suppliers
$totalSuppliers = $isAdmin
    ? (int)$pdo->query('SELECT COUNT(*) FROM Supplier')->fetchColumn()
    : 0;

// Pending orders
$stmt = $pdo->prepare("SELECT COUNT(*) FROM Order WHERE status = 'pending' $userFilter");
$stmt->execute($params);
$pendingOrders = (int)$stmt->fetchColumn();

// Completed orders
$stmt = $pdo->prepare("SELECT COUNT(*) FROM Order WHERE status = 'completed' $userFilter");
$stmt->execute($params);
$completedOrders = (int)$stmt->fetchColumn();

// Completed today
$stmt = $pdo->prepare("SELECT COUNT(*) FROM Order WHERE status = 'completed' AND completedAt >= ? $userFilter");
$stmt->execute(array_merge([$todayStart], $params));
$completedToday = (int)$stmt->fetchColumn();

// Failed orders
$stmt = $pdo->prepare("SELECT COUNT(*) FROM Order WHERE status = 'failed' $userFilter");
$stmt->execute($params);
$failedOrders = (int)$stmt->fetchColumn();

// Revenue today
$stmt = $pdo->prepare("SELECT COALESCE(SUM(sellingPrice), 0) FROM Order WHERE status = 'completed' AND completedAt >= ? $userFilter");
$stmt->execute(array_merge([$todayStart], $params));
$revenueToday = (float)$stmt->fetchColumn();

// Revenue this month
$stmt = $pdo->prepare("SELECT COALESCE(SUM(sellingPrice), 0) FROM Order WHERE status = 'completed' AND completedAt >= ? $userFilter");
$stmt->execute(array_merge([$monthStart], $params));
$revenueThisMonth = (float)$stmt->fetchColumn();

// Total profit
$stmt = $pdo->prepare("SELECT COALESCE(SUM(profit), 0) FROM Order WHERE status = 'completed' $userFilter");
$stmt->execute($params);
$totalProfit = (float)$stmt->fetchColumn();

// Wallet balance
$stmt = $pdo->prepare('SELECT walletBalance FROM User WHERE id = ?');
$stmt->execute([$userId]);
$walletBalance = (float)$stmt->fetchColumn();

// Recent orders
$recentParams = $params;
$stmt = $pdo->prepare("SELECT o.*, s.name as serviceName, u.name as userName FROM Order o LEFT JOIN Service s ON o.serviceId = s.id LEFT JOIN User u ON o.userId = u.id WHERE 1=1 $userFilter ORDER BY o.createdAt DESC LIMIT 6");
$stmt->execute($recentParams);
$recentOrders = $stmt->fetchAll();

jsonResponse([
    'totalUsers' => $totalUsers,
    'totalOrders' => $totalOrders,
    'totalServices' => $totalServices,
    'totalSuppliers' => $totalSuppliers,
    'pendingOrders' => $pendingOrders,
    'completedOrders' => $completedOrders,
    'completedToday' => $completedToday,
    'failedOrders' => $failedOrders,
    'revenueToday' => $revenueToday,
    'revenueThisMonth' => $revenueThisMonth,
    'totalProfit' => $totalProfit,
    'walletBalance' => $walletBalance,
    'recentOrders' => $recentOrders,
]);
