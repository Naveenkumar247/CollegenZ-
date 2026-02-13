const express = require("express");
const router = express.Router();
const genz = require("../models/primary/User");

router.get("/profile", async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect("/login");

    const user = await genz.findById(req.session.userId).lean();

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Profile</title>

<link rel="stylesheet" href="/profile.css">
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>

<body>

<div class="profile-wrapper">
<div class="profile-container">

<form id="profileForm" enctype="multipart/form-data">

<img id="previewImage" class="profile-img"
src="${user.picture || "/uploads/profilepic.jpg"}">

<label class="upload-label">
Change Photo
<input type="file" name="picture" hidden onchange="previewProfile(event)">
</label>

<h4>${user.name || "User"}</h4>
<p>${user.email || ""}</p>

<div class="follow-stats">
<div><h6>${user.followers?.length || 0}</h6><small>Followers</small></div>
<div><h6>${user.following?.length || 0}</h6><small>Following</small></div>
<div><h6>${user.points || 0}</h6><small>Points</small></div>
</div>

<div class="social-links">
${user.instagram ? `<a href="${user.instagram}"><img src="/instagram.jpeg"></a>` : ""}
${user.linkedin ? `<a href="${user.linkedin}"><img src="/linkedin.png"></a>` : ""}
${user.website ? `<a href="${user.website}"><img src="/website.png"></a>` : ""}
${user.youtube ? `<a href="${user.youtube}"><img src="/youtube.jpg"></a>` : ""}
</div>

<button class="btn-edit" type="button" onclick="toggleEdit()">✏️ Edit Profile</button>

<div class="account-row">
<a>${(user.accountType || "public").charAt(0).toUpperCase()+user.accountType.slice(1)} account</a>
</div>

<input type="hidden" name="accountType" value="${user.accountType || "public"}">

<div id="editSection">

<div class="edit-group"><input class="edit-input" name="username" value="${user.username||""}" placeholder="Username"></div>
<div class="edit-group"><input class="edit-input" name="phone" value="${user.phone||""}" placeholder="Phone"></div>
<div class="edit-group"><input class="edit-input" type="date" name="dob" value="${user.dob||""}"></div>
<div class="edit-group"><input class="edit-input" name="college" value="${user.college||""}"></div>
<div class="edit-group"><input class="edit-input" name="dream" value="${user.dream||""}"></div>
<div class="edit-group"><textarea class="edit-input" name="bio">${user.bio||""}</textarea></div>
<div class="edit-group"><input class="edit-input" name="instagram" value="${user.instagram||""}"></div>
<div class="edit-group"><input class="edit-input" name="linkedin" value="${user.linkedin||""}"></div>
<div class="edit-group"><input class="edit-input" name="youtube" value="${user.youtube||""}"></div>
<div class="edit-group"><input class="edit-input" name="website" value="${user.website||""}"></div>

<button class="btn-save" type="button" onclick="saveProfile()">💾 Save</button>

</div>

</form>
</div>
</div>

<script>

function previewProfile(e){
 const r=new FileReader();
 r.onload=()=>previewImage.src=r.result;
 r.readAsDataURL(e.target.files[0]);
}

function toggleEdit(){
 const s=document.getElementById("editSection");
 s.classList.toggle("open");
 s.style.maxHeight=s.classList.contains("open")?s.scrollHeight+"px":"0";
}

async function saveProfile(){
 const fd=new FormData(profileForm);
 const res=await axios.post("/updateProfile",fd);
 alert("Saved");
 location.reload();
}

</script>

</body>
</html>
`);
  } catch (err) {
    res.status(500).send("Profile error");
  }
});

module.exports = router;
