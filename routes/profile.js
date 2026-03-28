const express = require("express");
const router = express.Router();
const genz = require("../models/primary/User");
// 1. Import your Post model (Adjust the path as needed)
const Post = require("../models/primary/Post"); 

router.get("/profile", async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect("/login");

    // 2. Fetch the user details
    const user = await genz.findById(req.session.userId).lean();

    // 3. Fetch the posts created by this user, sorted by newest first
    const userPosts = await Post.find({ userId: req.session.userId })
                                .sort({ createdAt: -1 }) // Newest first
                                .lean();

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Profile View - CollegenZ Theme</title>
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
  :root {
    --primary-color: #228B22;
    --background-color: #FFFFFF;
    --text-main: #1A1A1A;
    --text-muted: #666666;
    --border-color: #EAEAEA;
    --app-bg: #f0f2f5;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { background-color: var(--app-bg); display: flex; justify-content: center; }
  .app-container { width: 100%; max-width: 400px; background: var(--background-color); min-height: 100vh; position: relative; overflow-x: hidden; box-shadow: 0 0 15px rgba(0,0,0,0.05); }
  
  /* ... (Keep all your previous CSS styles here) ... */
  .cover-photo { height: 130px; background-color: var(--primary-color); position: relative; }
  .header-actions { display: flex; justify-content: space-between; padding: 15px; }
  .back-btn { background: transparent; border: none; color: var(--background-color); font-size: 1.2rem; cursor: pointer; }
  .account-badge { border: 1px solid var(--background-color); color: var(--background-color); padding: 4px 12px; border-radius: 15px; font-size: 0.8rem; font-weight: 600; }
  .profile-header { padding: 0 20px; position: relative; margin-top: -40px; }
  .profile-img-container { width: 85px; height: 85px; border-radius: 50%; background: var(--background-color); border: 3px solid var(--background-color); overflow: hidden; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .profile-img { width: 100%; height: 100%; object-fit: cover; }
  .upload-label { font-size: 0.8rem; color: var(--primary-color); font-weight: 600; cursor: pointer; display: inline-block; margin-bottom: 15px; }
  .info-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .user-details h2 { font-size: 1.3rem; color: var(--text-main); margin-bottom: 4px; }
  .user-details p { font-size: 0.95rem; color: var(--text-muted); }
  .about-btn { border: 1px solid var(--border-color); background: var(--background-color); color: var(--text-main); padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
  .stats-row { display: flex; justify-content: space-around; padding: 25px 0 15px 0; text-align: center; }
  .stat-item h3 { font-size: 1.2rem; color: var(--text-main); margin-bottom: 4px; }
  .stat-item p { font-size: 0.85rem; color: var(--text-muted); }
  .tabs { display: flex; justify-content: space-around; padding: 12px 0; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
  .tab-icon { font-size: 1.3rem; color: var(--text-muted); cursor: pointer; }
  .tab-icon.active { color: var(--primary-color); }
  #editSection { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; background: #fafafa; }
  #editSection.open { padding: 20px; border-bottom: 1px solid var(--border-color); }
  .edit-group { margin-bottom: 12px; }
  .edit-input { width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem; outline-color: var(--primary-color); }
  .btn-save { width: 100%; padding: 12px; background: var(--primary-color); color: var(--background-color); border: none; font-weight: bold; font-size: 1rem; cursor: pointer; border-radius: 6px; margin-top: 10px; }
  
  /* Update Grid Styles to handle images */
  .grid-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
  }
  .grid-item {
    aspect-ratio: 1;
    background-color: var(--border-color);
    overflow: hidden; /* Ensures images don't break the grid */
  }
  .grid-item img {
    width: 100%;
    height: 100%;
    object-fit: cover; /* Keeps the images perfectly square */
  }
  .no-posts {
    grid-column: span 3;
    text-align: center;
    padding: 30px;
    color: var(--text-muted);
  }
</style>
</head>
<body>

<div class="app-container">
  <form id="profileForm" enctype="multipart/form-data">
    
    <div class="cover-photo">
      <div class="header-actions">
        <button type="button" class="back-btn"><i class="fa-solid fa-arrow-left"></i></button>
        <div class="account-badge">${(user.accountType || "public").charAt(0).toUpperCase() + (user.accountType || "public").slice(1)}</div>
      </div>
    </div>

    <div class="profile-header">
      <div class="profile-img-container">
        <img id="previewImage" class="profile-img" src="${user.picture || "/uploads/profilepic.jpg"}" alt="Profile">
      </div>
      <label class="upload-label">
        Change Photo
        <input type="file" name="picture" hidden onchange="previewProfile(event)">
      </label>
      <div class="info-row">
        <div class="user-details">
          <h2>${user.name || "Naveenkumar"}</h2>
          <p>${user.bio || "Webdeveloper / founder"}</p>
        </div>
        <button type="button" class="about-btn" onclick="toggleEdit()">About me</button>
      </div>
    </div>

    <div id="editSection">
       </div>

    <div class="stats-row">
      <div class="stat-item"><h3>${user.followers?.length || 0}</h3><p>followers</p></div>
      <div class="stat-item"><h3>${user.following?.length || 0}</h3><p>following</p></div>
      <div class="stat-item"><h3>${user.points || 0}</h3><p>Points</p></div>
    </div>

    <div class="tabs">
      <i class="fa-solid fa-table-cells tab-icon active"></i> 
      <i class="fa-solid fa-brain tab-icon"></i>             
      <i class="fa-solid fa-arrow-trend-up tab-icon"></i>    
      <i class="fa-solid fa-coins tab-icon"></i>             
      <i class="fa-regular fa-bookmark tab-icon"></i>        
    </div>

        <div class="grid-container">
      ${userPosts.length > 0 
        ? userPosts.map(post => {
            // Safely extract the first image just like your frontend JS does
            const imgSrc = Array.isArray(post.imageurl) ? post.imageurl[0] : (post.imageurl || '');
            
            return `
            <div class="grid-item">
              <img src="${imgSrc}" alt="User post" style="width:100%; height:100%; object-fit:cover;">
            </div>
            `;
          }).join('')
        : '<div class="no-posts" style="grid-column: span 3; text-align: center; padding: 20px;">No posts yet.</div>'
      }
    </div>


  </form>
</div>

<script>
// ... existing script functions (previewProfile, toggleEdit, saveProfile) ...
</script>

</body>
</html>
`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Profile error");
  }
});

module.exports = router;
