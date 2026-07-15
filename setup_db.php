<?php
/**
 * Database Setup Script
 * This script creates the cultural_events table and imports the initial data
 */

// Include config
require __DIR__ . '/db.php';

$setup_queries = [
    // Create cultural_events table
    "CREATE TABLE IF NOT EXISTS `cultural_events` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `name` varchar(255) NOT NULL,
        `category` varchar(50) NOT NULL,
        `status` varchar(50) DEFAULT 'upcoming',
        `day` int(11) NOT NULL DEFAULT 1,
        `month` varchar(10) NOT NULL,
        `duration` varchar(10) NOT NULL,
        `location` varchar(255) NOT NULL,
        `description` text NOT NULL,
        `image` varchar(255) DEFAULT 'images/maligawa.jpg',
        `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;",

    // Insert initial data
    "INSERT IGNORE INTO `cultural_events` (`id`, `name`, `category`, `status`, `day`, `month`, `duration`, `location`, `description`, `image`) VALUES
    (1, 'Kandy Esala Perahera', 'religious', 'upcoming', 10, 'Aug', '10 Days', 'Kandy', 'The Festival of the Tooth is a grand festival celebrated with elegant costumes and traditional dances.', 'images/maligawa.jpg'),
    (2, 'Tai Pongal Festival', 'festival', 'upcoming', 14, 'Jan', '1 Day', 'Colombo', 'A traditional Tamil harvest festival dedicated to the Sun God.', 'images/hero-sri-lanka.jpg');"
];

$success = true;
$messages = [];

foreach ($setup_queries as $query) {
    if ($conn->query($query) === TRUE) {
        $messages[] = "✓ Query executed successfully";
    } else {
        $success = false;
        $messages[] = "✗ Error: " . $conn->error;
    }
}

echo json_encode([
    "success" => $success,
    "message" => "Database setup completed",
    "details" => $messages
]);

$conn->close();
?>