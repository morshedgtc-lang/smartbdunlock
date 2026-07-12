<?php
require_once __DIR__ . '/../../config/auth.php';

session_destroy();
jsonResponse(['message' => 'Logged out']);
