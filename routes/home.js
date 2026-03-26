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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>CollegenZ – AI Powered Student Platform</title>
  <meta name="description" content="CollegenZ is an AI-powered platform helping students explore colleges, events, hackathons, internships, and opportunities to accelerate their careers." />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <link rel="canonical" href="https://collegenz.in/" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet" />

  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="/script.css" />

  <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />

  <meta name="theme-color" content="#1f7a1f" />
  <meta name="apple-mobile-web-app-title" content="CollegenZ" />

  <meta property="og:locale" content="en_IN" />
  <meta property="og:site_name" content="CollegenZ" />
  <meta property="og:title" content="CollegenZ – AI Powered College Platform" />
  <meta property="og:description" content="Discover colleges, events, hackathons and opportunities powered by AI." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://collegenz.in/" />
  <meta property="og:image" content="https://collegenz.in/logo.png" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="CollegenZ – AI Powered College Platform" />
  <meta name="twitter:description" content="Explore colleges, hackathons, events and opportunities with CollegenZ." />
  <meta name="twitter:image" content="https://collegenz.in/logo.png" />

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
          "text": "CollegenZ is an AI-powered platform helping students explore colleges, events, hackathons, courses, and opportunities."
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
      <a href="/profile" aria-label="Profile">
  
  <div id="headerProfilePic" class="header-profile-icon" style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; display: inline-block; vertical-align: middle;">
    
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="100%" height="100%">
      <circle cx="20" cy="20" r="18" fill="#e0e0e0" stroke="#ffffff" stroke-width="2"/>
      
      <clipPath id="header-avatar-clip">
        <circle cx="20" cy="20" r="17.5" />
      </clipPath>
      
      <g clip-path="url(#header-avatar-clip)" fill="#f5f5f5">
        <circle cx="20" cy="14" r="6.5" />
        <path d="M7 34c0-8 6.5-12 13-12s13 4 13 12" />
      </g>
    </svg>

  </div>

</a>


      <h1 class="header-logo-text">
  <a href="https://collegenz.in/aboutus" style="text-decoration: none; color: inherit;">CollegenZ</a>
</h1>

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
    
    <div id="navProfilePic" class="profile-pic" style="width: 48px; height: 48px; flex-shrink: 0; border-radius: 50%; overflow: hidden;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="100%" height="100%">
        <circle cx="20" cy="20" r="18" fill="#e0e0e0" stroke="#ffffff" stroke-width="2"/>
        <clipPath id="avatar-clip">
          <circle cx="20" cy="20" r="17.5" />
        </clipPath>
        <g clip-path="url(#avatar-clip)" fill="#f5f5f5">
          <circle cx="20" cy="14" r="6.5" />
          <path d="M7 34c0-8 6.5-12 13-12s13 4 13 12" />
        </g>
      </svg>
    </div>

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
    
   <a href="/home" aria-label="Home">
  <div class="nav-icon-container">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" fill="#228B22"/>
    </svg>

    </div>
</a>


    <a href="/shorts" aria-label="Shorts">
  <div class="nav-icon-container">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <defs>
        <mask id="reels-cutout">
          <rect width="24" height="24" fill="white" />
          
          <path d="M10 10.5v5l4.5-2.5z" fill="black" />
          
          <rect x="0" y="7" width="24" height="1.5" fill="black" />
          
          <path d="M7.5 2l-2.5 5h2l2.5-5z" fill="black" />
          <path d="M14.5 2l-2.5 5h2l2.5-5z" fill="black" />
          <path d="M21.5 2l-2.5 5h2l2.5-5z" fill="black" />
        </mask>
      </defs>

      <rect x="2" y="2" width="20" height="20" rx="4" fill="#228B22" mask="url(#reels-cutout)" />
    </svg>
  </div>
</a>


    <div class="nav-spacer"></div> <a href="/friends" aria-label="Chat">
  <div class="nav-icon-container" style="position: relative; display: inline-flex; width: 24px; height: 24px;">
    
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path d="M12 3c5.5 0 10 3.58 10 8 0 2.5-1.4 4.74-3.55 6.15.3.92 1.05 2.22 1.05 2.22s-1.7.13-3.65-.9c-1.2.35-2.5.53-3.85.53-5.5 0-10-3.58-10-8s4.5-8 10-8z" fill="#2e7d32"/>
      <circle cx="7.5" cy="11" r="1.5" fill="#ffffff"/>
      <circle cx="12" cy="11" r="1.5" fill="#ffffff"/>
      <circle cx="16.5" cy="11" r="1.5" fill="#ffffff"/>
    </svg>

    <span class="notification-badge" style="position: absolute; top: -6px; right: -8px; background-color: #ff3b30; color: white; font-size: 10px; font-weight: bold; font-family: sans-serif; border-radius: 50%; min-width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; padding: 0 4px; border: 2px solid #ffffff;">2</span>
  
  </div>
</a>


<a href="/calendar" aria-label="Calendar">
  <div class="nav-icon-container" style="position: relative; display: inline-flex; width: 24px; height: 24px;">
    
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="calendarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#6fc258" />  <stop offset="100%" stop-color="#1c6827" /> </linearGradient>
      </defs>

      <rect x="3" y="5" width="18" height="17" rx="2" ry="2" fill="url(#calendarGrad)" />
      <rect x="6.5" y="3" width="2.5" height="4" rx="1" fill="url(#calendarGrad)" />
      <rect x="15" y="3" width="2.5" height="4" rx="1" fill="url(#calendarGrad)" />

      <rect x="5" y="9.5" width="2.5" height="2.5" fill="#ffffff" />
      <rect x="8.5" y="9.5" width="2.5" height="2.5" fill="#ffffff" />
      <rect x="12" y="9.5" width="2.5" height="2.5" fill="#ffffff" />
      <rect x="15.5" y="9.5" width="2.5" height="2.5" fill="#ffffff" />

      <rect x="5" y="13" width="2.5" height="2.5" fill="#ffffff" />
      <rect x="8.5" y="13" width="2.5" height="2.5" fill="#ffffff" />
      <rect x="12" y="13" width="2.5" height="2.5" fill="#ffffff" />
      <rect x="15.5" y="13" width="2.5" height="2.5" fill="#ffffff" />

      <rect x="5" y="16.5" width="2.5" height="2.5" fill="#ffffff" />
      <rect x="8.5" y="16.5" width="2.5" height="2.5" fill="#ffffff" />
      <rect x="12" y="16.5" width="6" height="2.5" fill="#ffffff" />
    </svg>

    <span class="notification-badge" style="position: absolute; top: -6px; right: -8px; background-color: #ff3b30; color: white; font-size: 10px; font-weight: bold; font-family: sans-serif; border-radius: 50%; min-width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; padding: 0 4px; border: 2px solid #ffffff;">5</span>
    
  </div>
</a>


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
