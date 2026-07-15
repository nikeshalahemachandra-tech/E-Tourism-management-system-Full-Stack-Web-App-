<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

session_start();
require_once "db.php";

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

$name = trim($data["name"] ?? "");
$email = trim($data["email"] ?? "");
$pw = trim($data["password"] ?? "");

if (!$name || !$email || !$pw) {
    echo json_encode(["success" => false, "message" => "All fields are required."]);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "message" => "Invalid email address."]);
    exit;
}
if (strlen($pw) < 6) {
    echo json_encode(["success" => false, "message" => "Password must be at least 6 characters."]);
    exit;
}

$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    echo json_encode(["success" => false, "message" => "This email is already registered."]);
    exit;
}

$hashed = password_hash($pw, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())");
$stmt->execute([$name, $email, $hashed]);

$newId = $pdo->lastInsertId();
$_SESSION["user_id"] = $newId;
$_SESSION["user_name"] = $name;
$_SESSION["user_email"] = $email;
$_SESSION["user_role"] = "user";

echo json_encode(["success" => true, "message" => "Account created successfully!"]);
?>