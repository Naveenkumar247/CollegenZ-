console.log("🔥 SCRIPT LOADED");


/* ================= INIT ================= */
async function initApp() {
  await loadUser();  // 1. Gets the 'following' list from /api/me
  await loadPosts(); // 2. Uses that list to draw "Following" or "Follow"
}

initApp();


const header = document.getElementById('mainHeader');
const filterBar = document.getElementById('filterBar');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    // 1. Squish the green header
    header.classList.add('shrink');
    // 2. Slide the filter bar down from behind the header
    filterBar.classList.add('show-bar'); 
  } else {
    // 1. Expand the green header
    header.classList.remove('shrink');
    // 2. Slide the filter bar back up to hide it
    filterBar.classList.remove('show-bar'); 
  }
});


/* ================= FILTER ================= */
document.querySelectorAll(".filter-btn").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll(".filter-btn").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    // Assuming loadPosts is defined elsewhere in your code
    if (typeof loadPosts === 'function') {
        loadPosts(b.dataset.type);
    }
  };
});


/* ================= GLOBAL USER ================= */
let CURRENT_USER = null;
let IS_LOGGED_IN = false;
let FEATURED_DATA = [];

function openStory(index){

const story = FEATURED_DATA[index];

const img = Array.isArray(story.imageurl)
? story.imageurl[0]
: story.imageurl;

document.getElementById("storyImage").src = img;

document.getElementById("storyUsername").textContent =
story.userId?.username || "User";

document.getElementById("storyUserPic").src =
story.picture || "/uploads/profilepic.jpg";

document.getElementById("storyViewer").style.display = "flex";
}

function closeStory(){
document.getElementById("storyViewer").style.display = "none";
}

/* ================= LOAD USER ================= */
async function loadUser() {
  try {
    const res = await fetch("/api/me");
    const data = await res.json();

    IS_LOGGED_IN = data.isLoggedIn;
    CURRENT_USER = data.user || null;

    if (CURRENT_USER) {
      document.getElementById("navUsername").textContent = CURRENT_USER.username || "";
      document.getElementById("navEmail").textContent = CURRENT_USER.email || "";
      document.getElementById("navProfilePic").src =
        CURRENT_USER.picture || "/uploads/profilepic.jpg";
    }
  } catch {
    console.log("No user");
  }
}

