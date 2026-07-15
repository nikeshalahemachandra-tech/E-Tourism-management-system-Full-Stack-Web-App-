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
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$action = $_GET['action'] ?? '';

// get the settings data 

if ($action == 'fetch') {
    $sql = "SELECT * FROM system_settings WHERE id = 1";
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        echo json_encode(["success" => true, "data" => $result->fetch_assoc()]);
    } else {
        echo json_encode(["success" => false, "message" => "No settings found"]);
    }
}

// update settings

elseif ($action == 'save') {
    $admin_username = $_POST['admin_username'] ?? 'Master Admin';
    $admin_email = $_POST['admin_email'] ?? 'admin@explore.lk';
    $site_name = $_POST['site_name'] ?? 'Explore Sri Lanka';

    // Checkboxes සහ Select values (නැත්නම් 0 ලෙස ගනී)
    $email_notifications = isset($_POST['email_notifications']) ? 1 : 0;
    $system_alerts = isset($_POST['system_alerts']) ? 1 : 0;
    $two_factor = isset($_POST['two_factor']) ? 1 : 0;
    $session_timeout = (int) ($_POST['session_timeout'] ?? 30);
    $maintenance_mode = isset($_POST['maintenance_mode']) ? 1 : 0;
    $user_registration = isset($_POST['user_registration']) ? 1 : 0;

    $sql = "UPDATE system_settings SET 
            admin_username = ?, admin_email = ?, site_name = ?, 
            email_notifications = ?, system_alerts = ?, 
            two_factor = ?, session_timeout = ?, 
            maintenance_mode = ?, user_registration = ? 
            WHERE id = 1";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "sssiiiiii",
        $admin_username,
        $admin_email,
        $site_name,
        $email_notifications,
        $system_alerts,
        $two_factor,
        $session_timeout,
        $maintenance_mode,
        $user_registration
    );

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "All settings saved successfully!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update settings"]);
    }
    $stmt->close();
}
$conn->close();
?>