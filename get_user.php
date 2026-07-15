<?php
session_start();
$response = ['loggedin' => false];

if (isset($_SESSION['username'])) {
    $response['loggedin'] = true;
    $response['username'] = $_SESSION['username'];
}

echo json_encode($response);
?>

