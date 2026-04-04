const express = require("express");
const router = express.Router();
const genz = require("../models/primary/User");
const Post = require("../models/primary/Post"); 

router.get("/profile", async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect("/login");

    // 1. Fetch the user details AND populate followers/following arrays with their data
    const user = await genz.findById(req.session.userId)
                           .populate('followers', 'name username picture _id')
                           .populate('following', 'name username picture _id')
                           .lean();

    // 2. Fetch the posts created by this user
    const userPosts = await Post.find({ userId: req.session.userId })
                                .sort({ createdAt: -1 }) 
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
  .stat-item { cursor: pointer; transition: opacity 0.2s; }
  .stat-item:active { opacity: 0.6; }
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
  
  .grid-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
  .grid-item { aspect-ratio: 1; background-color: var(--border-color); overflow: hidden; }
  .grid-item img { width: 100%; height: 100%; object-fit: cover; }
  .no-posts { grid-column: span 3; text-align: center; padding: 30px; color: var(--text-muted); }

  /* Modal Styles */
  .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: flex-end; }
  .modal-content { width: 100%; max-width: 400px; background: var(--background-color); height: 75vh; border-radius: 20px 20px 0 0; padding: 20px; display: flex; flex-direction: column; box-shadow: 0 -5px 15px rgba(0,0,0,0.1); animation: slideUp 0.3s ease-out; }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color); }
  .modal-header h3 { font-size: 1.1rem; color: var(--text-main); }
  .close-modal { font-size: 1.2rem; cursor: pointer; color: var(--text-muted); }
  .list-container { overflow-y: auto; flex: 1; padding-bottom: 20px; }
  .user-list-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .user-list-info { display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; overflow: hidden; }
  .user-list-img { width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color); flex-shrink: 0; }
  .user-list-details { overflow: hidden; }
  .user-list-details h4 { font-size: 0.95rem; margin: 0; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .user-list-details p { font-size: 0.8rem; margin: 0; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .action-btns { display: flex; gap: 8px; flex-shrink: 0; }
  .btn-msg { background: #EAEAEA; border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: var(--text-main); }
  .btn-action { background: #ff4d4d; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
  .btn-action.unfollow { background: var(--border-color); color: var(--text-main); }
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

    <div id="editSection"></div>

    <div class="stats-row">
      <div class="stat-item" onclick="openConnectionsModal('followers')">
        <h3>${user.followers?.length || 0}</h3><p>followers</p>
      </div>
      <div class="stat-item" onclick="openConnectionsModal('following')">
        <h3>${user.following?.length || 0}</h3><p>following</p>
      </div>
      <div class="stat-item">
        <h3>${user.points || 0}</h3><p>Points</p>
      </div>
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
            const imgSrc = Array.isArray(post.imageurl) ? post.imageurl[0] : (post.imageurl || '');
            return `
            <div class="grid-item">
              <img src="${imgSrc}" alt="User post" style="width:100%; height:100%; object-fit:cover;">
            </div>
            `;
          }).join('')
        : '<div class="no-posts">No posts yet.</div>'
      }
    </div>
  </form>

  <div class="modal-overlay" id="connectionsModal" onclick="closeModal(event)">
    <div class="modal-content" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3 id="modalTitle">Connections</h3>
        <i class="fa-solid fa-xmark close-modal" onclick="closeModal(event, true)"></i>
      </div>
      <div class="list-container" id="connectionsList">
        </div>
    </div>
  </div>

</div>

<script>
// Safely inject backend data into frontend variables
const followersData = ${JSON.stringify(user.followers || [])};
const followingData = ${JSON.stringify(user.following || [])};

function openConnectionsModal(type) {
  const modal = document.getElementById('connectionsModal');
  const title = document.getElementById('modalTitle');
  const listContainer = document.getElementById('connectionsList');
  
  modal.style.display = 'flex';
  title.innerText = type === 'followers' ? 'Followers' : 'Following';
  
  const data = type === 'followers' ? followersData : followingData;
  
  if (data.length === 0) {
    listContainer.innerHTML = '<p style="text-align:center; color:gray; margin-top: 20px;">No ' + type + ' yet.</p>';
    return;
  }

  // Using standard string concatenation here to prevent Node.js from breaking your res.send string literal
  listContainer.innerHTML = data.map(function(u) {
    var imgSrc = u.picture || '/uploads/profilepic.jpg';
    var userName = u.name || 'User';
    var userHandle = u.username ? '@' + u.username : '';
    
    var actionButton = type === 'following' 
      ? '<button class="btn-action unfollow" onclick="handleAction(\\'' + u._id + '\\', \\'unfollow\\')">Unfollow</button>'
      : '<button class="btn-action" onclick="handleAction(\\'' + u._id + '\\', \\'remove\\')">Remove</button>';

    return '<div class="user-list-item" id="user-row-' + u._id + '">' +
             '<div class="user-list-info" onclick="window.location.href=\\'/profile/' + u._id + '\\'">' +
               '<img src="' + imgSrc + '" class="user-list-img" alt="Profile">' +
               '<div class="user-list-details">' +
                 '<h4>' + userName + '</h4>' +
                 '<p>' + userHandle + '</p>' +
               '</div>' +
             '</div>' +
             '<div class="action-btns">' +
               '<button class="btn-msg" onclick="window.location.href=\\'/chat/' + u._id + '\\'">Message</button>' +
               actionButton +
             '</div>' +
           '</div>';
  }).join('');
}

function closeModal(e, force) {
  if (force === true || e.target.id === 'connectionsModal') {
    document.getElementById('connectionsModal').style.display = 'none';
  }
}

async function handleAction(userId, actionType) {
  try {
    if (actionType === 'unfollow') {
      await axios.post('/follow/' + userId); // Assumes your follow route base is /follow
    } else if (actionType === 'remove') {
      await axios.post('/followers/remove/' + userId); // Change to match your exact remove route base
    }
    
    // Visually remove from list immediately
    var row = document.getElementById('user-row-' + userId);
    if(row) row.remove();
    
  } catch (error) {
    console.error(error);
    alert('Action failed. Please try again.');
  }
}

// ... your other existing JS functions (previewProfile, toggleEdit, etc.) ...
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