async function loadPosts(filter="all"){
try{

const postRes=await fetch("/api/posts");
const featuredRes=await fetch("/api/featured");

const {posts=[]}=await postRes.json();
const {featured=[]}=await featuredRes.json();
FEATURED_DATA = featured;

const postContainer=document.getElementById("postContainer");
const featuredSlider=document.getElementById("featuredSlider");

featuredSlider.innerHTML="";
postContainer.innerHTML="";

/* FEATURED */
featured.forEach((p, i) => {

  // 1. Extract the data safely
  const img = Array.isArray(p.imageurl) ? p.imageurl[0] : (p.imageurl || '');
  const userPic = p.userId?.picture || p.picture || "/uploads/profilepic.jpg";
  const userName = p.userId?.username || "User";
  
  // Grab the text/data of the post (fallback to "Featured" if empty)
  const postData = p.data || p.caption || "Featured Story"; 

  // 2. Build the new layout
  featuredSlider.innerHTML += `
  <div class="story-thumb-card" onclick="openStory(${i})">
    <img src="${img}" class="story-thumb-bg" alt="Story">

    <div class="story-thumb-top">
      <img src="${userPic}" class="story-thumb-avatar" alt="User">
      <span class="story-thumb-username">${userName}</span>
    </div>

    <div class="story-thumb-bottom">
      <span class="story-thumb-data">${postData}</span>
    </div>
  </div>
  `;

});




/* POSTS */
posts.forEach((p,index)=>{

if(filter!=="all"&&p.postType!==filter)return;

const images=Array.isArray(p.imageurl)?p.imageurl:[p.imageurl];

/* indicators */
let indicators="";
images.forEach((_,i)=>{
indicators+=`
<button type="button" data-bs-target="#carousel-${index}"
data-bs-slide-to="${i}" ${i===0?"class='active'":""}></button>`;
});

/* slides */
let slides="";
images.forEach((img,i)=>{
slides+=`
<div class="carousel-item ${i===0?"active":""}">
<div class="position-relative">

${p.postType==="event"?`<div class="event-badge">Event</div>`:
p.postType==="hiring"?`<div class="hiring-badge">Hiring</div>`:""}

<img src="${img}" class="d-block w-100 ig-image">

${images.length>1?`
<div class="slide-count">${i+1}/${images.length}</div>`:""}

</div>
</div>`;
});

/* CAPTION */

let caption="";

if(p.postType==="general"){

const short=p.data?.slice(0,120)||"";
const rest=p.data?.slice(120)||"";

caption=`
<span>${short}</span>
${rest?`
<span id="more-${p._id}" style="display:none;">${rest}</span>
<span class="see-more" onclick="toggleCaption('${p._id}')">… more</span>
`:""}
`;
}

/* EVENT */
else if(p.postType==="event"){

caption=`
<div class="details-box">

<div class="row-${p._id}" style="font-weight:600;text-align:center">
${p.data||"-"}
</div>

<table class="table details-table row-${p._id}" style="display:none">
<tbody>

<tr><th>Date</th><td>${p.event_date||"-"}</td></tr>
<tr><th>Time</th><td>${p.event_time||"-"}</td></tr>
<tr><th>Mode</th><td>${p.event_mode||"-"}</td></tr>
<tr><th>Location</th><td>${p.event_location||"-"}</td></tr>
<tr><th>Contact</th><td>${p.event_contact||"-"}</td></tr>

<tr>
<th>Description</th>
<td>${p.event_description||"-"}</td>
</tr>

<tr>
<th>Register</th>
<td>
  ${
    p.event_link && p.event_link.trim() !== ""
      ? `<a href="${
          p.event_link.startsWith("http")
            ? p.event_link
            : "https://" + p.event_link
        }" target="_blank">Open Link</a>`
      : "No Link Available"
  }
</td>
</tr>

</tbody>
</table>

<span class="see-more" onclick="toggleDetails('${p._id}')">View details</span>

</div>
`;
}

/* HIRING */
else{

caption=`
<div class="details-box">

<div class="row-${p._id}" style="font-weight:600;text-align:center">
${p.data||"-"}
</div>

<table class="table details-table row-${p._id}" style="display:none">
<tbody>

<tr><th>Location</th><td>${p.job_location||"-"}</td></tr>
<tr><th>Mode</th><td>${p.job_mode||"-"}</td></tr>
<tr><th>Contact</th><td>${p.job_contact||"-"}</td></tr>

<tr>
<th>Description</th>
<td>${p.job_description||"-"}</td>
</tr>

<tr><th>Deadline</th><td>${p.job_deadline||"-"}</td></tr>

<tr>
<th>Apply</th>
<td>
<a href="${p.job_link ? (p.job_link.startsWith("http") ? p.job_link : "https://" + p.job_link) : "#"}" target="_blank">
Apply
</a>
</td>
</tr>

</tbody>
</table>

<span class="see-more" onclick="toggleDetails('${p._id}')">View details</span>

</div>
`;
}

/* FINAL CARD */
postContainer.insertAdjacentHTML("beforeend",`

<div class="ig-post">

<div class="ig-header">

<div class="ig-user">

<img src="${p.picture || "/uploads/profilepic.jpg"}" class="ig-avatar">

<strong
class="open-profile"
data-user="${p.userId?._id}"
style="cursor:pointer;color:black;margin-left:8px;">
${p.userId?.username || "User"}
</strong>

${CURRENT_USER && CURRENT_USER._id !== p.userId?._id ? `
  <button class="follow-btn" 
          onclick="toggleFollow(this, '${p.userId?._id}')"
          style="background:none; border:none; font-weight:600; cursor:pointer; font-size:14px; padding:4px 8px; color: ${CURRENT_USER.following && CURRENT_USER.following.includes(p.userId?._id) ? '#888' : '#0d6efd'};">
    ${CURRENT_USER.following && CURRENT_USER.following.includes(p.userId?._id) ? 'Following' : 'Follow'}
  </button>
` : ""}



</div>

<div class="post-menu">
<i class="bi bi-three-dots" data-id="${p._id}"></i>
</div>

</div>

<div id="carousel-${index}" class="carousel slide" data-bs-touch="true">

${images.length > 1 ? `
<div class="carousel-indicators">
${indicators}
</div>
` : ""}

<div class="carousel-inner">
${slides}
</div>

</div>

<div class="ig-actions">

<div class="ig-left">

<span class="like-btn" data-id="${p._id}">
<i class="bi bi-heart"></i>
<small id="like-${p._id}">${p.likes || 0}</small>
</span>

<span class="share-btn" data-id="${p._id}">
<i class="bi bi-send"></i>
<small id="share-${p._id}">${p.shares || 0}</small>
</span>

</div>

<span class="save-btn" data-id="${p._id}">
<i class="bi bi-bookmark"></i>
<small id="save-${p._id}">${p.saves || 0}</small>
</span>

</div>

<div class="ig-caption">
${caption}
</div>

</div>

`);

}); // end posts loop


/* ================= ENABLE SWIPE AFTER POSTS RENDER ================= */
document.querySelectorAll(".carousel").forEach(c => {

if (!c.dataset.loaded) {

new bootstrap.Carousel(c,{
interval:false,
touch:true
});

c.dataset.loaded="true";

}

});

}catch(e){
console.error("POST LOAD ERROR:", e);
}

}

   

/* ================= LIKE / SAVE / SHARE ================= */
document.addEventListener("click", async e => {

const like = e.target.closest(".like-btn");
const save = e.target.closest(".save-btn");
const share = e.target.closest(".share-btn");

/* ================= LIKE ================= */
if(like){

// prevent spam clicking
if(like.dataset.loading) return;
like.dataset.loading = "true";

const id = like.dataset.id;
const icon = like.querySelector("i");
const countEl = document.getElementById("like-"+id);

/* instant UI update */
icon.classList.toggle("bi-heart");
icon.classList.toggle("bi-heart-fill");
icon.classList.toggle("text-success");

countEl.textContent =
  Number(countEl.textContent) +
  (icon.classList.contains("bi-heart-fill") ? 1 : -1);

try{
await fetch(`/posts/${id}/like`,{
  method:"POST",
  headers:{ "Content-Type":"application/json" },
  body:JSON.stringify({ userId: CURRENT_USER?._id })
});
}catch{
console.log("Like sync failed");
}

setTimeout(()=> like.dataset.loading="",300);
}


/* ================= SAVE ================= */
if(save){

if(save.dataset.loading) return;
save.dataset.loading="true";

const id = save.dataset.id;
const icon = save.querySelector("i");
const countEl = document.getElementById("save-"+id);

icon.classList.toggle("bi-bookmark");
icon.classList.toggle("bi-bookmark-fill");
icon.classList.toggle("text-success");

countEl.textContent =
  Number(countEl.textContent) +
  (icon.classList.contains("bi-bookmark-fill") ? 1 : -1);

await fetch(`/posts/${id}/save`,{
  method:"POST",
  headers:{ "Content-Type":"application/json" },
  body:JSON.stringify({ userId: CURRENT_USER?._id })
});

setTimeout(()=> save.dataset.loading="",300);
}


/* ================= SHARE ================= */
if(share){

const id = share.dataset.id;

try{

const r = await fetch(`/posts/${id}/share`,{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({ userId: CURRENT_USER?._id })
});

const d = await r.json();

/* update share count */
document.getElementById("share-"+id).textContent = d.shares;

/* share URL */
const url = window.location.origin + "/share/" + id;

/* open share dialog */
if(navigator.share){

navigator.share({
title:"CollegenZ",
text:"Check out this post on CollegenZ 🌱",
url:url
}).catch(()=>{});

} else {
  // ✅ FIX: Fallback to opening WhatsApp with the link
  window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank");
  
  // OR, if you just want to redirect them to the share page itself:
  // window.location.href = url; 
}


}catch(err){
console.log("Share failed");
}

}

});


/* ================= SIDEBAR ================= */
const hamburger=document.getElementById("hamburger");
const slideNav=document.getElementById("slideNav");
const overlay=document.getElementById("overlay");

hamburger?.addEventListener("click",()=>{
slideNav.classList.add("active");
overlay.classList.add("active");
});

overlay?.addEventListener("click",()=>{
slideNav.classList.remove("active");
overlay.classList.remove("active");
});

/* ================= INIT ================= */
loadUser();
loadPosts();

function toggleDetails(id){
document.querySelectorAll(".row-"+id).forEach(r=>{
r.style.display="table-row";
});

const btn=document.querySelector(`[onclick="toggleDetails('${id}')"]`);
if(btn) btn.remove();
}

function toggleCaption(id){

const more=document.getElementById("more-"+id);
if(!more) return;

more.style.display="inline";

const btn=document.querySelector(`[onclick="toggleCaption('${id}')"]`);
if(btn) btn.remove();

}
/* ================= MINI PROFILE POPUP ================= */
document.addEventListener("click", async e => {
  const user = e.target.closest(".open-profile");
  if(!user) return;

  const userId = user.dataset.user;

  document.getElementById("profilePopup").style.display="flex";
  document.getElementById("profileData").innerHTML="Loading...";

  try {
    const res = await fetch(`/api/user/${userId}`);
    const u = await res.json();

    // Check if it's our own profile so we don't try to add ourselves
    const isMe = CURRENT_USER && CURRENT_USER._id === u._id;

    document.getElementById("profileData").innerHTML=`
      <img src="${u.picture||'/uploads/profilepic.jpg'}"
           style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #228B22;"><br>

      <strong>${u.username}</strong><br>
      <small>${u.email||""}</small><br><br>

      <p>${u.bio||"No bio"}</p>

      ${!isMe ? `
        <button class="btn btn-success btn-sm" onclick="sendFriendRequest('${u._id}', this)">
          Add Friend
        </button>
      ` : `<span class="badge bg-secondary">This is you</span>`}
    `;
  } catch(err) {
    document.getElementById("profileData").innerHTML="Failed to load";
  }
});

/* CLOSE POPUP */
document.querySelector(".close-popup").onclick=()=>{
  document.getElementById("profilePopup").style.display="none";
};


/* ================= ADVANCED FEATURED STORY VIEWER ================= */
let CURRENT_STORY = 0;
let CURRENT_SLIDE = 0;
let storyTimer;

function openStory(index) {
  CURRENT_STORY = index;
  CURRENT_SLIDE = 0;
  document.getElementById("storyViewer").style.display = "flex";
  showStory();
}

function showStory() {
  clearTimeout(storyTimer);
  const story = FEATURED_DATA[CURRENT_STORY];
  if (!story) { closeStory(); return; }

  const images = Array.isArray(story.imageurl) ? story.imageurl : [story.imageurl];
  
  // 1. Update UI Content
  document.getElementById("storyImage").src = images[CURRENT_SLIDE];
  document.getElementById("storyUsername").textContent = story.userId?.username || "User";
  document.getElementById("storyUserPic").src = story.picture || "/uploads/profilepic.jpg";
  document.getElementById("storyLikes").textContent = story.likes || 0;
  document.getElementById("storyShares").textContent = story.shares || 0;
  
  // NEW: Inject the text data
  document.getElementById("storyDataText").textContent = story.data || story.caption || "";

  // ... (rest of your progress bar code stays exactly the same)


  // 2. Render Progress Bars
  const progressContainer = document.getElementById("storyProgressContainer");
  progressContainer.innerHTML = "";
  
  images.forEach((_, i) => {
    const bar = document.createElement("div");
    bar.className = "story-progress-bar";
    const fill = document.createElement("div");
    fill.className = "story-progress-fill";
    
    if (i < CURRENT_SLIDE) {
      fill.style.width = "100%"; // Passed slides are fully white
    } else if (i === CURRENT_SLIDE) {
      fill.style.width = "0%";
      // Slight delay ensures CSS transition fires properly
      setTimeout(() => fill.style.width = "100%", 50); 
    }
    
    bar.appendChild(fill);
    progressContainer.appendChild(bar);
  });

  // 3. Set Auto-Advance Timer (5 seconds)
  storyTimer = setTimeout(() => nextSlide(), 5000);
}

function nextSlide() {
  const story = FEATURED_DATA[CURRENT_STORY];
  const images = Array.isArray(story.imageurl) ? story.imageurl : [story.imageurl];
  
  // If there are more images in THIS story, go to next image
  if (CURRENT_SLIDE < images.length - 1) {
    CURRENT_SLIDE++;
    showStory();
  } 
  // If no more images, move to the NEXT user's story
  else if (CURRENT_STORY < FEATURED_DATA.length - 1) {
    CURRENT_STORY++;
    CURRENT_SLIDE = 0;
    showStory();
  } 
  // If it's the absolute end of all stories, close the viewer
  else {
    closeStory();
  }
}

function prevSlide() {
  // Go back an image in the current story
  if (CURRENT_SLIDE > 0) {
    CURRENT_SLIDE--;
    showStory();
  } 
  // Go back to the PREVIOUS user's story
  else if (CURRENT_STORY > 0) {
    CURRENT_STORY--;
    const prevStory = FEATURED_DATA[CURRENT_STORY];
    const prevImages = Array.isArray(prevStory.imageurl) ? prevStory.imageurl : [prevStory.imageurl];
    CURRENT_SLIDE = prevImages.length - 1; // Start at their last image
    showStory();
  }
}

function closeStory() {
  clearTimeout(storyTimer);
  document.getElementById("storyViewer").style.display = "none";
}


/* FEATURED */
featured.forEach((p, i) => {

  // 1. Extract the data safely from the database
  const img = Array.isArray(p.imageurl) ? p.imageurl[0] : (p.imageurl || '');
  const userPic = p.userId?.picture || p.picture || "/uploads/profilepic.jpg";
  const username = p.userId?.username || "User"; 

  // 2. Build the split layout (Avatar on top, Name on bottom)
  featuredSlider.innerHTML += `
  <div class="story-thumb-card" onclick="openStory(${i})">
    <img src="${img}" class="story-thumb-bg" alt="Story">

    <div class="story-thumb-top">
      <img src="${userPic}" class="story-thumb-avatar" alt="User">
    </div>

    <div class="story-thumb-bottom">
      <span class="story-thumb-name">${username}</span>
    </div>
  </div>
  `;

});


/* ================= INSTANT FOLLOW BUTTON (Optimistic UI) ================= */
async function toggleFollow(btn, targetId) {
  if (btn.disabled) return;
  btn.disabled = true; // Prevent double-clicking

  const originalText = btn.textContent.trim();
  const isCurrentlyFollowing = originalText === "Following";

  // 1. INSTANTLY UPDATE THE UI (Don't wait for the database!)
  if (isCurrentlyFollowing) {
    btn.textContent = "Follow";
    btn.style.color = "#0d6efd"; // Blue
  } else {
    btn.textContent = "Following";
    btn.style.color = "#888"; // Gray
  }

  try {
    // 2. SEND TO MONGODB IN THE BACKGROUND
    const res = await fetch(`/follow/${targetId}`, { 
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Database failed to save");
    }

    // If it succeeds, we do nothing! The UI is already updated.

  } catch (err) {
    // 3. REVERT THE UI ONLY IF MONGODB FAILS
    console.error("Follow error:", err);
    btn.textContent = originalText;
    btn.style.color = isCurrentlyFollowing ? "#888" : "#0d6efd";
  } finally {
    btn.disabled = false;
  }
}


/* ================= SEND FRIEND REQUEST ================= */
async function sendFriendRequest(targetId, btn) {
  // Prevent double-clicking
  if (btn.disabled) return;
  btn.disabled = true;

  const originalText = btn.textContent;
  btn.textContent = "Sending...";

  try {
    // Hits the new friends.js router we created!
    const res = await fetch(`/friend/request/${targetId}`, { 
      method: "POST" 
    });
    const data = await res.json();

    if (res.ok) {
      // Success! Change button appearance
      btn.textContent = "Request Sent";
      btn.classList.replace("btn-success", "btn-secondary"); // Turns it gray
    } else {
      // Backend rejected it (e.g., "Already friends", "Request already sent")
      btn.textContent = data.message; // Show the backend error on the button
      btn.classList.replace("btn-success", "btn-danger"); // Turns it red
      
      // Reset button after 2 seconds so they can try again if it was a glitch
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.replace("btn-danger", "btn-success");
        btn.disabled = false;
      }, 2500);
    }
  } catch (err) {
    console.error("Friend request error:", err);
    btn.textContent = "Error";
    btn.disabled = false;
  }
}
