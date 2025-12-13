document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("delete-post-btn")) {
    const postId = e.target.dataset.id;
    const confirmDelete = confirm("Are you sure you want to delete this post?");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/deletepost/${postId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        alert("Post deleted successfully!");
        document.querySelector(`[data-id="${postId}"]`).closest(".card").remove();
      } else {
        alert("Failed to delete post");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting post.");
    }
  }
});


function toggleCaption(id) {
  const caption = document.getElementById(`caption-${id}`);
  const dots = caption.querySelector(".dots");
  const moreText = caption.querySelector(".more-text");
  const btn = caption.querySelector(".see-more-btn");

  if (moreText.style.display === "none") {
    moreText.style.display = "inline";
    dots.style.display = "none";
    btn.innerText = "See Less";
  } else {
    moreText.style.display = "none";
    dots.style.display = "inline";
    btn.innerText = "See More";
  }
}


document.addEventListener("DOMContentLoaded", async () => {
    const followButtons = document.querySelectorAll(".follow-btn");

    followButtons.forEach(async (btn) => {
        const targetId = btn.dataset.target;

        const res = await fetch(`/follow-status/${targetId}`);
        const data = await res.json();

        if (data.following) {
            btn.textContent = "Following";
            btn.classList.remove("btn-primary");
            btn.classList.add("btn-success");
        } else {
            btn.textContent = "Follow";
            btn.classList.remove("btn-success");
            btn.classList.add("btn-primary");
        }
    });
});

document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".follow-btn");
    if (!btn) return;

    const targetId = btn.dataset.target;

    const res = await fetch(`/follow/${targetId}`, { method: "POST" });
    const data = await res.json();

    if (data.following) {
        btn.textContent = "Following";
        btn.classList.add("following");
    } else {
        btn.textContent = "Follow";
        btn.classList.remove("following");
    }
});


function toggleDetails(id) {
  const rows = document.querySelectorAll(`.row-${id}`);
  const btn = document.querySelector(`#details-${id} .view-btn`);

  const expand = rows[0].style.display === "none";

  rows.forEach(r => {
    r.style.display = expand ? "table-row" : "none";
  });

  btn.innerText = expand ? "Hide Details" : "View Details";
}

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("open-profile")) {

    const userId = e.target.dataset.user;

    document.getElementById("profilePopup").style.display = "flex";
    document.getElementById("profileData").innerHTML = "Loading...";

    const res = await fetch(`/get-profile/${userId}`);
    const user = await res.json();

    // PRIVATE ACCOUNT VIEW
    if (user.accountType === "personal") {
      document.getElementById("profileData").innerHTML = `
        <img src="${user.picture || '/uploads/profilepic.jpg'}"
             style="width:80px; height:80px; border-radius:50%; object-fit:cover;">
  
        <h3>${user.name}</h3>
        <p style="color:gray;">This account is private</p>
  
        <div class="d-flex justify-content-center gap-4 mb-2">
          <div><strong>${user.followers?.length || 0}</strong><br><small>Followers</small></div>
          <div><strong>${user.following?.length || 0}</strong><br><small>Following</small></div>
        </div>
      `;
      return; // stop here for private accounts
    }

    // PUBLIC ACCOUNT VIEW
    document.getElementById("profileData").innerHTML = `
      <img src="${user.picture || '/uploads/profilepic.jpg'}"
           style="width:80px; height:80px; border-radius:50%; object-fit:cover;">

      <h3>${user.name || "User"}</h3>
      <p class="text-muted">${user.email || ""}</p>

      <div class="d-flex justify-content-center gap-4 mb-2">
        <div><strong>${user.followers?.length || 0}</strong><br><small>Followers</small></div>
        <div><strong>${user.following?.length || 0}</strong><br><small>Following</small></div>
      </div>

      <div class="popup-social mt-3">
        ${user.instagram ? `
          <a href="${user.instagram}" target="_blank">
            <img src="/instagram.jpeg" style="width:28px;height:28px;border-radius:50%;object-fit:cover;margin:0 6px;">
          </a>` : ""}

        ${user.linkedin ? `
          <a href="${user.linkedin}" target="_blank">
            <img src="/linkedin.png" style="width:28px;height:28px;border-radius:20%;object-fit:cover;margin:0 6px;">
          </a>` : ""}

        ${user.website ? `
          <a href="${user.website}" target="_blank">
            <img src="/website.png" style="width:28px;height:28px;border-radius:50%;object-fit:cover;margin:0 6px;">
          </a>` : ""}

        ${user.youtube ? `
          <a href="${user.youtube}" target="_blank">
            <img src="/youtube.jpg" style="width:28px;height:28px;border-radius:20%;object-fit:cover;margin:0 6px;">
          </a>` : ""}
      </div>
    `;
  }
});

document.querySelector(".close-popup").onclick = () => {
  document.getElementById("profilePopup").style.display = "none";
};

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", async () => {

    // remove active class
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const type = btn.dataset.type;
    const sort = btn.dataset.sort || "";

    const res = await fetch(`/posts/filter?type=${type}&sort=${sort}`);
    const post = await res.json();

    renderPost(post); // function that updates your post list
  });
});

function renderPost(post) {
  const container = document.getElementById("posts-container");
  container.innerHTML = "";

  post.forEach(p => {
    container.innerHTML += createPostHTML(p); // your existing card HTML
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!window.IS_LOGGED_IN) {

    // Show only once per session
    if (sessionStorage.getItem("loginAlertShown")) return;
    sessionStorage.setItem("loginAlertShown", "true");

    setTimeout(() => {
      Swal.fire({
        title: "Login Required",
        text: "Login to create posts, follow users, and access all CollegenZ features.",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Login",
        cancelButtonText: "Later",
        confirmButtonColor: "#228B22",

        // 🔒 User MUST choose
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = "/login";
        }
        // "Later" → closes dialog only
      });
    }, 5000); // shows after 5 seconds
  }
});


