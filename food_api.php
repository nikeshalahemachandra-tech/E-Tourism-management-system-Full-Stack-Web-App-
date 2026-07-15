<?php
// food_api.php — php/food_api.php
// Fixed: case-insensitive validation, ob_start protection

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

ob_start();

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    while (ob_get_level()) ob_end_clean();
    http_response_code(200);
    exit;
}

function send(array $data, int $code = 200): void {
    while (ob_get_level()) ob_end_clean();
    http_response_code($code);
    header("Content-Type: application/json");
    echo json_encode($data);
    exit;
}

set_exception_handler(function(Throwable $e) {
    send(["error" => "Server exception: " . $e->getMessage()], 500);
});

register_shutdown_function(function() {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        send(["error" => "Fatal: " . $err['message']], 500);
    }
});

require_once __DIR__ . '/db.php';

if (!isset($conn) || $conn->connect_errno) {
    send(["error" => "DB connection failed: " . ($conn->connect_error ?? 'unknown')], 500);
}

// ── Valid values — LOWERCASE for comparison only
// DB stores mixed-case values (e.g. "Street Food", "Must Try") — we use strtolower() when comparing
$VALID_CATEGORIES = ['rice', 'snack', 'sweet', 'seafood'];
$VALID_SPICE      = ['mild', 'medium', 'hot', 'very spicy', 'mild – spicy', 'dessert'];
$VALID_STATUS     = ['must try', 'street food', 'breakfast', 'regional',
                     'festive', 'new year special', 'heritage', 'active'];

// ── Method override (XAMPP blocks native PUT / DELETE)
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && isset($_GET['_method'])) {
    $ov = strtoupper($_GET['_method']);
    if (in_array($ov, ['PUT', 'DELETE'], true)) $method = $ov;
}

