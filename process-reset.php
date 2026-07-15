<?php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "explore_srilanka_db";
// $port = 3307;

// Create Connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check Connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

if (isset($_POST['reset_btn'])) {
    // 1. Remove spaces from both sides of the email and convert all to lowercase
    $email = mysqli_real_escape_string($conn, strtolower(trim($_POST['email'])));

    $new_pass = $_POST['new_password'];
    $conf_pass = $_POST['confirm_password'];

    // 2. Check if the two passwords match
    if ($new_pass !== $conf_pass) {
        echo "<script>
                alert('Passwords do not match!'); 
                window.location.href='../pages/forgot-password.html';
              </script>";
        exit();
    }

    // 3. Password Hashing
    $hashed_password = password_hash($new_pass, PASSWORD_DEFAULT);

    // 4. Update in the Database (Table: users)
    $sql = "UPDATE users SET password = '$hashed_password' WHERE email = '$email'";

    if ($conn->query($sql) === TRUE) {
        // Check if a row was actually updated (verifies if the Email was correct)
        if ($conn->affected_rows > 0) {
            // Success: Redirect to login&signup.html
            echo "<script>
                    alert('Password changed successfully!'); 
                    window.location.href='../pages/login&signup.html';
                  </script>";
        } else {
            // If the Email is wrong or if the same old password was provided
            echo "<script>
                    alert('This Email address could not be found, or you provided the same old password!'); 
                    window.location.href='../pages/forgot-password.html';
                  </script>";
        }
    } else {
        echo "Error: " . $conn->error;
    }
}

// Close Connection
$conn->close();
?>