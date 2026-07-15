<?php
// php/gallery_api.php
// Handles GET (list), POST (add), PUT (edit), DELETE for gallery_images table.
// Supports multipart image upload via $_FILES['image'].

ob_start();
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    while (ob_get_level()) ob_end_clean();
    http_response_code(200); exit;
}

function send(array $data, int $code = 200): void {
    while (ob_get_level()) ob_end_clean();
    http_response_code($code);
    header("Content-Type: application/json");
    echo json_encode($data);
    exit;
}

set_exception_handler(fn(Throwable $e) => send(["error" => $e->getMessage()], 500));
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR]))
        send(["error" => "Fatal: " . $e['message']], 500);
});

require_once __DIR__ . '/db.php';   // $conn (mysqli)
if (!isset($conn) || $conn->connect_errno)
    send(["error" => "DB connection failed"], 500);

// ── Method override ────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && isset($_GET['_method'])) {
    $ov = strtoupper($_GET['_method']);
    if (in_array($ov, ['PUT','DELETE'], true)) $method = $ov;
}

$id      = isset($_GET['id']) ? (int)$_GET['id'] : null;
$rawBody = file_get_contents("php://input");

function esc(string $v): string {
    global $conn;
    return $conn->real_escape_string(trim($v));
}

// ── Upload dir ─────────────────────────────────────────────────
// Images saved to  /images/gallery/  (relative to project root)
define('UPLOAD_DIR', __DIR__ . '/../images/gallery/');
define('UPLOAD_URL', 'images/gallery/');   // path used in DB & website

if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);

// ── Helper: handle image upload ────────────────────────────────
function handleUpload(): ?string {
    if (empty($_FILES['image']['tmp_name'])) return null;

    $allowed = ['image/jpeg','image/png','image/webp','image/gif'];
    $mime    = mime_content_type($_FILES['image']['tmp_name']);
    if (!in_array($mime, $allowed)) {
        send(["error" => "Invalid file type. Use JPG, PNG, WEBP, or GIF."], 400);
    }

    $ext  = match($mime) {
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
        default      => 'jpg'
    };
    $name = 'gal_' . uniqid() . '.' . $ext;
    $dest = UPLOAD_DIR . $name;

    if (!move_uploaded_file($_FILES['image']['tmp_name'], $dest))
        send(["error" => "Upload failed — check folder permissions on images/gallery/"], 500);

    return UPLOAD_URL . $name;
}

// ── VALID categories ───────────────────────────────────────────
$VALID_CATS = ['general','nature','beach','heritage','wildlife','food','festival'];

// ══════════════════════════════════════════════════════════════
switch ($method) {

    // ── GET: list all  /  single by id ──────────────────────
    case 'GET':
        if ($id) {
            $stmt = $conn->prepare("SELECT * FROM gallery_images WHERE id = ?");
            if (!$stmt) send(["error" => $conn->error], 500);
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();
            send($row ?: ["error" => "Not found"], $row ? 200 : 404);
        }
        $res  = $conn->query("SELECT * FROM gallery_images ORDER BY sort_order ASC, id ASC");
        if (!$res) send(["error" => $conn->error], 500);
        $rows = [];
        while ($r = $res->fetch_assoc()) $rows[] = $r;
        send($rows);

    // ── POST: add new image ──────────────────────────────────
    case 'POST':
        // Data can come as multipart (with file) OR JSON (image path provided)
        if (!empty($_FILES['image']['tmp_name'])) {
            // multipart form
            $title    = trim($_POST['title']      ?? '');
            $caption  = trim($_POST['caption']    ?? '');
            $location = trim($_POST['location']   ?? '');
            $category = strtolower(trim($_POST['category'] ?? 'general'));
            $sort     = max(0, (int)($_POST['sort_order']  ?? 0));
            $imagePath = handleUpload();
        } else {
            $body     = json_decode($rawBody, true);
            if (!is_array($body)) send(["error" => "Invalid JSON body"], 400);
            $title    = trim($body['title']      ?? '');
            $caption  = trim($body['caption']    ?? '');
            $location = trim($body['location']   ?? '');
            $category = strtolower(trim($body['category'] ?? 'general'));
            $sort     = max(0, (int)($body['sort_order']  ?? 0));
            $imagePath = trim($body['image']     ?? '');
        }

        if (!$title)     send(["error" => "title is required"], 400);
        if (!$imagePath) send(["error" => "image is required (upload a file or provide a path)"], 400);
        if (!in_array($category, $VALID_CATS, true)) $category = 'general';

        $sql = "INSERT INTO gallery_images (title, caption, location, category, image, sort_order)
                VALUES ('".esc($title)."','".esc($caption)."','".esc($location)."',
                        '".esc($category)."','".esc($imagePath)."',$sort)";

        if (!$conn->query($sql)) send(["error" => "Insert failed: " . $conn->error], 500);
        send(["success" => true, "id" => $conn->insert_id, "image" => $imagePath], 201);

    // ── PUT: update ──────────────────────────────────────────
    case 'PUT':
        if (!$id) send(["error" => "id required"], 400);

        // Check if new image uploaded
        $newImage = null;
        if (!empty($_FILES['image']['tmp_name'])) {
            $newImage = handleUpload();
        }

        // Merge: POST fields (multipart) or JSON body
        $src = !empty($_POST) ? $_POST : (json_decode($rawBody, true) ?? []);

        $fields = [];
        foreach (['title','caption','location'] as $col) {
            if (isset($src[$col])) $fields[] = "`$col`='" . esc((string)$src[$col]) . "'";
        }
        if (isset($src['category'])) {
            $cat = strtolower(trim($src['category']));
            if (!in_array($cat, $VALID_CATS, true)) $cat = 'general';
            $fields[] = "`category`='" . esc($cat) . "'";
        }
        if (isset($src['sort_order'])) {
            $fields[] = "`sort_order`=" . max(0, (int)$src['sort_order']);
        }
        if ($newImage) {
            $fields[] = "`image`='" . esc($newImage) . "'";
        } elseif (isset($src['image']) && $src['image']) {
            $fields[] = "`image`='" . esc((string)$src['image']) . "'";
        }

        if (!$fields) send(["error" => "Nothing to update"], 400);

        $sql = "UPDATE gallery_images SET " . implode(', ', $fields) . " WHERE id=$id";
        if (!$conn->query($sql)) send(["error" => "Update failed: " . $conn->error], 500);
        send(["success" => true]);

    // ── DELETE ───────────────────────────────────────────────
    case 'DELETE':
        if (!$id) send(["error" => "id required"], 400);

        // Optionally delete the actual file too
        $row = $conn->query("SELECT image FROM gallery_images WHERE id=$id")->fetch_assoc();
        if ($row && str_starts_with($row['image'], UPLOAD_URL)) {
            $file = __DIR__ . '/../' . $row['image'];
            if (file_exists($file)) @unlink($file);
        }

        if (!$conn->query("DELETE FROM gallery_images WHERE id=$id"))
            send(["error" => "Delete failed: " . $conn->error], 500);
        send(["success" => true]);

    default:
        send(["error" => "Method not allowed"], 405);
}
?>