// ── COUNT shortcut
if (isset($_GET['count'])) {
    $r = $conn->query("SELECT COUNT(*) AS total FROM traditional_foods");
    send($r->fetch_assoc());
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

$rawBody = file_get_contents("php://input");

function esc(string $v): string {
    global $conn;
    return $conn->real_escape_string(trim($v));
}

switch ($method) {

    // ── GET all / GET by id
    case 'GET':
        if ($id) {
            $stmt = $conn->prepare("SELECT * FROM traditional_foods WHERE id = ?");
            if (!$stmt) send(["error" => "Prepare failed: " . $conn->error], 500);
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();
            send($row ?: ["error" => "Not found"], $row ? 200 : 404);
        }
        $res = $conn->query("SELECT * FROM traditional_foods ORDER BY id ASC");
        if (!$res) send(["error" => "Query failed: " . $conn->error], 500);
        $rows = [];
        while ($r = $res->fetch_assoc()) $rows[] = $r;
        send($rows);

    // ── POST — insert
    case 'POST':
        // Support both JSON body and multipart/form-data (file upload)
        $isMultipart = isset($_FILES['image']) || !empty($_POST);
        if ($isMultipart) {
            $body = $_POST;
        } else {
            $body = json_decode($rawBody, true);
            if (!is_array($body)) send(["error" => "Invalid JSON body"], 400);
        }

        $name     = trim($body['name']        ?? '');
        $category = strtolower(trim($body['category']    ?? ''));
        $location = trim($body['location']    ?? 'Island-Wide') ?: 'Island-Wide';
        $spice    = strtolower(trim($body['spice_level'] ?? 'mild'));
        $desc     = trim($body['description'] ?? '');
        $status   = strtolower(trim($body['status']      ?? 'must try'));
        $image    = trim($body['image']       ?? 'images/default.jpg') ?: 'images/default.jpg';
        $alt      = trim($body['alt_text']    ?? $name) ?: $name;
        $price    = max(0, (int)($body['price'] ?? 0));

        // Handle file upload
        if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
            $target_dir = __DIR__ . "/../images/";
            if (!file_exists($target_dir)) mkdir($target_dir, 0777, true);
            $filename = time() . "_" . basename($_FILES["image"]["name"]);
            if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_dir . $filename)) {
                $image = "images/" . $filename;
            }
        }

        if (!$name)     send(["error" => "name is required"], 400);
        if (!$category) send(["error" => "category is required"], 400);

        if (!in_array($category, $VALID_CATEGORIES, true))
            send(["error" => "Invalid category '$category'. Allowed: " . implode(', ', $VALID_CATEGORIES)], 400);

        // Graceful fallback for optional fields
        if (!in_array($spice,  $VALID_SPICE,  true)) $spice  = 'mild';
        if (!in_array($status, $VALID_STATUS, true)) $status = 'must try';

        $sql = "INSERT INTO traditional_foods
                    (name, category, location, price, spice_level, description, status, image, alt_text)
                VALUES
                    ('".esc($name)."','".esc($category)."','".esc($location)."',
                     $price,'".esc($spice)."','".esc($desc)."','".esc($status)."',
                     '".esc($image)."','".esc($alt)."')";

        if (!$conn->query($sql))
            send(["error" => "Insert failed: " . $conn->error], 500);

        send(["success" => true, "id" => $conn->insert_id], 201);

    // ── PUT — update
    case 'PUT':
        if (!$id) send(["error" => "id required"], 400);

        // Support multipart/form-data (file upload) via POST+_method=PUT
        $isMultipart = isset($_FILES['image']) || !empty($_POST);
        if ($isMultipart) {
            $body = $_POST;
        } else {
            $body = json_decode($rawBody, true);
            if (!is_array($body)) send(["error" => "Invalid JSON body"], 400);
        }

        // Handle file upload
        if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
            $target_dir = __DIR__ . "/../images/";
            if (!file_exists($target_dir)) mkdir($target_dir, 0777, true);
            $filename = time() . "_" . basename($_FILES["image"]["name"]);
            if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_dir . $filename)) {
                $body['image'] = "images/" . $filename;
            }
        }

        $fields  = [];
        $allowed = ['name','category','location','price','spice_level','description','status','image','alt_text'];

        foreach ($allowed as $col) {
            if (!array_key_exists($col, $body)) continue;

            switch ($col) {
                case 'price':
                    $fields[] = "`price` = " . max(0, (int)$body['price']);
                    break;
                case 'category':
                    $val = strtolower(trim($body[$col]));
                    if (!in_array($val, $VALID_CATEGORIES, true))
                        send(["error" => "Invalid category '$val'. Allowed: " . implode(', ', $VALID_CATEGORIES)], 400);
                    $fields[] = "`category` = '" . esc($val) . "'";
                    break;
                case 'spice_level':
                    $val = strtolower(trim($body[$col]));
                    if (!in_array($val, $VALID_SPICE, true)) $val = 'mild';
                    $fields[] = "`spice_level` = '" . esc($val) . "'";
                    break;
                case 'status':
                    $val = strtolower(trim($body[$col]));
                    if (!in_array($val, $VALID_STATUS, true)) $val = 'must try';
                    $fields[] = "`status` = '" . esc($val) . "'";
                    break;
                default:
                    $fields[] = "`$col` = '" . esc((string)$body[$col]) . "'";
            }
        }

        if (!$fields) send(["error" => "Nothing to update"], 400);

        $sql = "UPDATE traditional_foods SET " . implode(', ', $fields) . " WHERE id = $id";
        if (!$conn->query($sql))
            send(["error" => "Update failed: " . $conn->error], 500);

        send(["success" => true]);

    // ── DELETE
    case 'DELETE':
        if (!$id) send(["error" => "id required"], 400);

        if (!$conn->query("DELETE FROM traditional_foods WHERE id = $id"))
            send(["error" => "Delete failed: " . $conn->error], 500);

        send(["success" => true]);

    default:
        send(["error" => "Method not allowed"], 405);
}
?>