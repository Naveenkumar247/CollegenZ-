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

async function loadPosts(filter="all"){
try{

const postRes=await fetch("/api/posts");
const featuredRes=await fetch("/api/featured");

const {posts=[]}=await postRes.json();
const {featured=[]}=await featuredRes.json();

const postContainer=document.getElementById("postContainer");
const featuredSlider=document.getElementById("featuredSlider");

featuredSlider.innerHTML="";
postContainer.innerHTML="";

/* FEATURED */
featured.forEach(p=>{
const img=Array.isArray(p.imageurl)?p.imageurl[0]:p.imageurl;
featuredSlider.innerHTML+=`
<div class="featured-card">
<img src="${img}">
<p>${p.username||"User"}</p>
</div>`;
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
<a href="${p.job_link?.startsWith("http")?p.job_link:"https://"+p.job_link}" target="_blank">
Open Link
</a>
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
<a href="${p.job_link?.startsWith("http")?p.job_link:"https://"+p.job_link}" target="_blank">
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
<img src="${p.picture||"/uploads/profilepic.jpg"}" class="ig-avatar">
<strong>${p.username||"User"}</strong>
</div>

<div id="carousel-${index}" class="carousel slide" data-bs-touch="true">

${images.length>1?`<div class="carousel-indicators">${indicators}</div>`:""}

<div class="carousel-inner">${slides}</div>

</div>

<div class="ig-actions">

<div class="ig-left">

<span class="like-btn" data-id="${p._id}">
<i class="bi bi-heart"></i>
<small id="like-${p._id}">${p.likes||0}</small>
</span>

<span class="share-btn" data-id="${p._id}">
<i class="bi bi-send"></i>
<small id="share-${p._id}">${p.shares||0}</small>
</span>

</div>

<span class="save-btn" data-id="${p._id}">
<i class="bi bi-bookmark"></i>
<small id="save-${p._id}">${p.saves||0}</small>
</span>

</div>

<div class="ig-caption">${caption}</div>

</div>
`);

});

/* enable swipe */
document.querySelectorAll(".carousel").forEach(c=>{
new bootstrap.Carousel(c,{interval:false,touch:true});
});

}catch(e){
console.error(e);
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
