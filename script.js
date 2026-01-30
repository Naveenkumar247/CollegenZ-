

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
fetch("/api/featured")
  .then(r => r.json())
  .then(posts => {
    featuredSlider.innerHTML = posts.map(p => `
      <div class="featured-card">
        <img src="${p.imageurl[0]}">
        <h6>${p.data.substring(0,60)}</h6>
      </div>
    `).join("");
  });

</script>
