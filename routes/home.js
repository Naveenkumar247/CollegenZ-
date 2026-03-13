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
  <title>CollegenZ – AI Powered Student Platform</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- ================= BOOTSTRAP ================= -->
  <link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
    rel="stylesheet"
  />

  <!-- Bootstrap Icons -->
  <link
    href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
    rel="stylesheet"
  />

  <!-- ================= GOOGLE FONTS ================= -->
  <link
    href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&display=swap"
    rel="stylesheet"
  />

  <!-- ================= APP CSS ================= -->
  <link rel="stylesheet" href="/script.css" />

  <!-- ================= FAVICONS ================= -->
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />

  <!-- Mobile Theme -->
  <meta name="theme-color" content="#1f7a1f" />
  <meta name="apple-mobile-web-app-title" content="CollegenZ" />

  <!-- ================= SEO ================= -->
  <meta
    name="description"
    content="CollegenZ is an AI-powered platform helping students explore colleges, events, hackathons, internships and opportunities worldwide."
  />

  <meta
    name="keywords"
    content="CollegenZ, student platform, college community, AI education, internships, hackathon, events, courses, startup students"
  />

  <link rel="canonical" href="https://collegenz.in/" />

  <!-- ================= OPEN GRAPH (SOCIAL SHARE) ================= -->
  <meta property="og:title" content="CollegenZ – AI Powered College Platform" />
  <meta
    property="og:description"
    content="Discover colleges, events, hackathons and opportunities powered by AI."
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://collegenz.in/" />
  <meta property="og:image" content="https://collegenz.in/logo.png" />

  <!-- ================= TWITTER CARD ================= -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="CollegenZ – AI Powered College Platform" />
  <meta
    name="twitter:description"
    content="Explore colleges, hackathons, events and opportunities with CollegenZ."
  />
  <meta name="twitter:image" content="https://collegenz.in/logo.png" />

  <!-- ================= ORGANIZATION SCHEMA ================= -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "CollegenZ",
    "url": "https://collegenz.in",
    "logo": "https://collegenz.in/logo.png",
    "description": "AI-powered platform for students to explore colleges, events, courses and hackathons.",
    "sameAs": [
      "https://www.instagram.com/collegenz_in",
      "https://www.linkedin.com/company/collegenz"
    ]
  }
  </script>

  <!-- ================= WEBSITE SEARCH SCHEMA ================= -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "url": "https://collegenz.in/",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://collegenz.in/search?q={search_term}",
      "query-input": "required name=search_term"
    }
  }
  </script>

  <!-- ================= FAQ SCHEMA ================= -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is CollegenZ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "CollegenZ is an AI-powered platform helping students explore colleges, events, hackathons, courses and opportunities worldwide."
        }
      },
      {
        "@type": "Question",
        "name": "Is CollegenZ free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, CollegenZ is completely free for students."
        }
      }
    ]
  }
  </script>

  <!-- ================= BREADCRUMB SCHEMA ================= -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://collegenz.in/"
    }]
  }
  </script>

</head>

<body>

<!-- ================= HEADER ================= -->
<header class="header" id="mainHeader">
  <!-- Hidden to preserve JS -->
  <a href="/" class="top-header" id="topHeader" style="display:none;">
    <img src="Doodle.png" class="logo" alt="CollegenZ" />
  </a>

  <div class="bottom-header" id="bottomHeader">
    <!-- Hidden to preserve JS -->
    <div class="z-logo" style="display:none;">Z</div>
    <div class="search-bar" style="display:none;">
      <input type="text" placeholder="Search" />
    </div>

    <!-- New Sketch Header Layout -->
    <div class="sketch-header-content">
      <img src="/uploads/profilepic.jpg" class="header-profile-icon" id="headerProfilePic" alt="Profile" />
      <h1 class="header-logo-text">CollegenZ</h1>
      <div class="header-actions">
        <a href="/notifications"><i class="bi bi-bell"></i></a>
        <div class="hamburger" id="hamburger">&#9776;</div>
      </div>
    </div>
  </div>
</header>

<!-- Keeping Filter Bar for JS, but you can hide it via CSS if you don't want it -->
<div id="filterBar" class="filter-bar">
  <button class="filter-btn active" data-type="all">All</button>
  <button class="filter-btn" data-type="event">Event</button>
  <button class="filter-btn" data-type="hiring">Hiring</button>
  <button class="filter-btn" data-type="general">General</button>
</div>

<!-- ================= SIDEBAR (Slide Nav) ================= -->
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
  <h3 class="section-title">Featured post</h3>
  <div id="featuredSlider" class="featured-slider"></div>
</div>

<!-- ================= POSTS ================= -->
<div id="postContainer"></div>

<!-- ================= BOTTOM NAVIGATION & FAB ================= -->
<div class="sidebar">
  <div class="icon">
    <a href="/"><img src="/uploads/home.png" alt="Home" ></a>
    <a href="/profile"><img src="/uploads/settings.png" alt="Profile" ></a>
    <div class="nav-spacer"></div> <!-- Pushes chat and calendar to the right -->
    <a href="/friends"><img src="/chaticon.png" alt="Chat"></a>
    <a href="/calender"><img src="/uploads/calender.png" alt="Calendar" ></a>
  </div>
</div>

<!-- Centered Floating Post Button -->
<a href="/upload" class="post-fab center-fab">
  <!-- CSS will generate the + icon to match the sketch -->
</a>

<!-- Profile Popup & Story Viewer remain unchanged below -->
<div id="profilePopup" class="profile-popup">
  <div class="profile-popup-content">
    <span class="close-popup">&times;</span>
    <div id="profileData" style="text-align:center;padding:10px">
      Loading...
    </div>
  </div>
</div>

<div id="storyViewer" class="story-viewer">
  <div class="story-content">
    
    <div id="storyProgressContainer" class="story-progress-container"></div>
    
    <div class="story-header">
      <div class="story-user-info">
        <img id="storyUserPic" src="" alt="User">
        <span id="storyUsername">User</span>
      </div>
      <button class="story-close" onclick="closeStory()"><i class="bi bi-x-lg"></i></button>
    </div>

    <img id="storyImage" src="" alt="Story">

    <div class="story-data-container">
      <p id="storyDataText"></p>
    </div>

    <div class="story-nav-left" onclick="prevSlide()"></div>
    <div class="story-nav-right" onclick="nextSlide()"></div>

    <div class="story-actions-vertical">
      <div class="action-btn">
        <i class="bi bi-heart"></i>
        <span id="storyLikes">0</span>
      </div>
      <div class="action-btn">
        <i class="bi bi-send"></i>
        <span id="storyShares">0</span>
      </div>
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
