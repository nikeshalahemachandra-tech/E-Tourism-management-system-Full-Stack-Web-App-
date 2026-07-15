<?php
header("Content-Type: text/html; charset=UTF-8");
header("Access-Control-Allow-Origin: *"); // same-server call for local dev

$destinations = [
    [
        "name" => "Sigiriya",
        "location" => "Central Province",
        "desc" => "Legendary Lion Rock fortress — UNESCO World Heritage Site.",
        "img" => "../images/hero-sri-lanka.jpg",
        "tags" => ["sigiriya", "fortress", "rock", "heritage", "ancient"]
    ],
    [
        "name" => "Ella",
        "location" => "Uva Province",
        "desc" => "Nine Arch Bridge, tea plantations and breathtaking mountain views.",
        "img" => "../images/ella.jpg",
        "tags" => ["ella", "tea", "bridge", "mountain", "train"]
    ],
    [
        "name" => "Mirissa",
        "location" => "Southern Province",
        "desc" => "Famous beach for whale watching and surfing.",
        "img" => "../images/mirs.jpg",
        "tags" => ["mirissa", "beach", "whale", "surf", "south"]
    ],
    [
        "name" => "Sri Dalada Maligawa",
        "location" => "Kandy, Central Province",
        "desc" => "Sacred Temple of the Tooth — the holiest Buddhist site in Sri Lanka.",
        "img" => "../images/maligawa.jpg",
        "tags" => ["maligawa", "kandy", "temple", "tooth", "buddhist", "heritage"]
    ],
    [
        "name" => "Yala National Park",
        "location" => "Southern Province",
        "desc" => "Sri Lanka's most famous wildlife sanctuary — leopards, elephants & more.",
        "img" => "../images/yala.jpg",
        "tags" => ["yala", "wildlife", "safari", "leopard", "elephant"]
    ],
    [
        "name" => "Galle Fort",
        "location" => "Galle, Southern Province",
        "desc" => "Historic Dutch colonial fort by the sea — UNESCO Heritage Site.",
        "img" => "../images/galle.jpg",
        "tags" => ["galle", "fort", "colonial", "dutch", "heritage", "south"]
    ],
    [
        "name" => "Nuwara Eliya",
        "location" => "Central Province",
        "desc" => "\"Little England\" — cool climate, tea estates and stunning landscapes.",
        "img" => "../images/nuwara.jpg",
        "tags" => ["nuwara", "eliya", "tea", "mountain", "cool", "hill"]
    ],
    [
        "name" => "Arugam Bay",
        "location" => "Eastern Province",
        "desc" => "World-class surf spot on the east coast.",
        "img" => "../images/arugam.jpg",
        "tags" => ["arugam", "bay", "surf", "east", "beach"]
    ],
];

// -------------------------------------------------------
// Get & sanitise query
// -------------------------------------------------------
$query = isset($_GET['q']) ? trim(strtolower(htmlspecialchars($_GET['q']))) : '';

if ($query === '') {
    echo "<p style='color:#888;'>Please enter a search term.</p>";
    exit;
}

// -------------------------------------------------------
// Search logic
// -------------------------------------------------------
$results = [];

foreach ($destinations as $place) {
    $nameMatch = strpos(strtolower($place['name']), $query) !== false;
    $locMatch = strpos(strtolower($place['location']), $query) !== false;
    $descMatch = strpos(strtolower($place['desc']), $query) !== false;
    $tagMatch = in_array($query, $place['tags']);

    if ($nameMatch || $locMatch || $descMatch || $tagMatch) {
        $results[] = $place;
    }
}

// -------------------------------------------------------
// Output
// -------------------------------------------------------
if (empty($results)) {
    echo "<p style='color:#c0392b;'>❌ No destinations found for <strong>" . htmlspecialchars($query) . "</strong>.</p>";
    echo "<p style='color:#555; font-size:13px;'>Try: sigiriya, ella, mirissa, kandy, yala, galle, nuwara, arugam</p>";
    exit;
}

echo "<p style='color:green; margin-bottom:10px;'>✅ Found <strong>" . count($results) . "</strong> result(s) for &ldquo;" . htmlspecialchars($query) . "&rdquo;:</p>";

echo "<div style='display:flex; flex-wrap:wrap; gap:15px;'>";

foreach ($results as $r) {
    echo "
    <div style='
        display:flex;
        align-items:center;
        gap:12px;
        background:white;
        border:1px solid #ddd;
        border-radius:10px;
        padding:10px 15px;
        min-width:250px;
        box-shadow:0 2px 8px rgba(0,0,0,0.07);
    '>
        <img src='{$r['img']}' alt='{$r['name']}'
             style='width:60px; height:55px; object-fit:cover; border-radius:8px;'
             onerror=\"this.src='../images/default.jpg'\">
        <div>
            <strong style='color:#050263; font-size:15px;'>{$r['name']}</strong><br>
            <span style='font-size:12px; color:#888;'><i class='fa fa-map-marker'></i> {$r['location']}</span><br>
            <span style='font-size:13px; color:#444;'>{$r['desc']}</span>
        </div>
    </div>";
}

echo "</div>";
?>