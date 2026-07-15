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

$email = trim($data["email"] ?? "");
$pw = trim($data["password"] ?? "");

if (!$email || !$pw) {
    echo json_encode(["success" => false, "message" => "Please fill in all fields."]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($pw, $user["password"])) {
        echo json_encode(["success" => false, "message" => "Incorrect email or password."]);
        exit;
    }

    $_SESSION["user_id"] = $user["id"];
    $_SESSION["user_name"] = $user["username"];
    $_SESSION["user_email"] = $user["email"];
    $_SESSION["user_role"] = $user["role"] ?? "user";

    try {
        $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")
            ->execute([$user["id"]]);
    } catch (Exception $e) {
    }

    echo json_encode([
        "success" => true,
        "message" => "Welcome back, " . $user["username"] . "!",
        "user" => [
            "name" => $user["username"],
            "email" => $user["email"],
            "role" => $user["role"] ?? "user"
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>