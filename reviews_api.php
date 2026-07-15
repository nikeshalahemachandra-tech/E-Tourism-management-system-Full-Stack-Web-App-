<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

$host   = "localhost";
$user   = "root";
$pass   = "";
$dbname = "explore_srilanka_db";
// $port   = 3307;

$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB connection failed: " . $conn->connect_error]);
    exit();
}

$action = $_GET['action'] ?? '';
$input  = json_decode(file_get_contents('php://input'), true) ?? [];

// ─────────────────────────────────────────────
// FETCH reviews for a destination
// GET ?action=fetch&destination_id=5
// ─────────────────────────────────────────────
if ($action === 'fetch') {
    $dest_id = (int)($_GET['destination_id'] ?? 0);
    if ($dest_id <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid destination_id."]);
        exit();
    }

    $stmt = $conn->prepare(
        "SELECT id, reviewer_name, rating, review_text, created_at
         FROM destination_reviews
         WHERE destination_id = ?
         ORDER BY created_at DESC"
    );
    $stmt->bind_param("i", $dest_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $reviews = [];
    while ($row = $result->fetch_assoc()) {
        $reviews[] = [
            "id"            => (int)$row['id'],
            "reviewer_name" => $row['reviewer_name'],
            "rating"        => (int)$row['rating'],
            "review_text"   => $row['review_text'],
            "created_at"    => $row['created_at'],
        ];
    }
    $stmt->close();
    echo json_encode(["success" => true, "data" => $reviews]);
}

// ─────────────────────────────────────────────
// ADD a new review
// POST ?action=add   body: {destination_id, reviewer_name, rating, review_text}
// ─────────────────────────────────────────────
elseif ($action === 'add') {
    $dest_id  = (int)($input['destination_id'] ?? 0);
    $name     = trim($input['reviewer_name'] ?? '');
    $rating   = (int)($input['rating'] ?? 0);
    $text     = trim($input['review_text'] ?? '');

    if ($dest_id <= 0 || empty($name) || $rating < 1 || $rating > 5 || empty($text)) {
        echo json_encode(["success" => false, "message" => "All fields are required and rating must be 1–5."]);
        exit();
    }

    $stmt = $conn->prepare(
        "INSERT INTO destination_reviews (destination_id, reviewer_name, rating, review_text)
         VALUES (?, ?, ?, ?)"
    );
    $stmt->bind_param("isis", $dest_id, $name, $rating, $text);

    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Review added successfully!",
            "id"      => $conn->insert_id
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "DB Error: " . $stmt->error]);
    }
    $stmt->close();
}

else {
    echo json_encode(["success" => false, "message" => "Invalid action."]);
}

$conn->close();
?>