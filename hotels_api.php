<?php
session_start();

ini_set('display_errors', 0);
error_reporting(0);

// Catch errors as JSON
set_error_handler(function ($errno, $errstr, $errfile, $errline) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => "PHP Error ($errno): $errstr in $errfile line $errline"
    ]);
    exit();
});

header('Content-Type: application/json; charset=utf-8');

if (!file_exists(__DIR__ . '/db.php')) {
    echo json_encode(['success' => false, 'message' => 'The db.php file was not found. Path: ' . __DIR__ . '/db.php']);
    exit();
}
require __DIR__ . '/db.php';

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . ($conn->connect_error ?? 'Connection object not initialized')]);
    exit();
}

$action = $_GET['action'] ?? '';

// FETCH: Retrieve all hotels

if ($action === 'fetch') {
    // Optional: filter by status for website (website=1 param)
    $forWebsite = isset($_GET['website']) && $_GET['website'] === '1';
    if ($forWebsite) {
        $sql = "SELECT * FROM hotels WHERE status = 'active' OR status IS NULL OR status = '' ORDER BY id DESC";
    } else {
        $sql = "SELECT * FROM hotels ORDER BY id DESC";
    }
    $result = $conn->query($sql);
    $hotels = [];
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $hotels[] = $row;
        }
    }
    echo json_encode(['success' => true, 'data' => $hotels]);
    exit();
}

// ADD: Adding a new hotel

if ($action === 'add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    $name        = trim($input['name']        ?? $_POST['name']        ?? '');
    $location    = trim($input['location']    ?? $_POST['location']    ?? '');
    $price       = trim($input['price']       ?? $_POST['price']       ?? '0');
    $description = trim($input['description'] ?? $_POST['description'] ?? '');
    $image_url   = trim($input['image_url']   ?? $_POST['image_url']   ?? '');
    $status      = trim($input['status']      ?? $_POST['status']      ?? 'active');
    $stars       = intval($input['stars']     ?? $_POST['stars']       ?? 3);
    $amenities   = trim($input['amenities']   ?? $_POST['amenities']   ?? '');
    $badge       = trim($input['badge']       ?? $_POST['badge']       ?? '');

    // File upload handling
    if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
        $target_dir = "../images/";
        if (!file_exists($target_dir)) mkdir($target_dir, 0777, true);
        $filename = time() . "_" . basename($_FILES["image"]["name"]);
        if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_dir . $filename)) {
            $image_url = "images/" . $filename;
        }
    }

    // Clamp stars to 1–5
    $stars = max(1, min(5, $stars));

    if (empty($name) || empty($location) || empty($price)) {
        echo json_encode(['success' => false, 'message' => 'Name, Location, Price are required.']);
        exit();
    }

    // Use prepared statement to prevent SQL injection
    $stmt = $conn->prepare("INSERT INTO hotels (name, location, price, description, image_url, status, stars, amenities, badge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
        exit();
    }
    $stmt->bind_param("ssssssiss", $name, $location, $price, $description, $image_url, $status, $stars, $amenities, $badge);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Hotel added successfully!', 'id' => $conn->insert_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'DB Error: ' . $stmt->error]);
    }
    $stmt->close();
    exit();
}

// UPDATE: Updating a hotel

if ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    $id          = intval($input['id']          ?? $_POST['id']          ?? 0);
    $name        = trim($input['name']        ?? $_POST['name']        ?? '');
    $location    = trim($input['location']    ?? $_POST['location']    ?? '');
    $price       = trim($input['price']       ?? $_POST['price']       ?? '');
    $description = trim($input['description'] ?? $_POST['description'] ?? '');
    $image_url   = trim($input['image_url']   ?? $_POST['image_url']   ?? '');
    $status      = trim($input['status']      ?? $_POST['status']      ?? '');
    $stars       = isset($input['stars'])     || isset($_POST['stars'])
                   ? max(1, min(5, intval($input['stars'] ?? $_POST['stars']))) : null;
    $amenities   = isset($input['amenities']) || isset($_POST['amenities'])
                   ? trim($input['amenities'] ?? $_POST['amenities']) : null;
    $badge       = isset($input['badge'])     || isset($_POST['badge'])
                   ? trim($input['badge']     ?? $_POST['badge'])     : null;

    // File upload handling
    if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
        $target_dir = "../images/";
        if (!file_exists($target_dir)) mkdir($target_dir, 0777, true);
        $filename = time() . "_" . basename($_FILES["image"]["name"]);
        if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_dir . $filename)) {
            $image_url = "images/" . $filename;
        }
    }

    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid Hotel ID.']);
        exit();
    }

    // Build SET clause dynamically — only include fields that were actually sent
    $setParts = [];
    $types    = '';
    $params   = [];

    // description and image_url always update (can be cleared to empty)
    $setParts[] = 'description = ?'; $types .= 's'; $params[] = $description;
    $setParts[] = 'image_url = ?';   $types .= 's'; $params[] = $image_url;

    if ($name !== '')          { $setParts[] = 'name = ?';      $types .= 's'; $params[] = $name; }
    if ($location !== '')      { $setParts[] = 'location = ?';  $types .= 's'; $params[] = $location; }
    if ($price !== '')         { $setParts[] = 'price = ?';     $types .= 's'; $params[] = $price; }
    if ($status !== '')        { $setParts[] = 'status = ?';    $types .= 's'; $params[] = $status; }
    if ($stars !== null)       { $setParts[] = 'stars = ?';     $types .= 'i'; $params[] = $stars; }
    if ($amenities !== null)   { $setParts[] = 'amenities = ?'; $types .= 's'; $params[] = $amenities; }
    if ($badge !== null)       { $setParts[] = 'badge = ?';     $types .= 's'; $params[] = $badge; }

    $types   .= 'i';
    $params[] = $id;

    $stmt = $conn->prepare("UPDATE hotels SET " . implode(', ', $setParts) . " WHERE id = ?");
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
        exit();
    }
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Hotel details successfully updated!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Update failed: ' . $stmt->error]);
    }
    $stmt->close();
    exit();
}

// DELETE: Deleting a hotel

if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = intval($input['id'] ?? $_POST['id'] ?? 0);

    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid Hotel ID.']);
        exit();
    }

    $stmt = $conn->prepare("DELETE FROM hotels WHERE id = ?");
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
        exit();
    }
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Hotel deleted successfully!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Delete failed: ' . $stmt->error]);
    }
    $stmt->close();
    exit();
}

echo json_encode(['success' => false, 'message' => 'Invalid action: ' . htmlspecialchars($action)]);
$conn->close();
?>