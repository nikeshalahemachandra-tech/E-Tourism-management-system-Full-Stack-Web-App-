<?php
session_start();
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

if (isset($_SESSION["user_id"])) {
    echo json_encode([
        "logged_in" => true,
        "name"      => $_SESSION["user_name"]      ?? "",
        "email"     => $_SESSION["user_email"]     ?? "",
        "role"      => $_SESSION["user_role"]      ?? "user",
        "provider"  => $_SESSION["auth_provider"]  ?? "email"
    ]);
} else {
    echo json_encode(["logged_in" => false]);
}
?>