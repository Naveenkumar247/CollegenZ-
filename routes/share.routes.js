const express = require("express");
const router = express.Router();
const path = require("path");
const Post = require("../models/primary/Post");

router.get("/share-script.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");

  res.send(`
document.addEventListener("click", function(e){

  const btn = e.target.closest(".share-btn");
  if(!btn) return;

  const postId = btn.dataset.id;
  const postUrl = "https://collegenz.in/share/" + postId;
  const shareText = "Check out this post on Collegenz 🌱 ";

  if(navigator.share){

    navigator.share({
      title: "CollegenZ",
      text: shareText,
      url: postUrl
    }).catch(()=>{});

  } else {

    const popup = document.createElement("div");

    popup.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:20px;border-radius:12px;box-shadow:0 5px 20px rgba(0,0,0,.3);z-index:9999;text-align:center;";

    popup.innerHTML =
      "<h5>Share this post</h5>" +
      "<a href='https://wa.me/?text="+encodeURIComponent(shareText)+"' target='_blank'>📱 WhatsApp</a><br>" +
      "<a href='https://www.linkedin.com/sharing/share-offsite/?url="+encodeURIComponent(postUrl)+"' target='_blank'>💼 LinkedIn</a><br>" +
      "<a href='https://twitter.com/intent/tweet?url="+encodeURIComponent(postUrl)+"' target='_blank'>🐦 Twitter</a><br>" +
      "<a href='https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(postUrl)+"' target='_blank'>📘 Facebook</a><br><br>" +
      "<button id='closeShare'>Close</button>";

    document.body.appendChild(popup);

    document.getElementById("closeShare").onclick = ()=> popup.remove();
  }

});
`);
});


// ----------------------
// API: Fetch Post Data
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
// Share Page
// ----------------------
router.get("/share/:postId", (req, res) => {
  res.sendFile(path.join(process.cwd(), "resend.html"));
});

module.exports = router;
