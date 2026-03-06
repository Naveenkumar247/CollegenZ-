const express = require("express");
const router = express.Router();
const path = require("path");
const Post = require("../models/primary/Post");

router.get("/share-script.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");

  res.send(`
document.addEventListener("click", async function(e){

const btn = e.target.closest(".share-btn");
if(!btn) return;

const postId = btn.dataset.id;
const postUrl = "https://collegenz.in/share/" + postId;

try{

const res = await fetch("/share/api/post/" + postId);
const p = await res.json();

const shareText = p.data || "Check out this post on CollegenZ 🌱";
const shareImage = Array.isArray(p.imageurl) ? p.imageurl[0] : p.imageurl || "";

if(navigator.share){

navigator.share({
title:"CollegenZ",
text:shareText,
url:postUrl
}).catch(()=>{});

}else{

const popup = document.createElement("div");

popup.style.cssText =
"position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:20px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.2);z-index:9999;text-align:center;";

popup.innerHTML =
"<h5>Share this post</h5>" +
(shareImage ? "<img src='"+shareImage+"' style='width:120px;border-radius:8px;margin-bottom:10px'><br>" : "") +
"<a href='https://wa.me/?text="+encodeURIComponent(shareText+" "+postUrl)+"' target='_blank'>📱 WhatsApp</a><br>" +
"<a href='https://www.linkedin.com/sharing/share-offsite/?url="+encodeURIComponent(postUrl)+"' target='_blank'>💼 LinkedIn</a><br>" +
"<a href='https://twitter.com/intent/tweet?text="+encodeURIComponent(shareText)+"&url="+encodeURIComponent(postUrl)+"' target='_blank'>🐦 Twitter</a><br>" +
"<a href='https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(postUrl)+"' target='_blank'>📘 Facebook</a><br><br>" +
"<button id='closeShare'>Close</button>";

document.body.appendChild(popup);

document.getElementById("closeShare").onclick = ()=> popup.remove();

}

}catch(err){
console.error("Share error:", err);
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
router.get("/share/:postId", async (req, res) => {

try{

const post = await Post.findById(req.params.postId);

if(!post){
return res.status(404).send("Post not found");
}

const image = Array.isArray(post.imageurl)
? post.imageurl[0]
: post.imageurl;

const caption = post.data || "Check this post on CollegenZ";

const url = "https://collegenz.in/share/" + post._id;

res.send(`
<!DOCTYPE html>
<html>
<head>

<title>CollegenZ</title>

<meta property="og:title" content="CollegenZ">
<meta property="og:description" content="${caption}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${image}">

<script>
setTimeout(()=>{
window.location.href="/";
},1500);
</script>

</head>

<body>
Opening post...
</body>
</html>
`);

}catch(err){
console.error(err);
res.status(500).send("Error");
}

});

module.exports = router;
