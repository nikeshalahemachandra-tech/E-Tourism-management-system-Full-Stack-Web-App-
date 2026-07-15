<?php

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $place   = htmlspecialchars(trim($_POST["place"]   ?? ""));
    $comment = htmlspecialchars(trim($_POST["comment"] ?? ""));

    if ($place === "" || $comment === "") {
        echo json_encode(["status" => "error", "message" => "Empty fields"]);
        exit;
    }

    $file = "comments.json";

    // Load existing data
    $data = [];
    if (file_exists($file)) {
        $json = file_get_contents($file);
        $data = json_decode($json, true) ?? [];
    }

    // Append new comment
    $data[] = [
        "place"   => $place,
        "comment" => $comment,
        "time"    => date("Y-m-d H:i:s")
    ];

    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));

    echo json_encode(["status" => "success"]);

} else {
    echo json_encode(["status" => "error", "message" => "Invalid request"]);
}
?>