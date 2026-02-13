console.log("🔥 SCRIPT LOADED");

/* ======================================
   HEADER COLLAPSE
====================================== */
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

/* ======================================
   GLOBAL USER STATE
====================================== */
let CURRENT_USER = null;
let IS_LOGGED_IN = false;

/* ======================================
   LOAD USER
====================================== */
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
  } catch (err) {
    console.error("User load failed");
  }
}

/* ======================================
   LOAD POSTS
====================================== */
async function loadPosts(filter = "all") {
  try {
    const [postRes, featuredRes] = await Promise.all([
      fetch("/api/posts"),
      fetch("/api/featured")
    ]);

    const postData = await postRes.json();
    const featuredData = await featuredRes.json();

    const posts = postData.posts || [];
    const featured = featuredData.featured || [];

    const featuredSlider = document.getElementById("featuredSlider");
    const postContainer = document.getElementById("postContainer");

    featuredSlider.innerHTML = "";
    postContainer.innerHTML = "";

    // ==========================
    // ⭐ FEATURED SLIDER
    // ==========================
    featured.forEach(p => {

      const images = Array.isArray(p.imageurl) ? p.imageurl : [p.imageurl];

      featuredSlider.insertAdjacentHTML("beforeend", `
        <div class="featured-card">
          <img src="${images[0]}">
          <strong>${p.username}</strong>
        </div>
      `);
    });

    // ==========================
    // 📰 NORMAL POSTS
    // ==========================
    posts.forEach((p, index) => {

      if (filter !== "all" && p.postType !== filter) return;

      const images = Array.isArray(p.imageurl) ? p.imageurl : [p.imageurl];

      const carouselItems = images.map((img, i) => `
        <div class="carousel-item ${i === 0 ? "active" : ""}">
          <img src="${img}" class="d-block w-100">
        </div>
      `).join("");

      postContainer.insertAdjacentHTML("beforeend", `
        <div class="card mb-3 p-3" style="max-width:700px;margin:auto">

          <strong>${p.username}</strong>

          <div class="my-3">
            <div class="carousel slide">
              <div class="carousel-inner">${carouselItems}</div>
            </div>
          </div>

          <p>${p.data}</p>

        </div>
      `);
    });

  } catch (err) {
    console.error("Load failed", err);
  }
}

/* ======================================
   LIKE / SAVE / SHARE (FIXED)
====================================== */
document.addEventListener("click", async e => {

const like=e.target.closest(".like-btn");
const save=e.target.closest(".save-btn");
const share=e.target.closest(".share-btn");

/* LIKE */
if(like){
const id=like.dataset.id;
const r=await fetch(`/posts/${id}/like`,{method:"POST"});
const d=await r.json();
if(d.error)return alert("Login first");
document.getElementById("like-count-"+id).textContent=d.likes;
}

/* SAVE */
if(save){
const id=save.dataset.id;
const r=await fetch(`/posts/${id}/save`,{method:"POST"});
const d=await r.json();
if(d.error)return alert("Login first");
document.getElementById("save-count-"+id).textContent=d.saves;
}

/* SHARE */
if(share){
const id=share.dataset.id;
const r=await fetch(`/posts/${id}/share`,{method:"POST"});
const d=await r.json();
if(d.error)return alert("Login first");
document.getElementById("share-count-"+id).textContent=d.shares;
}

});

/* ======================================
   FILTERS
====================================== */
document.querySelectorAll(".filter-btn").forEach(b=>{
b.onclick=()=>{
document.querySelectorAll(".filter-btn").forEach(x=>x.classList.remove("active"));
b.classList.add("active");
loadPosts(b.dataset.type);
};
});

/* ======================================
   SIDEBAR
====================================== */
const hamburger=document.getElementById("hamburger");
const slideNav=document.getElementById("slideNav");
const overlay=document.getElementById("overlay");

hamburger.onclick=()=>{
slideNav.classList.add("active");
overlay.classList.add("active");
};

overlay.onclick=()=>{
slideNav.classList.remove("active");
overlay.classList.remove("active");
};

/* ======================================
   INIT
====================================== */
document.addEventListener("click", async (e)=>{

/* LIKE */
const like = e.target.closest(".like-btn");
if(like){
const id = like.dataset.id;

const res = await fetch(`/posts/${id}/like`,{method:"POST"});
const d = await res.json();

if(d.error) return alert("Login required");

document.getElementById(`like-count-${id}`).textContent = d.likes;
like.querySelector("i").className = d.liked?"bi bi-heart-fill":"bi bi-heart";
}

/* SAVE */
const save = e.target.closest(".save-btn");
if(save){
const id = save.dataset.id;

const res = await fetch(`/posts/${id}/save`,{method:"POST"});
const d = await res.json();

if(d.error) return alert("Login required");

document.getElementById(`save-count-${id}`).textContent = d.saves;
save.querySelector("i").className = d.saved?"bi bi-bookmark-fill":"bi bi-bookmark";
}

/* SHARE */
const share = e.target.closest(".share-btn");
if(share){
const id = share.dataset.id;

const res = await fetch(`/posts/${id}/share`,{method:"POST"});
const d = await res.json();

if(d.error) return alert("Login required");

document.getElementById(`share-count-${id}`).textContent = d.shares;
}

});
loadUser();
loadPosts();
});
