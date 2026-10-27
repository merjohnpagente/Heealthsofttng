<?php
/**
 * Database connection settings.
 * Default XAMPP MySQL credentials are host=localhost, user=root, password="" (blank).
 * If you set a MySQL root password in XAMPP, put it below.
 */
$DB_HOST = 'localhost';
$DB_NAME = 'school_clinic';
$DB_USER = 'root';
$DB_PASS = '';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database connection failed. Make sure MySQL is running in XAMPP and that '
                 . 'the "school_clinic" database has been imported (see database/schema.sql).',
        'details' => $e->getMessage(),
    ]);
    exit;
}
