const express = require("express");
const router = express.Router();
const genz = require("../models/primary/User");
const Post = require("../models/primary/Post"); 

// Middleware to parse incoming JSON data
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

/* ==============================================================
   1. HTML TEMPLATE FUNCTION: PUBLIC PROFILE (POSTS ONLY)
============================================================== */
function renderPublicProfile(profileUser, isFollowing, userPosts) {
  let roleBadge = '';
  if (profileUser.accountType === 'business' && profileUser.businessType) {
      roleBadge = ` | ${profileUser.businessType}`;
  } else if (profileUser.role) {
      roleBadge = ` | ${profileUser.role}`;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${profileUser.name || profileUser.username} - Profile</title>
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
  :root { --primary-color: #228B22; --background-color: #FFFFFF; --text-main: #1A1A1A; --text-muted: #666666; --border-color: #EAEAEA; --app-bg: #f0f2f5; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { background-color: var(--app-bg); display: flex; justify-content: center; }
  .app-container { width: 100%; max-width: 500px; background: var(--background-color); min-height: 100vh; position: relative; overflow-x: hidden; box-shadow: 0 0 15px rgba(0,0,0,0.05); }
  .cover-photo { height: 130px; background-color: var(--primary-color); position: relative; transition: height 0.3s ease; }
  .header-actions { display: flex; justify-content: space-between; padding: 15px; }
  .back-btn { background: transparent; border: none; color: var(--background-color); font-size: 1.4rem; cursor: pointer; text-decoration: none; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; }
  .account-badge { border: 1px solid var(--background-color); color: var(--background-color); padding: 4px 12px; border-radius: 15px; font-size: 0.8rem; font-weight: 600; text-transform: capitalize; }
  .profile-header { padding: 0 20px; position: relative; margin-top: -40px; transition: margin 0.3s ease; }
  .profile-img-container { width: 85px; height: 85px; border-radius: 50%; background: var(--background-color); border: 3px solid var(--background-color); overflow: hidden; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .profile-img { width: 100%; height: 100%; object-fit: cover; }
  .info-row { display: flex; flex-direction: column; gap: 15px; }
  .user-details h2 { font-size: 1.3rem; color: var(--text-main); margin-bottom: 4px; transition: font-size 0.3s; }
  .user-details p { font-size: 0.95rem; color: var(--text-muted); }
  .profile-actions { display: flex; gap: 10px; width: 100%; }
  .action-btn { flex: 1; border: 1px solid var(--border-color); background: var(--background-color); color: var(--text-main); padding: 8px 0; border-radius: 20px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: flex; justify-content: center; align-items: center; gap: 6px;}
  .btn-primary { background: var(--primary-color); color: white; border-color: var(--primary-color); }
  .btn-primary:active { opacity: 0.8; }
  .stats-row { display: flex; justify-content: space-around; padding: 25px 0 20px 0; text-align: center; border-bottom: 1px solid var(--border-color); }
  .stat-item h3 { font-size: 1.2rem; color: var(--text-main); margin-bottom: 4px; }
  .stat-item p { font-size: 0.85rem; color: var(--text-muted); }
  .posts-header { padding: 15px; text-align: center; font-weight: 600; color: var(--text-main); font-size: 1.1rem; }
  .grid-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
  .grid-item { aspect-ratio: 1; background-color: var(--border-color); overflow: hidden; }
  .grid-item img { width: 100%; height: 100%; object-fit: cover; }
  .empty-state { grid-column: span 3; text-align: center; padding: 40px 20px; color: var(--text-muted); }

  @media (min-width: 768px) {
    body { padding: 40px 0; }
    .app-container { max-width: 750px; border-radius: 12px; min-height: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.08); padding-bottom: 20px; }
    .cover-photo { height: 200px; border-radius: 12px 12px 0 0; }
    .profile-header { padding: 0 40px; margin-top: -60px; }
    .profile-img-container { width: 130px; height: 130px; border-width: 5px; margin-bottom: 20px;}
    .user-details h2 { font-size: 1.8rem; }
    .user-details p { font-size: 1.1rem; }
    .info-row { flex-direction: row; justify-content: space-between; align-items: flex-end; }
    .profile-actions { width: auto; gap: 15px; }
    .action-btn { padding: 10px 30px; }
    .action-btn:hover { background: #f5f5f5; }
    .btn-primary:hover { background: #1e7a1e; color: white; }
    .stats-row { justify-content: center; gap: 80px; padding: 30px 0; }
    .stat-item h3 { font-size: 1.5rem; }
    .stat-item p { font-size: 1rem; }
    .posts-header { font-size: 1.2rem; padding: 20px; }
    .grid-container { gap: 8px; padding: 0 10px; }
  }
</style>
</head>
<body>
<div class="app-container">
  <div class="cover-photo">
    <div class="header-actions">
      <a href="javascript:history.back()" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
      <div class="account-badge">${profileUser.accountType || "public"}</div>
    </div>
  </div>
  <div class="profile-header">
    <div class="profile-img-container">
      <img class="profile-img" src="${profileUser.picture || '/uploads/profilepic.jpg'}" alt="Profile">
    </div>
    <div class="info-row">
      <div class="user-details">
        <h2>${profileUser.name || profileUser.username}</h2>
        <p><strong>${profileUser.accountType || "public"}</strong> ${roleBadge}</p>
        <p style="margin-top: 5px;">${profileUser.bio || ""}</p>
      </div>
      <div class="profile-actions">
        <button id="followBtn" class="action-btn ${isFollowing ? '' : 'btn-primary'}" onclick="toggleFollow('${profileUser._id}')">
          <i class="fa-solid ${isFollowing ? 'fa-check' : 'fa-user-plus'}"></i> ${isFollowing ? 'Following' : 'Follow'}
        </button>
        <button class="action-btn" onclick="window.location.href='/chat/${profileUser._id}'">
          <i class="fa-regular fa-comment-dots"></i> Message
        </button>
      </div>
    </div>
  </div>
  <div class="stats-row">
    <div class="stat-item">
      <h3>${profileUser.followers ? profileUser.followers.length : 0}</h3><p>followers</p>
    </div>
    <div class="stat-item">
      <h3>${profileUser.following ? profileUser.following.length : 0}</h3><p>following</p>
    </div>
    <div class="stat-item">
      <h3>${profileUser.points || 0}</h3><p>Points</p>
    </div>
  </div>
  <div class="posts-header"><i class="fa-solid fa-table-cells" style="margin-right: 5px;"></i> Posts</div>
  <div class="grid-container">
    ${userPosts && userPosts.length > 0
      ? userPosts.map(post => {
          const imgSrc = Array.isArray(post.imageurl) ? post.imageurl[0] : (post.imageurl || '');
          return '<div class="grid-item"><img src="' + imgSrc + '" alt="User post"></div>';
        }).join('')
      : '<div class="empty-state">No posts yet.</div>'
    }
  </div>
</div>
<script>
async function toggleFollow(userId) {
  try {
    const btn = document.getElementById('followBtn');
    await axios.post('/follow/' + userId);
    if (btn.classList.contains('btn-primary')) {
      btn.classList.remove('btn-primary');
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Following';
    } else {
      btn.classList.add('btn-primary');
      btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Follow';
    }
  } catch (error) {
    console.error(error);
    alert('Failed to update follow status.');
  }
}
</script>
</body>
</html>
  `;
}


/* ==============================================================
   2. GET OWN PROFILE PAGE (LOGGED IN USER)
============================================================== */
router.get("/profile", async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect("/login");

    const user = await genz.findById(req.session.userId)
                           .populate('followers', 'name username picture _id')
                           .populate('following', 'name username picture _id')
                           .lean();

    const userPosts = await Post.find({ userId: req.session.userId })
                                .sort({ createdAt: -1 }) 
                                .lean();

    let savedPosts = [];
    if (user.savedPosts && user.savedPosts.length > 0) {
      savedPosts = await Post.find({ _id: { $in: user.savedPosts } }).lean();
    }

    let roleBadge = '';
    if (user.accountType === 'business' && user.businessType) {
        roleBadge = ` | ${user.businessType}`;
    } else if (user.role) {
        roleBadge = ` | ${user.role}`;
    }

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Profile - CollegenZ</title>
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
  :root { --primary-color: #228B22; --background-color: #FFFFFF; --text-main: #1A1A1A; --text-muted: #666666; --border-color: #EAEAEA; --app-bg: #f0f2f5; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { background-color: var(--app-bg); display: flex; justify-content: center; }
  .app-container { width: 100%; max-width: 500px; background: var(--background-color); min-height: 100vh; position: relative; overflow-x: hidden; box-shadow: 0 0 15px rgba(0,0,0,0.05); }
  .cover-photo { height: 130px; background-color: var(--primary-color); position: relative; transition: height 0.3s ease; }
  .header-actions { display: flex; justify-content: space-between; padding: 15px; }
  .back-btn { background: transparent; border: none; color: var(--background-color); font-size: 1.4rem; cursor: pointer; text-decoration: none; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;}
  .account-badge { border: 1px solid var(--background-color); color: var(--background-color); padding: 4px 12px; border-radius: 15px; font-size: 0.8rem; font-weight: 600; text-transform: capitalize;}
  .profile-header { padding: 0 20px; position: relative; margin-top: -40px; transition: margin-top 0.3s ease;}
  .profile-img-container { width: 85px; height: 85px; border-radius: 50%; background: var(--background-color); border: 3px solid var(--background-color); overflow: hidden; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s ease;}
  .profile-img { width: 100%; height: 100%; object-fit: cover; }
  .info-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .user-details h2 { font-size: 1.3rem; color: var(--text-main); margin-bottom: 4px; transition: font-size 0.3s ease;}
  .user-details p { font-size: 0.95rem; color: var(--text-muted); }
  .edit-btn { border: 1px solid var(--border-color); background: var(--background-color); color: var(--text-main); padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; text-decoration: none;}
  .edit-btn:hover { background: #f5f5f5; }
  .edit-btn i { font-size: 0.8rem; color: var(--primary-color); }
  .stats-row { display: flex; justify-content: space-around; padding: 25px 0 15px 0; text-align: center; }
  .stat-item { cursor: pointer; transition: opacity 0.2s; }
  .stat-item:active { opacity: 0.6; }
  .stat-item h3 { font-size: 1.2rem; color: var(--text-main); margin-bottom: 4px; }
  .stat-item p { font-size: 0.85rem; color: var(--text-muted); }
  .tabs { display: flex; justify-content: space-around; padding: 12px 0; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
  .tab-icon { font-size: 1.3rem; color: var(--text-muted); cursor: pointer; transition: color 0.2s; }
  .tab-icon.active { color: var(--primary-color); }
  .tab-content { display: none; padding: 1px 0 15px 0; animation: fadeIn 0.3s ease; }
  .tab-content.active { display: block; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  .grid-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
  .grid-item { aspect-ratio: 1; background-color: var(--border-color); overflow: hidden; }
  .grid-item img { width: 100%; height: 100%; object-fit: cover; }
  .empty-state { grid-column: span 3; text-align: center; padding: 40px 20px; color: var(--text-muted); }
  .skills-container { padding: 15px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .skill-chip { border: 1px solid var(--border-color); padding: 10px 16px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; background: #fafafa; display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease; width: 100%; }
  .skill-chip.selected { background: var(--primary-color); color: white; border-color: var(--primary-color); }
  .skill-name { font-weight: 600; margin-bottom: 2px; text-align: center; }
  .skill-time { font-size: 0.7rem; opacity: 0.8; }
  .stats-display { text-align: center; padding: 30px 20px; }
  .stats-circle { width: 120px; height: 120px; border-radius: 50%; border: 6px solid var(--primary-color); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2rem; font-weight: bold; color: var(--primary-color); }
  .era-building { text-align: center; padding: 40px 20px; color: var(--text-muted); }
  .era-building i { font-size: 3rem; color: #f39c12; margin-bottom: 15px; }
  .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: flex-end; }
  .modal-content { width: 100%; max-width: 500px; background: var(--background-color); height: 75vh; border-radius: 20px 20px 0 0; padding: 20px; display: flex; flex-direction: column; box-shadow: 0 -5px 15px rgba(0,0,0,0.1); animation: slideUp 0.3s ease-out; }
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
  .action-btns { display: flex; gap: 10px; flex-shrink: 0; align-items: center; }
  .btn-msg { background: #EAEAEA; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 1.1rem; cursor: pointer; color: var(--text-main); display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
  .btn-msg:hover { background: #d0d0d0; }
  .btn-action { background: #ff4d4d; color: white; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
  .btn-action:hover { background: #cc0000; }
  .btn-action.unfollow { background: var(--border-color); color: var(--text-main); }
  .btn-action.unfollow:hover { background: #d0d0d0; }

  @media (min-width: 768px) {
    body { padding: 40px 0; }
    .app-container { max-width: 850px; border-radius: 12px; min-height: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.08); padding-bottom: 30px; }
    .cover-photo { height: 250px; border-radius: 12px 12px 0 0; }
    .profile-header { padding: 0 50px; margin-top: -75px; }
    .profile-img-container { width: 150px; height: 150px; border-width: 5px; margin-bottom: 20px;}
    .user-details h2 { font-size: 1.8rem; }
    .user-details p { font-size: 1.1rem; }
    .edit-btn { padding: 8px 20px; font-size: 1rem; }
    .stats-row { justify-content: center; gap: 80px; padding: 40px 0 30px 0; }
    .stat-item h3 { font-size: 1.5rem; }
    .stat-item p { font-size: 1rem; }
    .stat-item:hover { opacity: 0.7; }
    .tab-icon:hover { color: var(--primary-color); }
    .skill-chip:hover:not(.selected) { background: #eeeeee; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
    .grid-container { gap: 15px; padding: 20px 40px; }
    .skills-container { grid-template-columns: repeat(3, 1fr); gap: 15px; padding: 20px 40px; }
    .skill-chip { padding: 15px 20px; }
    .modal-overlay { align-items: center; }
    .modal-content { height: 60vh; max-height: 600px; border-radius: 12px; animation: fadeInModal 0.2s ease-out; }
  }
</style>
</head>
<body>

<div class="app-container">
  <div class="cover-photo">
    <div class="header-actions">
      <a href="/" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
      <div class="account-badge">${(user.accountType || "public").charAt(0).toUpperCase() + (user.accountType || "public").slice(1)}</div>
    </div>
  </div>

  <div class="profile-header">
    <div class="profile-img-container">
      <img id="previewImage" class="profile-img" src="${user.picture || "/uploads/profilepic.jpg"}" alt="Profile">
    </div>
    
    <div class="info-row">
      <div class="user-details">
        <h2 id="displayName">${user.name || "User"}</h2>
        <p><strong>${(user.accountType || "public").charAt(0).toUpperCase() + (user.accountType || "public").slice(1)} Account</strong> ${roleBadge}</p>
        <p id="displayBio" style="margin-top:5px;">${user.bio || ""}</p>
      </div>
      <a href="/profile/edit" class="edit-btn">
        <i class="fa-solid fa-pen-to-square"></i> Edit
      </a>
    </div>
  </div>

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
    <i class="fa-solid fa-table-cells tab-icon active" onclick="switchTab('posts', this)"></i> 
    <i class="fa-solid fa-brain tab-icon" onclick="switchTab('learning', this)"></i>             
    <i class="fa-solid fa-arrow-trend-up tab-icon" onclick="switchTab('stats', this)"></i>    
    <i class="fa-solid fa-coins tab-icon" onclick="switchTab('era', this)"></i>             
    <i class="fa-regular fa-bookmark tab-icon" onclick="switchTab('saved', this)"></i>        
  </div>

  <div id="tab-posts" class="tab-content active">
    <div class="grid-container">
      ${userPosts.length > 0 
        ? userPosts.map(post => {
            const imgSrc = Array.isArray(post.imageurl) ? post.imageurl[0] : (post.imageurl || '');
            return '<div class="grid-item"><img src="' + imgSrc + '" alt="User post"></div>';
          }).join('')
        : '<div class="empty-state">No posts yet.</div>'
      }
    </div>
  </div>

  <div id="tab-learning" class="tab-content">
    <div class="skills-container" id="skillsList"></div>
  </div>

  <div id="tab-stats" class="tab-content">
    <div class="stats-display">
      ${(user.points && user.points > 0) 
        ? '<div class="stats-circle">' + user.points + '</div><h3>Active Learner</h3><p>Points earned over time.</p>' 
        : '<div class="empty-state"><i class="fa-solid fa-chart-line" style="font-size:3rem; margin-bottom:15px;"></i><br>Not started yet.<br><small style="display:block; margin-top:8px;">Complete learning paths to earn points!</small></div>'
      }
    </div>
  </div>

  <div id="tab-era" class="tab-content">
    <div class="era-building">
      <i class="fa-solid fa-person-digging"></i>
      <h3>CollegenZ Era</h3>
      <p style="margin-top:10px;">The internal digital currency system is currently being built. Check back soon!</p>
    </div>
  </div>

  <div id="tab-saved" class="tab-content">
    <div class="grid-container">
      ${savedPosts.length > 0 
        ? savedPosts.map(post => {
            const imgSrc = Array.isArray(post.imageurl) ? post.imageurl[0] : (post.imageurl || '');
            return '<div class="grid-item"><img src="' + imgSrc + '" alt="Saved post"></div>';
          }).join('')
        : '<div class="empty-state">No saved posts yet.</div>'
      }
    </div>
  </div>

  <div class="modal-overlay" id="connectionsModal" onclick="closeModal(event)">
    <div class="modal-content" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3 id="modalTitle">Connections</h3>
        <i class="fa-solid fa-xmark close-modal" onclick="closeModal(event, true)"></i>
      </div>
      <div class="list-container" id="connectionsList"></div>
    </div>
  </div>

</div>

<script>
function switchTab(tabId, element) {
  document.querySelectorAll('.tab-icon').forEach(icon => icon.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  element.classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
}

const availableSkills = [
  { id: 'web-dev', name: 'Web Development', time: '3 Months' },
  { id: 'ui-ux', name: 'UI/UX Design', time: '2 Months' },
  { id: 'python', name: 'Python Basics', time: '1 Month' },
  { id: 'data-science', name: 'Data Science', time: '6 Months' },
  { id: 'marketing', name: 'Digital Marketing', time: '2 Months' },
  { id: 'ai-prompt', name: 'AI Prompt Eng.', time: '2 Weeks' }
];

const userSavedSkills = ${JSON.stringify(user.learningPaths || [])};

function renderSkills() {
  const container = document.getElementById('skillsList');
  container.innerHTML = availableSkills.map(function(skill) {
    const isSelected = userSavedSkills.includes(skill.id) ? 'selected' : '';
    return '<div class="skill-chip ' + isSelected + '" onclick="toggleSkill(\\'' + skill.id + '\\', this)">' +
             '<span class="skill-name">' + skill.name + '</span>' +
             '<span class="skill-time">' + skill.time + '</span>' +
           '</div>';
  }).join('');
}

async function toggleSkill(skillId, element) {
  const isCurrentlySelected = element.classList.contains('selected');
  element.classList.toggle('selected'); 

  try {
    await axios.post('/api/profile/learningpath', {
      skillId: skillId,
      action: isCurrentlySelected ? 'remove' : 'add'
    });
  } catch (error) {
    console.error("Error saving skill", error);
    alert("Failed to save learning path. Try again.");
    element.classList.toggle('selected');
  }
}
renderSkills();

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

  listContainer.innerHTML = data.map(function(u) {
    var imgSrc = u.picture || '/uploads/profilepic.jpg';
    var userName = u.name || 'User';
    var userHandle = u.username ? '@' + u.username : '';
    
    var actionButton = type === 'following' 
      ? '<button class="btn-action unfollow" onclick="handleAction(\\'' + u._id + '\\', \\'unfollow\\')" title="Unfollow"><i class="fa-solid fa-user-minus"></i></button>'
      : '<button class="btn-action" onclick="handleAction(\\'' + u._id + '\\', \\'remove\\')" title="Remove Follower"><i class="fa-solid fa-user-xmark"></i></button>';

    return '<div class="user-list-item" id="user-row-' + u._id + '">' +
             '<div class="user-list-info" onclick="window.location.href=\\'/profile/' + u._id + '\\'">' +
               '<img src="' + imgSrc + '" class="user-list-img" alt="Profile">' +
               '<div class="user-list-details">' +
                 '<h4>' + userName + '</h4>' +
                 '<p>' + userHandle + '</p>' +
               '</div>' +
             '</div>' +
             '<div class="action-btns">' +
               '<button class="btn-msg" onclick="window.location.href=\\'/chat/' + u._id + '\\'" title="Message"><i class="fa-regular fa-comment-dots"></i></button>' +
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
      await axios.post('/follow/' + userId); 
    } else if (actionType === 'remove') {
      await axios.post('/followers/remove/' + userId); 
    }
    
    var row = document.getElementById('user-row-' + userId);
    if(row) row.remove();
    
  } catch (error) {
    console.error(error);
    alert('Action failed. Please try again.');
  }
}
</script>
</body>
</html>
`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Profile error");
  }
});


/* ==============================================================
   3. GET EDIT PROFILE PAGE (WITH CUSTOM UI DROPDOWNS)
============================================================== */
router.get("/profile/edit", async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect("/login");

    const user = await genz.findById(req.session.userId).lean();

    const isPublic = user.accountType === 'public' ? 'selected' : '';
    const isPrivate = user.accountType === 'private' ? 'selected' : '';
    const isBusiness = user.accountType === 'business' ? 'selected' : '';

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Edit Profile - CollegenZ</title>
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
  :root { --primary-color: #228B22; --background-color: #FFFFFF; --text-main: #1A1A1A; --text-muted: #666666; --border-color: #EAEAEA; --app-bg: #f0f2f5; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { background-color: var(--app-bg); display: flex; justify-content: center; }
  
  .app-container { width: 100%; max-width: 500px; background: var(--background-color); min-height: 100vh; display: flex; flex-direction: column; box-shadow: 0 0 15px rgba(0,0,0,0.05); }
  
  .edit-header { display: flex; align-items: center; justify-content: space-between; padding: 20px; border-bottom: 1px solid var(--border-color); background: var(--background-color); position: sticky; top: 0; z-index: 10; }
  .edit-header h2 { font-size: 1.2rem; color: var(--text-main); margin: 0; }
  .back-btn { background: transparent; border: none; color: var(--text-main); font-size: 1.4rem; cursor: pointer; text-decoration: none; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; }
  .save-header-btn { color: var(--primary-color); font-weight: bold; background: none; border: none; font-size: 1rem; cursor: pointer; }
  
  .form-container { padding: 30px 20px; }
  
  .pic-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 30px; }
  .profile-img-container { width: 100px; height: 100px; border-radius: 50%; background: var(--border-color); border: 2px solid var(--border-color); overflow: hidden; margin-bottom: 12px; }
  .profile-img-container img { width: 100%; height: 100%; object-fit: cover; }
  .upload-label { font-size: 0.9rem; color: var(--primary-color); font-weight: 600; cursor: pointer; }
  
  .input-group { margin-bottom: 25px; }
  .input-group label { display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px; font-weight: 500; }
  .input-group input, .input-group textarea, .input-group select { width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1rem; outline-color: var(--primary-color); font-family: inherit; background: #fafafa; transition: background 0.2s; }
  .input-group input:focus, .input-group textarea:focus, .input-group select:focus { background: var(--background-color); }
  .input-group textarea { resize: vertical; min-height: 100px; }
  
  /* 🔥 CUSTOM DROPDOWN UI STYLES */
  .custom-dropdown { position: relative; }
  .custom-dropdown input { 
    cursor: pointer; 
    caret-color: transparent; 
    background: #fafafa url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="%23666"><path d="M31.3 192h257.3c17.8 0 26.7 21.5 14.1 34.1L174.1 354.8c-7.8 7.8-20.5 7.8-28.3 0L17.2 226.1C4.6 213.5 13.5 192 31.3 192z"/></svg>') no-repeat right 15px center/12px; 
  }
  .dropdown-list { 
    position: absolute; top: 100%; left: 0; right: 0; background: var(--background-color); border: 1px solid var(--border-color); border-radius: 8px; margin-top: 5px; max-height: 0; overflow-y: auto; opacity: 0; visibility: hidden; transition: all 0.3s ease; z-index: 100; box-shadow: 0 5px 15px rgba(0,0,0,0.1); 
  }
  .dropdown-list.show { max-height: 250px; opacity: 1; visibility: visible; }
  .dropdown-list div { padding: 10px 15px; font-size: 0.95rem; color: var(--text-main); cursor: pointer; border-bottom: 1px solid var(--border-color); }
  .dropdown-list div:last-child { border-bottom: none; }
  .dropdown-list div:hover { background: #f0f2f5; color: var(--primary-color); }

  .btn-save { width: 100%; padding: 14px; background: var(--primary-color); color: var(--background-color); border: none; font-weight: bold; font-size: 1.1rem; cursor: pointer; border-radius: 8px; margin-top: 10px; transition: background 0.2s; }
  .btn-save:hover { background: #1e7a1e; }

  @media (min-width: 768px) {
    body { padding: 40px 0; }
    .app-container { max-width: 600px; border-radius: 12px; min-height: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.08); padding-bottom: 30px; }
    .edit-header { border-radius: 12px 12px 0 0; }
  }
</style>
</head>
<body>

<div class="app-container">
  <div class="edit-header">
    <a href="/profile" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
    <h2>Edit Profile</h2>
    <button class="save-header-btn" onclick="saveProfile()">Save</button>
  </div>

  <div class="form-container">
    <div class="pic-section">
      <div class="profile-img-container">
        <img id="previewImage" src="${user.picture || '/uploads/profilepic.jpg'}" alt="Profile">
      </div>
      <label class="upload-label">
        Change Photo
        <input type="file" name="picture" hidden onchange="previewProfile(event)">
      </label>
    </div>

    <div class="input-group">
      <label>Account Type</label>
      <select id="accountTypeInput" onchange="toggleAccountFields()">
        <option value="public" ${isPublic}>Public</option>
        <option value="private" ${isPrivate}>Private</option>
        <option value="business" ${isBusiness}>Business</option>
      </select>
    </div>

    <div class="input-group" id="roleGroup" style="display: ${user.accountType === 'business' ? 'none' : 'block'};">
      <label>Role</label>
      <div class="custom-dropdown">
        <input type="text" id="roleInput" placeholder="Select Role" value="${user.role || ''}" readonly onclick="toggleRoleDropdown()" />
        <div class="dropdown-list" id="roleDropdown">
          <div onclick="selectRole('Student')">Student</div>
          <div onclick="selectRole('School Student')">School Student</div>
          <div onclick="selectRole('College Student')">College Student</div>
          <div onclick="selectRole('Postgraduate Student')">Postgraduate Student</div>
          <div onclick="selectRole('Web Developer')">Web Developer</div>
          <div onclick="selectRole('Frontend Developer')">Frontend Developer</div>
          <div onclick="selectRole('Backend Developer')">Backend Developer</div>
          <div onclick="selectRole('Full Stack Developer')">Full Stack Developer</div>
          <div onclick="selectRole('Software Engineer')">Software Engineer</div>
          <div onclick="selectRole('Mobile App Developer')">Mobile App Developer</div>
          <div onclick="selectRole('Game Developer')">Game Developer</div>
          <div onclick="selectRole('DevOps Engineer')">DevOps Engineer</div>
          <div onclick="selectRole('Cloud Engineer')">Cloud Engineer</div>
          <div onclick="selectRole('Cybersecurity Specialist')">Cybersecurity Specialist</div>
          <div onclick="selectRole('Data Analyst')">Data Analyst</div>
          <div onclick="selectRole('Data Scientist')">Data Scientist</div>
          <div onclick="selectRole('Machine Learning Engineer')">Machine Learning Engineer</div>
          <div onclick="selectRole('AI Engineer')">AI Engineer</div>
          <div onclick="selectRole('Graphic Designer')">Graphic Designer</div>
          <div onclick="selectRole('UI/UX Designer')">UI/UX Designer</div>
          <div onclick="selectRole('Product Designer')">Product Designer</div>
          <div onclick="selectRole('Video Editor')">Video Editor</div>
          <div onclick="selectRole('Animator')">Animator</div>
          <div onclick="selectRole('Entrepreneur')">Entrepreneur</div>
          <div onclick="selectRole('Freelancer')">Freelancer</div>
          <div onclick="selectRole('Digital Marketer')">Digital Marketer</div>
          <div onclick="selectRole('SEO Specialist')">SEO Specialist</div>
          <div onclick="selectRole('Social Media Manager')">Social Media Manager</div>
          <div onclick="selectRole('Sales Executive')">Sales Executive</div>
          <div onclick="selectRole('Business Analyst')">Business Analyst</div>
          <div onclick="selectRole('Content Creator')">Content Creator</div>
          <div onclick="selectRole('YouTuber')">YouTuber</div>
          <div onclick="selectRole('Blogger')">Blogger</div>
          <div onclick="selectRole('Influencer')">Influencer</div>
          <div onclick="selectRole('Copywriter')">Copywriter</div>
          <div onclick="selectRole('Teacher')">Teacher</div>
          <div onclick="selectRole('Trainer')">Trainer</div>
          <div onclick="selectRole('Consultant')">Consultant</div>
          <div onclick="selectRole('Accountant')">Accountant</div>
          <div onclick="selectRole('Doctor')">Doctor</div>
          <div onclick="selectRole('Engineer')">Engineer</div>
          <div onclick="selectRole('Other')">Other</div>
        </div>
      </div>
    </div>

    <div class="input-group" id="businessTypeGroup" style="display: ${user.accountType === 'business' ? 'block' : 'none'};">
      <label>Business Type</label>
      <div class="custom-dropdown">
        <input type="text" id="businessTypeInput" placeholder="Select Business Type" value="${user.businessType || ''}" readonly onclick="toggleBusinessDropdown()" />
        <div class="dropdown-list" id="businessDropdown">
          <div onclick="selectBusiness('Edutech')">Edutech</div>
          <div onclick="selectBusiness('Fintech')">Fintech</div>
          <div onclick="selectBusiness('Healthtech')">Healthtech</div>
          <div onclick="selectBusiness('AgriTech')">AgriTech</div>
          <div onclick="selectBusiness('LegalTech')">LegalTech</div>
          <div onclick="selectBusiness('PropTech')">PropTech</div>
          <div onclick="selectBusiness('SaaS')">SaaS</div>
          <div onclick="selectBusiness('AI / ML Services')">AI / ML Services</div>
          <div onclick="selectBusiness('Cybersecurity')">Cybersecurity</div>
          <div onclick="selectBusiness('Blockchain / Web3')">Blockchain / Web3</div>
          <div onclick="selectBusiness('Educational Consultant')">Educational Consultant</div>
          <div onclick="selectBusiness('Career Counseling')">Career Counseling</div>
          <div onclick="selectBusiness('Training Institute')">Training Institute</div>
          <div onclick="selectBusiness('Corporate Training')">Corporate Training</div>
          <div onclick="selectBusiness('Coaching Center')">Coaching Center</div>
          <div onclick="selectBusiness('Online Course Provider')">Online Course Provider</div>
          <div onclick="selectBusiness('Study Abroad Consultancy')">Study Abroad Consultancy</div>
          <div onclick="selectBusiness('HR Consultancy')">HR Consultancy</div>
          <div onclick="selectBusiness('Business Consultancy')">Business Consultancy</div>
          <div onclick="selectBusiness('Manufacturer Unit')">Manufacturer Unit</div>
          <div onclick="selectBusiness('Textile Manufacturing')">Textile Manufacturing</div>
          <div onclick="selectBusiness('Food Processing')">Food Processing</div>
          <div onclick="selectBusiness('Electronics Manufacturing')">Electronics Manufacturing</div>
          <div onclick="selectBusiness('Furniture Manufacturing')">Furniture Manufacturing</div>
          <div onclick="selectBusiness('Plastic Industry')">Plastic Industry</div>
          <div onclick="selectBusiness('Automobile Parts Manufacturing')">Automobile Parts Manufacturing</div>
          <div onclick="selectBusiness('Chemical Manufacturing')">Chemical Manufacturing</div>
          <div onclick="selectBusiness('Handicrafts')">Handicrafts</div>
          <div onclick="selectBusiness('Machinery Manufacturing')">Machinery Manufacturing</div>
          <div onclick="selectBusiness('College')">College</div>
          <div onclick="selectBusiness('School')">School</div>
          <div onclick="selectBusiness('Nursery')">Nursery</div>
          <div onclick="selectBusiness('E-commerce')">E-commerce</div>
          <div onclick="selectBusiness('Retail Store')">Retail Store</div>
          <div onclick="selectBusiness('Wholesale Business')">Wholesale Business</div>
          <div onclick="selectBusiness('Dropshipping')">Dropshipping</div>
          <div onclick="selectBusiness('Fashion Brand')">Fashion Brand</div>
          <div onclick="selectBusiness('Electronics Store')">Electronics Store</div>
          <div onclick="selectBusiness('Agency')">Agency</div>
          <div onclick="selectBusiness('Digital Marketing Agency')">Digital Marketing Agency</div>
          <div onclick="selectBusiness('Web Development')">Web Development</div>
          <div onclick="selectBusiness('App Development')">App Development</div>
          <div onclick="selectBusiness('Graphic Design')">Graphic Design</div>
          <div onclick="selectBusiness('Photography / Videography')">Photography / Videography</div>
          <div onclick="selectBusiness('Content Creation')">Content Creation</div>
          <div onclick="selectBusiness('Accounting / CA Firm')">Accounting / CA Firm</div>
          <div onclick="selectBusiness('Legal Services')">Legal Services</div>
          <div onclick="selectBusiness('Hospital / Clinic')">Hospital / Clinic</div>
          <div onclick="selectBusiness('Diagnostic Center')">Diagnostic Center</div>
          <div onclick="selectBusiness('Fitness Center / Gym')">Fitness Center / Gym</div>
          <div onclick="selectBusiness('Yoga Studio')">Yoga Studio</div>
          <div onclick="selectBusiness('Nutrition Consultancy')">Nutrition Consultancy</div>
          <div onclick="selectBusiness('Pharmacy')">Pharmacy</div>
          <div onclick="selectBusiness('Restaurant / Cafe')">Restaurant / Cafe</div>
          <div onclick="selectBusiness('Cloud Kitchen')">Cloud Kitchen</div>
          <div onclick="selectBusiness('Catering')">Catering</div>
          <div onclick="selectBusiness('Bakery')">Bakery</div>
          <div onclick="selectBusiness('Food Truck')">Food Truck</div>
          <div onclick="selectBusiness('Logistics')">Logistics</div>
          <div onclick="selectBusiness('Courier Service')">Courier Service</div>
          <div onclick="selectBusiness('Transportation')">Transportation</div>
          <div onclick="selectBusiness('Warehousing')">Warehousing</div>
          <div onclick="selectBusiness('Organic Farming')">Organic Farming</div>
          <div onclick="selectBusiness('Dairy Farm')">Dairy Farm</div>
          <div onclick="selectBusiness('Poultry')">Poultry</div>
          <div onclick="selectBusiness('Fisheries')">Fisheries</div>
          <div onclick="selectBusiness('Agro Products')">Agro Products</div>
          <div onclick="selectBusiness('Film Production')">Film Production</div>
          <div onclick="selectBusiness('Music Studio')">Music Studio</div>
          <div onclick="selectBusiness('Advertising Agency')">Advertising Agency</div>
          <div onclick="selectBusiness('Animation Studio')">Animation Studio</div>
          <div onclick="selectBusiness('Gaming Studio')">Gaming Studio</div>
          <div onclick="selectBusiness('Real Estate')">Real Estate</div>
          <div onclick="selectBusiness('Property Management')">Property Management</div>
          <div onclick="selectBusiness('Construction')">Construction</div>
          <div onclick="selectBusiness('Interior Design')">Interior Design</div>
          <div onclick="selectBusiness('Architecture')">Architecture</div>
          <div onclick="selectBusiness('EV Business')">EV Business</div>
          <div onclick="selectBusiness('Renewable Energy')">Renewable Energy</div>
          <div onclick="selectBusiness('Recycling')">Recycling</div>
          <div onclick="selectBusiness('Smart Home Solutions')">Smart Home Solutions</div>
          <div onclick="selectBusiness('Drone Services')">Drone Services</div>
          <div onclick="selectBusiness('Other')">Other</div>
        </div>
      </div>
    </div>

    <div class="input-group">
      <label>Display Name</label>
      <input type="text" id="nameInput" value="${user.name || ''}" placeholder="Enter your name">
    </div>

    <div class="input-group">
      <label>Bio</label>
      <textarea id="bioInput" placeholder="Tell us about yourself...">${user.bio || ''}</textarea>
    </div>

    <button type="button" class="btn-save" onclick="saveProfile()">Save Changes</button>
  </div>
</div>

<script>
// Account Toggle Logic
function toggleAccountFields() {
  const accountType = document.getElementById('accountTypeInput').value;
  const roleGroup = document.getElementById('roleGroup');
  const businessGroup = document.getElementById('businessTypeGroup');

  if (accountType === 'business') {
    roleGroup.style.display = 'none';
    businessGroup.style.display = 'block';
  } else {
    roleGroup.style.display = 'block';
    businessGroup.style.display = 'none';
  }
}

// Custom Dropdown Logic
function toggleRoleDropdown() {
  document.getElementById('roleDropdown').classList.toggle('show');
  document.getElementById('businessDropdown').classList.remove('show');
}
function toggleBusinessDropdown() {
  document.getElementById('businessDropdown').classList.toggle('show');
  document.getElementById('roleDropdown').classList.remove('show');
}
function selectRole(val) {
  document.getElementById('roleInput').value = val;
  document.getElementById('roleDropdown').classList.remove('show');
}
function selectBusiness(val) {
  document.getElementById('businessTypeInput').value = val;
  document.getElementById('businessDropdown').classList.remove('show');
}

// Close Dropdowns if clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.custom-dropdown')) {
    document.getElementById('roleDropdown')?.classList.remove('show');
    document.getElementById('businessDropdown')?.classList.remove('show');
  }
});

function previewProfile(event) {
  const file = event.target.files[0];
  if (file) {
    document.getElementById('previewImage').src = URL.createObjectURL(file);
  }
}

async function saveProfile() {
  const btns = document.querySelectorAll('.btn-save, .save-header-btn');
  btns.forEach(btn => btn.innerText = "Saving...");
  
  const nameVal = document.getElementById('nameInput').value;
  const bioVal = document.getElementById('bioInput').value;
  const accountTypeVal = document.getElementById('accountTypeInput').value;
  const roleVal = document.getElementById('roleInput').value;
  const businessTypeVal = document.getElementById('businessTypeInput').value;
  
  try {
    await axios.post('/api/profile/update', {
      name: nameVal,
      bio: bioVal,
      accountType: accountTypeVal,
      role: roleVal,
      businessType: businessTypeVal
    });
    
    window.location.href = "/profile";
  } catch (err) {
    console.error(err);
    alert("Failed to update profile.");
    btns[0].innerText = "Save";
    btns[1].innerText = "Save Changes";
  }
}
</script>

</body>
</html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


/* ==============================================================
   4. API POST ROUTE: SAVE LEARNING PATH
============================================================== */
router.post("/api/profile/learningpath", async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });

    const { skillId, action } = req.body;
    const user = await genz.findById(req.session.userId);

    if (!user.learningPaths) {
      user.learningPaths = [];
    }

    if (action === 'add') {
      if (!user.learningPaths.includes(skillId)) {
        user.learningPaths.push(skillId);
      }
    } else if (action === 'remove') {
      user.learningPaths.pull(skillId);
    }

    await user.save();
    res.json({ success: true });

  } catch (err) {
    console.error("Save Skill Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


/* ==============================================================
   5. GET ANOTHER USER'S PUBLIC PROFILE
============================================================== */
router.get("/profile/:id", async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.session?.userId;

    const profileUser = await genz.findById(targetUserId)
                                  .populate('followers')
                                  .populate('following')
                                  .lean();

    if (!profileUser) return res.status(404).send("User not found.");

    if (currentUserId && currentUserId === targetUserId) {
      return res.redirect("/profile");
    }

    const userPosts = await Post.find({ userId: targetUserId })
                                .sort({ createdAt: -1 })
                                .lean();

    let isFollowing = false;
    if (currentUserId && profileUser.followers) {
      isFollowing = profileUser.followers.some(
        follower => follower._id.toString() === currentUserId.toString()
      );
    }

    const html = renderPublicProfile(profileUser, isFollowing, userPosts);
    res.send(html);

  } catch (error) {
    console.error("Error loading public profile:", error);
    res.status(500).send("Server Error");
  }
});


/* ==============================================================
   6. API POST ROUTE: UPDATE PROFILE DATA
============================================================== */
router.post("/api/profile/update", async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });

    const { name, bio, accountType, role, businessType } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (accountType !== undefined) updateData.accountType = accountType;

    if (accountType === 'business') {
      updateData.businessType = businessType;
      updateData.role = null; 
    } else {
      updateData.role = role;
      updateData.businessType = null;
    }

    await genz.findByIdAndUpdate(req.session.userId, updateData);
    res.json({ success: true });

  } catch (err) {
    console.error("Profile Update Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
