<?php
/* ═══════════════════════════════════════════════════════════
   php/social_auth.php  —  Facebook Login backend
   Verifies the FB access token and creates/updates a session.
═══════════════════════════════════════════════════════════ */
error_reporting(E_ALL);
ini_set('display_errors', 0);

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

session_start();
require_once "db.php";

// ── Read access token from request ─────────────────────────
$raw         = file_get_contents("php://input");
$body        = json_decode($raw, true);
$accessToken = $body["access_token"] ?? "";

if (!$accessToken) {
    echo json_encode(["success" => false, "message" => "No access token provided."]);
    exit;
}

// ── Fetch user profile from Facebook Graph API ──────────────
$fields   = "id,name,email,picture.type(large)";
$graphUrl = "https://graph.facebook.com/me?fields={$fields}&access_token=" . urlencode($accessToken);
$context  = stream_context_create(["http" => ["timeout" => 8]]);
$response = @file_get_contents($graphUrl, false, $context);

if (!$response) {
    echo json_encode(["success" => false, "message" => "Could not reach Facebook."]);
    exit;
}

$fbUser = json_decode($response, true);

if (isset($fbUser["error"])) {
    echo json_encode(["success" => false, "message" => "Facebook error: " . ($fbUser["error"]["message"] ?? "Unknown")]);
    exit;
}

$fbId   = $fbUser["id"]    ?? "";
$name   = $fbUser["name"]  ?? "Facebook User";
$email  = $fbUser["email"] ?? ($fbId . "@facebook.placeholder");
$avatar = $fbUser["picture"]["data"]["url"] ?? "";

if (!$fbId) {
    echo json_encode(["success" => false, "message" => "Incomplete Facebook profile."]);
    exit;
}

try {
    // ── Find or create user ─────────────────────────────────
    // Try by facebook_id first, then by email
    $stmt = $pdo->prepare("SELECT * FROM users WHERE facebook_id = ? OR email = ?");
    $stmt->execute([$fbId, $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        $pdo->prepare("UPDATE users SET facebook_id = ?, avatar = ?, last_login = NOW() WHERE id = ?")
            ->execute([$fbId, $avatar, $user["id"]]);
        $userId   = $user["id"];
        $username = $user["username"];
        $role     = $user["role"] ?? "user";
    } else {
        $pdo->prepare(
            "INSERT INTO users (username, email, facebook_id, avatar, password, created_at, last_login)
             VALUES (?, ?, ?, ?, '', NOW(), NOW())"
        )->execute([$name, $email, $fbId, $avatar]);
        $userId   = $pdo->lastInsertId();
        $username = $name;
        $role     = "user";
    }

    // ── Set PHP session ─────────────────────────────────────
    $_SESSION["user_id"]       = $userId;
    $_SESSION["user_name"]     = $username;
    $_SESSION["user_email"]    = $email;
    $_SESSION["user_role"]     = $role;
    $_SESSION["auth_provider"] = "facebook";

    echo json_encode([
        "success" => true,
        "message" => "Welcome, " . $username . "!",
        "user"    => [
            "name"   => $username,
            "email"  => $email,
            "role"   => $role,
            "avatar" => $avatar
        ]
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>