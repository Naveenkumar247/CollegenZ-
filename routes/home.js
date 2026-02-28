const express = require("express");
const router = express.Router();

/* ======================================
   HOME PAGE (PURE HTML)
====================================== */
router.get("/", async (req, res) => {
  try {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CollegenZ</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Bootstrap -->
  <link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
    rel="stylesheet"
  />

  <!-- Icons -->
  <link
    href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css"
    rel="stylesheet"
  />

  <!-- App CSS -->
  <link rel="stylesheet" href="/script.css" />
</head>

<body>

<header class="header" id="mainHeader">

  <a href="/" class="top-header" id="topHeader">
    <img src="Doodle.png" class="logo" alt="CollegenZ" />
  </a>

  <div class="bottom-header" id="bottomHeader">
    <div class="z-logo">Z</div>

    <div class="search-bar">
      <input type="text" placeholder="Search" />
    </div>

    <div class="header-actions">
      <a href="/notifications">
        <i class="bi bi-bell-fill"></i>
      </a>
      <div class="hamburger" id="hamburger">&#9776;</div>
    </div>
  </div>
</header>

<div id="filterBar" class="filter-bar hidden-bar">
  <button class="filter-btn active" data-type="all">All</button>
  <button class="filter-btn" data-type="event">Event</button>
  <button class="filter-btn" data-type="hiring">Hiring</button>
  <button class="filter-btn" data-type="general">General</button>
</div>

<!-- ================= SIDEBAR ================= -->
<nav id="slideNav" class="slide-nav">
  <div class="user-info">
    <img id="navProfilePic" class="profile-pic" src="/uploads/profilepic.jpg" />
    <div>
      <h6 id="navUsername"></h6>
      <p id="navEmail"></p>
    </div>
  </div>
  <hr />
  <a href="/login">Log In</a>
  <a href="/logout">Log Out</a>
</nav>

<div class="overlay" id="overlay"></div>

<!-- ================= FEATURED ================= -->
<div class="featured-wrapper">
  <h5 class="px-3 mb-2">🔥 Featured Posts</h5>
  <div id="featuredSlider" class="featured-slider"></div>
</div>

<!-- ================= POSTS ================= -->
<div id="postContainer"></div>

<!-- ================= FLOATING POST BUTTON ================= -->
<a href="/upload" class="post-fab"></a>

<div class="sidebar">
  <div class="icon">

    <a href="/"><img src="/uploads/home.png" alt="Home" ></a>
    <a href="/profile"><img src="/uploads/settings.png" alt="Settings" ></a>
    <a href="/friends"><img src="/chaticon.png" alt="post"></a>
    <a href="/calender"><img src="/uploads/calender.png" alt="Calendar" ></a>
  </div>
</div>

<div id="profilePopup" class="profile-popup">
  <div class="profile-popup-content">
    <span class="close-popup">&times;</span>
    <div id="profileData" style="text-align:center;padding:10px">
      Loading...
    </div>
  </div>
</div>

<!-- ================= SCRIPTS ================= -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="/script.js" defer></script>
<script src="/share-script.js"></script>


</body>
</html>
`);
  } catch (err) {
    console.error("❌ Home load failed:", err);
    res.status(500).send("Failed to load home page");
  }
});

module.exports = router;
