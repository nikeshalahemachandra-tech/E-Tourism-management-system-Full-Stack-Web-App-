<?php
ini_set('display_errors', 0);
error_reporting(0);

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");

set_error_handler(function ($errno, $errstr, $errfile, $errline) {
    echo json_encode([
        "success" => false,
        "message" => "PHP Error ($errno): $errstr in $errfile line $errline"
    ]);
    exit();
});

if (!file_exists(__DIR__ . '/db.php')) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "db.php file not found."]);
    exit();
}
require __DIR__ . '/db.php';

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed: " . ($conn->connect_error ?? "Not initialized")]);
    exit();
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

$input = json_decode(file_get_contents('php://input'), true) ?? [];

// FETCH

if ($action == 'fetch') {
    $sql = "SELECT * FROM cultural_events ORDER BY id DESC";
    $result = $conn->query($sql);
    $events = [];

    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $events[] = [
                "id" => (int) $row['id'],
                "name" => $row['name'],
                "category" => $row['category'],
                "status" => $row['status'],
                "day" => (int) $row['day'],
                "month" => $row['month'],
                "duration" => $row['duration'],
                "location" => $row['location'],
                "desc" => $row['description'],
                "image" => $row['image']
            ];
        }
    }
    echo json_encode(["success" => true, "data" => $events]);
}

// ADD
elseif ($action == 'add') {
    $name = trim($input['name'] ?? $_POST['name'] ?? '');
    $category = trim($input['category'] ?? $_POST['category'] ?? '');
    $status = trim($input['status'] ?? $_POST['status'] ?? 'upcoming');
    $day = (int) ($input['day'] ?? $_POST['day'] ?? 1);
    $month = trim($input['month'] ?? $_POST['month'] ?? 'Jan');
    $duration = trim($input['duration'] ?? $_POST['duration'] ?? 'TBD');
    $location = trim($input['location'] ?? $_POST['location'] ?? '');
    $desc = trim($input['desc'] ?? $_POST['desc'] ?? '');
    $image = trim($input['image'] ?? $_POST['image'] ?? 'images/maligawa.jpg');

    if (empty($name) || empty($location)) {
        echo json_encode(["success" => false, "message" => "Name and Location are required."]);
        exit();
    }

    if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
        $target_dir = "../images/";
        if (!file_exists($target_dir))
            mkdir($target_dir, 0777, true);
        $filename = time() . "_" . basename($_FILES["image"]["name"]);
        if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_dir . $filename)) {
            $image = "images/" . $filename;
        }
    }
    $stmt = $conn->prepare("INSERT INTO cultural_events (name, category, status, day, month, duration, location, description, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

    if (!$stmt) {
        echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
        exit();
    }

    $stmt->bind_param("sssisssss", $name, $category, $status, $day, $month, $duration, $location, $desc, $image);

    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Event added successfully!",
            "id" => $conn->insert_id
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "DB Error: " . $stmt->error]);
    }
    $stmt->close();
}

// UPDATE
elseif ($action == 'update') {
    $id = (int) ($input['id'] ?? $_POST['id'] ?? 0);
    $name = trim($input['name'] ?? $_POST['name'] ?? '');
    $category = trim($input['category'] ?? $_POST['category'] ?? '');
    $status = trim($input['status'] ?? $_POST['status'] ?? 'upcoming');
    $day = (int) ($input['day'] ?? $_POST['day'] ?? 1);
    $month = trim($input['month'] ?? $_POST['month'] ?? 'Jan');
    $duration = trim($input['duration'] ?? $_POST['duration'] ?? 'TBD');
    $location = trim($input['location'] ?? $_POST['location'] ?? '');
    $desc = trim($input['desc'] ?? $_POST['desc'] ?? '');

    if ($id <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid Event ID."]);
        exit();
    }

    $img_stmt = $conn->prepare("SELECT image FROM cultural_events WHERE id = ?");
    $img_stmt->bind_param("i", $id);
    $img_stmt->execute();
    $res = $img_stmt->get_result()->fetch_assoc();
    $image = $res['image'] ?? 'images/maligawa.jpg';
    $img_stmt->close();

    if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
        $target_dir = "../images/";
        if (!file_exists($target_dir))
            mkdir($target_dir, 0777, true);
        $filename = time() . "_" . basename($_FILES["image"]["name"]);
        if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_dir . $filename)) {
            $image = "images/" . $filename;
        }
    } elseif (!empty($input['image'] ?? $_POST['image'] ?? '')) {
        $image = trim($input['image'] ?? $_POST['image']);
    }

    $stmt = $conn->prepare("UPDATE cultural_events SET name=?, category=?, status=?, day=?, month=?, duration=?, location=?, description=?, image=? WHERE id=?");

    if (!$stmt) {
        echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
        exit();
    }

    $stmt->bind_param("sssisssssi", $name, $category, $status, $day, $month, $duration, $location, $desc, $image, $id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Event updated successfully!"]);
    } else {
        echo json_encode(["success" => false, "message" => "DB Error: " . $stmt->error]);
    }
    $stmt->close();
}

// DELETE
elseif ($action == 'delete') {
    $id = (int) ($input['id'] ?? $_POST['id'] ?? 0);

    if ($id <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid Event ID."]);
        exit();
    }

    $stmt = $conn->prepare("DELETE FROM cultural_events WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Event deleted successfully!"]);
    } else {
        echo json_encode(["success" => false, "message" => "DB Error: " . $stmt->error]);
    }
    $stmt->close();
}

// INVALID ACTION
else {
    echo json_encode(["success" => false, "message" => "Invalid action: " . htmlspecialchars($action)]);
}

$conn->close();
?>