console.log("🔥 SCRIPT LOADED");

/* ================= HEADER COLLAPSE ================= */
let lastScroll = 0;

window.addEventListener("scroll", () => {
  const topHeader = document.getElementById("topHeader");
  if (!topHeader) return;

  const current = window.scrollY;

  if (current > 80 && current > lastScroll) {
    topHeader.style.height = "0";
    topHeader.style.overflow = "hidden";
  }

  if (current < 40) {
    topHeader.style.height = "110px";
  }

  lastScroll = current;
});

/* ================= GLOBAL USER ================= */
let CURRENT_USER = null;
let IS_LOGGED_IN = false;

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

/* ================= LOAD POSTS ================= */
async function loadPosts(filter = "all") {
  try {
    const postRes = await fetch("/api/posts");
    const featuredRes = await fetch("/api/featured");

    const postData = await postRes.json();
    const featuredData = await featuredRes.json();

    const posts = postData.posts || [];
    const featured = featuredData.featured || [];

    const featuredSlider = document.getElementById("featuredSlider");
    const postContainer = document.getElementById("postContainer");

    featuredSlider.innerHTML = "";
    postContainer.innerHTML = "";

    /* FEATURED */
    featured.forEach(p => {
      const img = Array.isArray(p.imageurl) ? p.imageurl[0] : p.imageurl;
      featuredSlider.innerHTML += `
        <div class="featured-card">
          <img src="${img}">
          <p>${p.username || "User"}</p>
        </div>`;
    });

    /* POSTS */
    posts.forEach((p, index) => {

      if (filter !== "all" && p.postType !== filter) return;

      const images = Array.isArray(p.imageurl) ? p.imageurl : [p.imageurl];

      let slides = "";
      images.forEach((img,i)=>{
        slides += `
        <div class="carousel-item ${i===0?"active":""}">
          <img src="${img}" class="d-block w-100">
        </div>`;
      });

      postContainer.innerHTML += `

<div class="card mb-3 p-3" style="max-width:700px;margin:auto;border-radius:15px">

<div class="d-flex align-items-center mb-2">
<img src="${p.picture||"/uploads/profilepic.jpg"}" class="postprofile-pic">
<div class="ms-2">
<strong>${p.username||p.userEmail}</strong>
<p>${p.college||""}</p>
</div>
</div>

<div class="my-3">
<div class="carousel slide">
<div class="carousel-inner">${slides}</div>
</div>
</div>

<p>${p.data||""}</p>

<div class="d-flex justify-content-center gap-4">

<button class="btn btn-link like-btn" data-id="${p._id}">
<i class="bi bi-heart"></i>
</button>
<span id="like-count-${p._id}">${p.likes||0}</span>

<button class="btn btn-link save-btn" data-id="${p._id}">
<i class="bi bi-bookmark"></i>
</button>
<span id="save-count-${p._id}">${p.saves||0}</span>

<button class="btn btn-link share-btn" data-id="${p._id}">
<i class="bi bi-share"></i>
</button>
<span id="share-count-${p._id}">${p.shares||0}</span>

</div>

</div>`;
    });

  } catch(err){
    console.error("POST LOAD ERROR",err);
  }
}

/* ================= LIKE / SAVE / SHARE ================= */
document.addEventListener("click", async e => {

const like=e.target.closest(".like-btn");
const save=e.target.closest(".save-btn");
const share=e.target.closest(".share-btn");

/* LIKE */
if(like){
const id=like.dataset.id;
const r=await fetch(`/posts/${id}/like`,{
  method:"POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: CURRENT_USER?._id })
});
const d=await r.json();
if(d.error)return alert("Login first");
document.getElementById("like-count-"+id).textContent=d.likes;
like.querySelector("i").className=d.liked?"bi bi-heart-fill":"bi bi-heart";
}

/* SAVE */
if(save){
const id=save.dataset.id;
const r=await fetch(`/posts/${id}/save`,{
  method:"POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: CURRENT_USER?._id })
});
const d=await r.json();
if(d.error)return alert("Login first");
document.getElementById("save-count-"+id).textContent=d.saves;
save.querySelector("i").className=d.saved?"bi bi-bookmark-fill":"bi bi-bookmark";
}

/* SHARE */
if(share){
const id=share.dataset.id;
const r=await fetch(`/posts/${id}/share`,{
  method:"POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: CURRENT_USER?._id })
});
const d=await r.json();
if(d.error)return alert("Login first");
document.getElementById("share-count-"+id).textContent=d.shares;
}

});

/* ================= FILTER ================= */
document.querySelectorAll(".filter-btn").forEach(b=>{
b.onclick=()=>{
document.querySelectorAll(".filter-btn").forEach(x=>x.classList.remove("active"));
b.classList.add("active");
loadPosts(b.dataset.type);
};
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
