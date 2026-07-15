<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

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

$action = isset($_GET['action']) ? $_GET['action'] : '';

// JSON + POST both support
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// ─────────────────────────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────────────────────────
if ($action == 'fetch') {
    $sql = "SELECT * FROM destinations ORDER BY id DESC";
    $result = $conn->query($sql);
    $destinations = [];

    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $destinations[] = [
                "id" => (int) $row['id'],
                "name" => $row['name'],
                "category" => $row['category'],
                "location" => $row['location'],
                "desc" => $row['description'],
                "image" => $row['image']
            ];
        }
    }
    echo json_encode(["success" => true, "data" => $destinations]);
}

// ─────────────────────────────────────────────────────────────────
// ADD
// ─────────────────────────────────────────────────────────────────
elseif ($action == 'add') {
    $name = trim($input['name'] ?? $_POST['name'] ?? '');
    $category = trim($input['category'] ?? $_POST['category'] ?? '');
    $location = trim($input['location'] ?? $_POST['location'] ?? '');
    $desc = trim($input['desc'] ?? $_POST['desc'] ?? '');
    $image = trim($input['image'] ?? $_POST['image'] ?? 'images/sigiriya.jpg');

    // Validation
    if (empty($name) || empty($category) || empty($location)) {
        echo json_encode(["success" => false, "message" => "Name, Category and Location are required."]);
        exit();
    }

    // File upload handling
    if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
        $target_dir = "../images/";
        if (!file_exists($target_dir)) {
            mkdir($target_dir, 0777, true);
        }
        $filename = time() . "_" . basename($_FILES["image"]["name"]);
        if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_dir . $filename)) {
            $image = "images/" . $filename;
        }
    }

    $stmt = $conn->prepare("INSERT INTO destinations (name, category, location, description, image) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $name, $category, $location, $desc, $image);

    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Destination added successfully!",
            "id" => $conn->insert_id
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "DB Error: " . $stmt->error]);
    }
    $stmt->close();
}

// ─────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────
elseif ($action == 'update') {
    $id = (int) ($input['id'] ?? $_POST['id'] ?? 0);
    $name = trim($input['name'] ?? $_POST['name'] ?? '');
    $category = trim($input['category'] ?? $_POST['category'] ?? '');
    $location = trim($input['location'] ?? $_POST['location'] ?? '');
    $desc = trim($input['desc'] ?? $_POST['desc'] ?? '');

    if ($id <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid Destination ID."]);
        exit();
    }

    // Get existing image
    $img_stmt = $conn->prepare("SELECT image FROM destinations WHERE id = ?");
    $img_stmt->bind_param("i", $id);
    $img_stmt->execute();
    $res = $img_stmt->get_result()->fetch_assoc();
    $image = $res['image'] ?? 'images/sigiriya.jpg';
    $img_stmt->close();

    // File upload handling
    if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
        $target_dir = "../images/";
        if (!file_exists($target_dir)) {
            mkdir($target_dir, 0777, true);
        }
        $filename = time() . "_" . basename($_FILES["image"]["name"]);
        if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_dir . $filename)) {
            $image = "images/" . $filename;
        }
    } elseif (!empty($input['image'] ?? $_POST['image'] ?? '')) {
        $image = trim($input['image'] ?? $_POST['image']);
    }

    $stmt = $conn->prepare("UPDATE destinations SET name=?, category=?, location=?, description=?, image=? WHERE id=?");
    $stmt->bind_param("sssssi", $name, $category, $location, $desc, $image, $id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Destination updated successfully!"]);
    } else {
        echo json_encode(["success" => false, "message" => "DB Error: " . $stmt->error]);
    }
    $stmt->close();
}

// ─────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────
elseif ($action == 'delete') {
    $id = (int) ($input['id'] ?? $_POST['id'] ?? 0);

    if ($id <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid Destination ID."]);
        exit();
    }

    $stmt = $conn->prepare("DELETE FROM destinations WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Destination deleted successfully!"]);
    } else {
        echo json_encode(["success" => false, "message" => "DB Error: " . $stmt->error]);
    }
    $stmt->close();
}

// ─────────────────────────────────────────────────────────────────
// INVALID ACTION
// ─────────────────────────────────────────────────────────────────
else {
    echo json_encode(["success" => false, "message" => "Invalid action: " . htmlspecialchars($action)]);
}

$conn->close();
?>