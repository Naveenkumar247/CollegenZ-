

<script>
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
document.addEventListener("DOMContentLoaded", () => {
  const slider = document.getElementById("featuredSlider");
  if (!slider) return;

  fetch("/api/featured")
    .then(res => res.json())
    .then(posts => {
      slider.innerHTML = posts.map(p => `
        <div class="featured-card">
          <img src="${p.imageurl?.[0] || '/uploads/default.jpg'}" alt="featured">
          <div class="featured-caption">
            ${p.data.substring(0, 40)}
          </div>
        </div>
      `).join("");
    });
});

</script>
