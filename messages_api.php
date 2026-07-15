<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = "localhost";
$user = "root";
$pass = "";
$dbname = "explore_srilanka_db";
// $port = 3307;

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

$action = $_GET['action'] ?? '';
$json = json_decode(file_get_contents('php://input'), true) ?? [];

function getParam($key, $json, $default = '')
{
    return trim($json[$key] ?? $_POST[$key] ?? $default);
}

// ── SEND ──────────────────────────────────────────────
if ($action == 'send') {
    $name = getParam('name', $json);
    $email = getParam('email', $json);
    $subject = getParam('subject', $json, 'No Subject');
    $message = getParam('message', $json);

    if (empty($name) || empty($email) || empty($message)) {
        echo json_encode(["success" => false, "message" => "Please fill all required fields."]);
        exit();
    }

    $stmt = $conn->prepare("INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
        exit();
    }

    $stmt->bind_param("ssss", $name, $email, $subject, $message);
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Message sent successfully!", "id" => $conn->insert_id]);
    } else {
        echo json_encode(["success" => false, "message" => "DB Error: " . $stmt->error]);
    }
    $stmt->close();

    // ── FETCH ─────────────────────────────────────────────
} elseif ($action == 'fetch') {
    $sql = "SELECT id, name, email, subject, message, status, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as date FROM contact_messages ORDER BY id DESC";
    $result = $conn->query($sql);

    if (!$result) {
        echo json_encode(["success" => false, "message" => "Query failed: " . $conn->error]);
        exit();
    }

    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }
    echo json_encode(["success" => true, "data" => $messages, "count" => count($messages)]);

    // ── MARK READ ─────────────────────────────────────────
} elseif ($action == 'mark_read') {
    $id = (int) getParam('id', $json, 0);
    if ($id <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid ID."]);
        exit();
    }

    $stmt = $conn->prepare("UPDATE contact_messages SET status = 'read' WHERE id = ?");
    $stmt->bind_param("i", $id);
    $result = $stmt->execute();
    echo json_encode(["success" => $result, "message" => $result ? "Marked as read." : "Update failed: " . $stmt->error]);
    $stmt->close();

    // ── DELETE ────────────────────────────────────────────
} elseif ($action == 'delete') {
    $id = (int) getParam('id', $json, 0);
    if ($id <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid ID."]);
        exit();
    }

    $stmt = $conn->prepare("DELETE FROM contact_messages WHERE id = ?");
    $stmt->bind_param("i", $id);
    $result = $stmt->execute();
    echo json_encode(["success" => $result, "message" => $result ? "Deleted." : "Delete failed: " . $stmt->error]);
    $stmt->close();

    // ── STATS ─────────────────────────────────────────────
} elseif ($action == 'stats') {
    $total = $conn->query("SELECT COUNT(*) as c FROM contact_messages")->fetch_assoc()['c'];
    $unread = $conn->query("SELECT COUNT(*) as c FROM contact_messages WHERE status='unread'")->fetch_assoc()['c'];
    echo json_encode(["success" => true, "total" => (int) $total, "unread" => (int) $unread]);

} else {
    echo json_encode(["success" => false, "message" => "Invalid action: " . htmlspecialchars($action)]);
}

$conn->close();
?>