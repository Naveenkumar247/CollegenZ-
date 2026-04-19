// routes/profileview.js

module.exports = function renderPublicProfile(profileUser, isFollowing, userPosts) {
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
  
  /* BASE MOBILE STYLES */
  .app-container { width: 100%; max-width: 400px; background: var(--background-color); min-height: 100vh; position: relative; overflow-x: hidden; box-shadow: 0 0 15px rgba(0,0,0,0.05); transition: all 0.3s ease; }
  .cover-photo { height: 130px; background-color: var(--primary-color); position: relative; transition: height 0.3s ease; }
  .header-actions { display: flex; justify-content: space-between; padding: 15px; }
  .back-btn { background: transparent; border: none; color: var(--background-color); font-size: 1.4rem; cursor: pointer; text-decoration: none; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;}
  .account-badge { border: 1px solid var(--background-color); color: var(--background-color); padding: 4px 12px; border-radius: 15px; font-size: 0.8rem; font-weight: 600; text-transform: capitalize; }
  .profile-header { padding: 0 20px; position: relative; margin-top: -40px; transition: margin 0.3s ease; }
  .profile-img-container { width: 85px; height: 85px; border-radius: 50%; background: var(--background-color); border: 3px solid var(--background-color); overflow: hidden; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s ease; }
  .profile-img { width: 100%; height: 100%; object-fit: cover; }
  .info-row { display: flex; flex-direction: column; gap: 15px; }
  .user-details h2 { font-size: 1.3rem; color: var(--text-main); margin-bottom: 4px; transition: font-size 0.3s; }
  .user-details p { font-size: 0.95rem; color: var(--text-muted); }
  
  /* Action Buttons (Follow / Message) */
  .profile-actions { display: flex; gap: 10px; width: 100%; }
  .action-btn { flex: 1; border: 1px solid var(--border-color); background: var(--background-color); color: var(--text-main); padding: 8px 0; border-radius: 20px; font-size: 0.9rem; font-weight: 600; cursor: pointer; text-align: center; transition: all 0.2s; }
  .btn-primary { background: var(--primary-color); color: white; border-color: var(--primary-color); }
  .btn-primary:active { opacity: 0.8; }
  
  .stats-row { display: flex; justify-content: space-around; padding: 25px 0 15px 0; text-align: center; }
  .stat-item { cursor: pointer; transition: opacity 0.2s; }
  .stat-item:active { opacity: 0.6; }
  .stat-item h3 { font-size: 1.2rem; color: var(--text-main); margin-bottom: 4px; }
  .stat-item p { font-size: 0.85rem; color: var(--text-muted); }
  
  /* Tabs & Content Styles */
  .tabs { display: flex; justify-content: space-around; padding: 12px 0; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
  .tab-icon { font-size: 1.3rem; color: var(--text-muted); cursor: pointer; transition: color 0.2s; }
  .tab-icon.active { color: var(--primary-color); }
  .tab-content { display: none; padding: 1px 0 15px 0; animation: fadeIn 0.3s ease; }
  .tab-content.active { display: block; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

  /* Grid (Posts) */
  .grid-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
  .grid-item { aspect-ratio: 1; background-color: var(--border-color); overflow: hidden; }
  .grid-item img { width: 100%; height: 100%; object-fit: cover; }
  .empty-state { grid-column: span 3; text-align: center; padding: 40px 20px; color: var(--text-muted); }

  /* Learning Skills */
  .skills-container { padding: 15px; display: flex; flex-wrap: wrap; gap: 10px; }
  .skill-chip { border: 1px solid var(--primary-color); padding: 10px 16px; border-radius: 20px; font-size: 0.85rem; background: var(--primary-color); color: white; display: flex; flex-direction: column; align-items: center; width: calc(50% - 5px); opacity: 0.9; }
  .skill-name { font-weight: 600; margin-bottom: 2px; text-align: center; text-transform: uppercase; }

  /* Stats / Era */
  .stats-display { text-align: center; padding: 30px 20px; }
  .stats-circle { width: 120px; height: 120px; border-radius: 50%; border: 6px solid var(--primary-color); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2rem; font-weight: bold; color: var(--primary-color); }
  .era-building { text-align: center; padding: 40px 20px; color: var(--text-muted); }
  .era-building i { font-size: 3rem; color: #f39c12; margin-bottom: 15px; }

  /* RESPONSIVE DESKTOP & TABLET STYLES */
  @media (min-width: 768px) {
    body { padding: 40px 0; }
    .app-container { max-width: 700px; border-radius: 12px; min-height: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .cover-photo { height: 180px; border-radius: 12px 12px 0 0; }
    .profile-header { padding: 0 40px; margin-top: -60px; }
    .profile-img-container { width: 120px; height: 120px; border-width: 4px; }
    .user-details h2 { font-size: 1.8rem; }
    .user-details p { font-size: 1.1rem; }
    .info-row { flex-direction: row; justify-content: space-between; align-items: flex-end; }
    .profile-actions { width: auto; gap: 15px; }
    .action-btn { padding: 10px 25px; }
    .stats-row { justify-content: center; gap: 60px; padding: 30px 0 20px 0; }
    .grid-container { gap: 4px; }
    .skill-chip { width: calc(33.333% - 10px); }
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
        <p>${profileUser.bio || "No bio available"}</p>
      </div>
      
      <div class="profile-actions">
        <button id="followBtn" class="action-btn ${isFollowing ? '' : 'btn-primary'}" onclick="toggleFollow('${profileUser._id}')">
          ${isFollowing ? 'Following' : 'Follow'}
        </button>
        <button class="action-btn" onclick="window.location.href='/chat/${profileUser._id}'">Message</button>
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

  <div class="tabs">
    <i class="fa-solid fa-table-cells tab-icon active" onclick="switchTab('posts', this)"></i> 
    <i class="fa-solid fa-brain tab-icon" onclick="switchTab('learning', this)"></i>             
    <i class="fa-solid fa-arrow-trend-up tab-icon" onclick="switchTab('stats', this)"></i>    
    <i class="fa-solid fa-coins tab-icon" onclick="switchTab('era', this)"></i>             
  </div>

  <div id="tab-posts" class="tab-content active">
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

  <div id="tab-learning" class="tab-content">
    <div class="skills-container" id="skillsList">
      ${profileUser.learningPaths && profileUser.learningPaths.length > 0 
        ? profileUser.learningPaths.map(skillId => `
            <div class="skill-chip">
              <span class="skill-name">${skillId.replace('-', ' ')}</span>
            </div>
          `).join('')
        : '<div class="empty-state">No learning paths added.</div>'
      }
    </div>
  </div>

  <div id="tab-stats" class="tab-content">
    <div class="stats-display">
      ${(profileUser.points && profileUser.points > 0) 
        ? '<div class="stats-circle">' + profileUser.points + '</div><h3>Active Learner</h3>' 
        : '<div class="empty-state"><i class="fa-solid fa-chart-line" style="font-size:3rem; margin-bottom:15px;"></i><br>Not started yet.</div>'
      }
    </div>
  </div>

  <div id="tab-era" class="tab-content">
    <div class="era-building">
      <i class="fa-solid fa-person-digging"></i>
      <h3>CollegenZ Era</h3>
      <p style="margin-top:10px;">The internal digital currency system is currently being built.</p>
    </div>
  </div>

</div>

<script>
/* TAB SWITCHING LOGIC */
function switchTab(tabId, element) {
  document.querySelectorAll('.tab-icon').forEach(icon => icon.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  element.classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
}

/* FOLLOW FUNCTIONALITY */
async function toggleFollow(userId) {
  try {
    const btn = document.getElementById('followBtn');
    await axios.post('/follow/' + userId); 
    
    if (btn.classList.contains('btn-primary')) {
      btn.classList.remove('btn-primary');
      btn.innerText = 'Following';
    } else {
      btn.classList.add('btn-primary');
      btn.innerText = 'Follow';
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
};
