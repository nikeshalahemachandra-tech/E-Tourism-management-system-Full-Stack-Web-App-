<?php

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $place = htmlspecialchars(trim($_POST["place"] ?? ""));
    $rating = (int) ($_POST["rating"] ?? 0);

    if ($place === "" || $rating < 1 || $rating > 5) {
        echo json_encode(["status" => "error", "message" => "Invalid data"]);
        exit;
    }

    $file = "ratings.json";

    $data = [];
    if (file_exists($file)) {
        $json = file_get_contents($file);
        $data = json_decode($json, true) ?? [];
    }

    $data[] = [
        "place" => $place,
        "rating" => $rating,
        "time" => date("Y-m-d H:i:s")
    ];

    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));

    echo json_encode(["status" => "success"]);

} else {
    echo json_encode(["status" => "error", "message" => "Invalid request"]);
}
?>