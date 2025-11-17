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


document.addEventListener("click", (e) => {
  if (e.target.classList.contains("see-more-btn")) {
    const postId = e.target.dataset.id;
    const captionEl = document.getElementById(`caption-${postId}`);
    const moreText = captionEl.querySelector(".more-text");
    const dots = captionEl.querySelector(".dots");

    if (moreText.style.display === "none") {
      moreText.style.display = "inline";
      dots.style.display = "none";
      e.target.textContent = "See less";
    } else {
      moreText.style.display = "none";
      dots.style.display = "inline";
      e.target.textContent = "See more";
    }
  }
});

document.addEventListener("click", async function (e) {
  const btn = e.target.closest(".follow-btn");
  if (!btn) return;

  const targetId = btn.dataset.target;

  const res = await fetch(`/follow/${targetId}`, {
    method: "POST",
    credentials: "include"
  });

  const data = await res.json();

  btn.innerText = (data.status === "followed") ? "Following" : "Follow";
});
