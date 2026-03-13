const express = require("express");
const router = express.Router();
const Post = require("../models/primary/Post");

// ----------------------
// 1. API: Fetch Post Data
// ----------------------
router.get("/api/post/:postId", async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    console.error("Error fetching post:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ----------------------
// 2. Share Script (Dynamic JS)
// ----------------------
router.get("/share-script.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");

  res.send(`
document.addEventListener("click", async function(e){
  const btn = e.target.closest(".share-btn");
  if(!btn) return;

  const postId = btn.dataset.id;
  const postUrl = "https://collegenz.in/share/" + postId;

  try {
    // FIXED: Fetch route now matches your backend exactly
    const res = await fetch("/api/post/" + postId);
    const p = await res.json();

    const shareText = p.data || "Check out this post on CollegenZ 🌱";
    const shareImage = Array.isArray(p.imageurl) ? p.imageurl[0] : p.imageurl || "";

    if(navigator.share) {
      navigator.share({
        title: "CollegenZ",
        text: shareText,
        url: postUrl
      }).catch(()=>{});
    } else {
      // FIXED: String concatenation and syntax errors repaired
      const popup = document.createElement("div");
      popup.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.15);z-index:9999;font-family:system-ui, sans-serif;text-align:center;min-width:280px;";

      popup.innerHTML =
        "<h4 style='margin:0 0 16px 0;color:#333;'>Share this post</h4>" +
        (shareImage ? "<img src='"+shareImage+"' style='width:100%;height:140px;object-fit:cover;border-radius:8px;margin-bottom:16px'><br>" : "") +
        "<div style='display:flex;flex-direction:column;gap:10px;margin-bottom:20px;'>" +
          "<a href='https://wa.me/?text="+encodeURIComponent(shareText+" "+postUrl)+"' target='_blank' style='background:#25D366;color:#fff;padding:10px;text-decoration:none;border-radius:8px;font-weight:600;'>📱 WhatsApp</a>" +
          "<a href='https://www.linkedin.com/sharing/share-offsite/?url="+encodeURIComponent(postUrl)+"' target='_blank' style='background:#0A66C2;color:#fff;padding:10px;text-decoration:none;border-radius:8px;font-weight:600;'>💼 LinkedIn</a>" +
          "<a href='https://twitter.com/intent/tweet?text="+encodeURIComponent(shareText)+"&url="+encodeURIComponent(postUrl)+"' target='_blank' style='background:#000;color:#fff;padding:10px;text-decoration:none;border-radius:8px;font-weight:600;'>🐦 X (Twitter)</a>" +
        "</div>" +
        "<button id='closeShare' style='background:transparent;border:1px solid #ddd;padding:8px 24px;border-radius:20px;cursor:pointer;font-weight:600;color:#666;'>Close</button>";

      document.body.appendChild(popup);
      document.getElementById("closeShare").onclick = () => popup.remove();
    }
  } catch(err) {
    console.error("Share error:", err);
  }
});
  `);
});

// ----------------------
// 3. Share Page (Link Preview & Redirect UI)
// ----------------------
router.get("/share/:postId", async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).send(`
        <div style="font-family:system-ui;text-align:center;padding:50px;">
          <h2>Post not found</h2>
          <p>This post may have been removed.</p>
          <a href="/" style="color:#007bff;">Return home</a>
        </div>
      `);
    }

    const image = Array.isArray(post.imageurl) ? post.imageurl[0] : post.imageurl;
    const caption = post.data ? post.data.substring(0, 150) + "..." : "Check this post on CollegenZ";
    const url = "https://collegenz.in/share/" + post._id;

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CollegenZ | Post</title>

    <meta property="og:title" content="CollegenZ">
    <meta property="og:description" content="${caption}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${image}">

    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #f4f6f9;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .loader-card {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            text-align: center;
            max-width: 320px;
            width: 90%;
        }
        .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e2e8f0;
            border-top-color: #007bff; /* Replace with your brand color */
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 24px auto;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        h2 {
            margin: 0 0 10px 0;
            color: #1a1a1a;
            font-size: 1.5rem;
        }
        p {
            margin: 0;
            color: #666;
            font-size: 0.95rem;
            line-height: 1.5;
        }
    </style>

    <script>
        // FIXED: Redirects to the actual post viewer instead of the home page
        setTimeout(() => {
            window.location.href = "/?post=${post._id}"; 
        }, 1500);
    </script>
</head>
<body>

    <div class="loader-card">
        <div class="spinner"></div>
        <h2>CollegenZ</h2>
        <p>Taking you to the post...</p>
    </div>

</body>
</html>
    `);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating share link");
  }
});

module.exports = router;
