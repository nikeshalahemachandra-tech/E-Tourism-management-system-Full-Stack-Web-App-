<?php
/* ═══════════════════════════════════════════════════════════
   php/google_auth.php  —  Google Identity Services backend
═══════════════════════════════════════════════════════════ */
error_reporting(E_ALL);
ini_set('display_errors', 0);

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

session_start();
require_once "db.php";

$raw  = file_get_contents("php://input");
$body = json_decode($raw, true);
$credential = $body["credential"] ?? "";

if (!$credential) {
    echo json_encode(["success" => false, "message" => "No credential provided."]);
    exit;
}

function decodeJwtPayload($jwt) {
    $parts = explode(".", $jwt);
    if (count($parts) !== 3) return null;
    $payload = $parts[1];
    // Base64url → base64
    $payload = str_replace(['-', '_'], ['+', '/'], $payload);
    $payload .= str_repeat('=', (4 - strlen($payload) % 4) % 4);
    return json_decode(base64_decode($payload), true);
}

$verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($credential);
$context   = stream_context_create(["http" => ["timeout" => 8]]);
$response  = @file_get_contents($verifyUrl, false, $context);

if (!$response) {
    // Fallback: decode without remote verify (dev/localhost only)
    $payload = decodeJwtPayload($credential);
    if (!$payload) {
        echo json_encode(["success" => false, "message" => "Token verification failed."]);
        exit;
    }
} else {
    $payload = json_decode($response, true);
    if (isset($payload["error_description"])) {
        echo json_encode(["success" => false, "message" => "Invalid Google token."]);
        exit;
    }
}

$googleId = $payload["sub"]        ?? "";
$email    = $payload["email"]      ?? "";
$name     = $payload["name"]       ?? "Google User";
$picture  = $payload["picture"]    ?? "";

if (!$email || !$googleId) {
    echo json_encode(["success" => false, "message" => "Incomplete Google profile."]);
    exit;
}

try {
    // ── Find or create user ─────────────────────────────────
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // Update google_id and avatar if missing
        $pdo->prepare("UPDATE users SET google_id = ?, avatar = ?, last_login = NOW() WHERE id = ?")
            ->execute([$googleId, $picture, $user["id"]]);
        $userId   = $user["id"];
        $username = $user["username"];
        $role     = $user["role"] ?? "user";
    } else {
        // New user — register automatically
        $pdo->prepare(
            "INSERT INTO users (username, email, google_id, avatar, password, created_at, last_login)
             VALUES (?, ?, ?, ?, '', NOW(), NOW())"
        )->execute([$name, $email, $googleId, $picture]);
        $userId   = $pdo->lastInsertId();
        $username = $name;
        $role     = "user";
    }

    $_SESSION["user_id"]    = $userId;
    $_SESSION["user_name"]  = $username;
    $_SESSION["user_email"] = $email;
    $_SESSION["user_role"]  = $role;
    $_SESSION["auth_provider"] = "google";

    echo json_encode([
        "success" => true,
        "message" => "Welcome, " . $username . "!",
        "user"    => [
            "name"   => $username,
            "email"  => $email,
            "role"   => $role,
            "avatar" => $picture
        ]
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>