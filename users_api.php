<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$host = "localhost";
$user = "root";
$pass = "";
$dbname = "explore_srilanka_db";
// $port = 3307; // $port define default MySQL port

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// Fetch all users
if ($action == 'fetch') {
    $sql = "SELECT id, username, email, role, status, created_at FROM users ORDER BY id DESC";
    $result = $conn->query($sql);
    $users = [];

    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $statusStr = ((int) $row['status'] === 1) ? 'banned' : 'active';
            $users[] = [
                "id" => (int) $row['id'],
                "name" => $row['username'],
                "email" => $row['email'],
                "role" => $row['role'],
                "status" => $statusStr,
                "joined" => date('Y-m-d', strtotime($row['created_at']))
            ];
        }
    }
    echo json_encode(["success" => true, "data" => $users]);

    // Add new user
} elseif ($action == 'add') {
    $username = $_POST['name'] ?? '';
    $email = $_POST['email'] ?? '';
    $role = $_POST['role'] ?? 'user';
    $status = (($_POST['status'] ?? 'active') == 'banned') ? 1 : 0;
    $password = password_hash($_POST['password'] ?? 'user123', PASSWORD_DEFAULT);

    // Email already exists check
    $check = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $check->bind_param("s", $email);
    $check->execute();
    if ($check->get_result()->num_rows > 0) {
        echo json_encode(["success" => false, "message" => "Email already registered!"]);
        exit();
    }
    $check->close();

    $stmt = $conn->prepare("INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssi", $username, $email, $password, $role, $status);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "User added successfully!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to add user."]);
    }
    $stmt->close();

    // Update user
} elseif ($action == 'update') {
    $id = (int) ($_POST['id'] ?? 0);
    $username = $_POST['name'] ?? '';
    $email = $_POST['email'] ?? '';
    $role = $_POST['role'] ?? 'user';
    $status = (($_POST['status'] ?? 'active') == 'banned') ? 1 : 0; // ✅ Fix 2: null check

    $stmt = $conn->prepare("UPDATE users SET username=?, email=?, role=?, status=? WHERE id=?");
    $stmt->bind_param("ssssi", $username, $email, $role, $status, $id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "User updated successfully!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update user."]);
    }
    $stmt->close();

    // Toggle ban/unban

} elseif ($action == 'toggle') {
    $id = (int) ($_POST['id'] ?? 0);
    $stmt = $conn->prepare("UPDATE users SET status = IF(status=0, 1, 0) WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "User status toggled!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update status."]);
    }
    $stmt->close();

    // Delete user

} elseif ($action == 'delete') {
    $id = (int) ($_POST['id'] ?? 0);
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "User deleted permanently!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to delete user."]);
    }
    $stmt->close();

    //  Unknown action handle 

} else {
    echo json_encode(["success" => false, "message" => "Invalid action!"]);
}

$conn->close();
?>