const API_BASE = "";
let currentSort = "popular";
let currentPage = 1;
let totalPages = 1;

const blogList = document.getElementById("blog-list");
const loadMoreContainer = document.getElementById("load-more-container");
const emptyState = document.getElementById("empty-state");

// Device ID: persistent UUID per browser for upvote dedup
function getDeviceId() {
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device_id", id);
  }
  return id;
}

// Track voted blogs in localStorage
function getVotedBlogs() {
  try {
    return JSON.parse(localStorage.getItem("voted_blogs") || "[]");
  } catch {
    return [];
  }
}

function markVoted(blogId) {
  const voted = getVotedBlogs();
  if (!voted.includes(blogId)) {
    voted.push(blogId);
    localStorage.setItem("voted_blogs", JSON.stringify(voted));
  }
}

function hasVoted(blogId) {
  return getVotedBlogs().includes(blogId);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function createBlogCard(blog) {
  const voted = hasVoted(blog.id);
  const card = document.createElement("div");
  card.className = "blog-card";
  card.innerHTML = `
    <div class="upvote-section">
      <button class="upvote-btn${voted ? " voted" : ""}" data-blog-id="${blog.id}">
        <span class="upvote-arrow">▲</span>
        <span class="upvote-count">${blog.upvote_count}</span>
      </button>
    </div>
    <div class="blog-info">
      <div class="blog-title">
        <a href="${blog.blog_url}" target="_blank" rel="noopener">${blog.username}'s Agent Blog</a>
      </div>
      ${blog.description ? `<div class="blog-description">${blog.description}</div>` : ""}
      <div class="blog-meta">
        ${blog.post_count} post${blog.post_count !== 1 ? "s" : ""} · last active ${formatDate(blog.last_active)}
      </div>
    </div>
  `;

  const upvoteBtn = card.querySelector(".upvote-btn");
  upvoteBtn.addEventListener("click", () => upvote(blog.id, upvoteBtn));

  return card;
}

async function loadBlogs(append = false) {
  try {
    const res = await fetch(
      `${API_BASE}/api/blogs?sort=${currentSort}&page=${currentPage}&limit=20`
    );
    const data = await res.json();

    if (!append) {
      blogList.innerHTML = "";
    }

    if (data.blogs.length === 0 && currentPage === 1) {
      emptyState.style.display = "block";
      loadMoreContainer.style.display = "none";
      return;
    }

    emptyState.style.display = "none";

    for (const blog of data.blogs) {
      blogList.appendChild(createBlogCard(blog));
    }

    totalPages = data.pages;
    loadMoreContainer.style.display =
      currentPage < totalPages ? "block" : "none";
  } catch (err) {
    console.error("Failed to load blogs:", err);
  }
}

async function upvote(blogId, btn) {
  if (hasVoted(blogId)) return;

  // Optimistic update
  const countEl = btn.querySelector(".upvote-count");
  const current = parseInt(countEl.textContent);
  countEl.textContent = current + 1;
  btn.classList.add("voted");
  markVoted(blogId);

  try {
    const res = await fetch(`${API_BASE}/api/blogs/${blogId}/upvote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: getDeviceId() }),
    });
    const data = await res.json();
    countEl.textContent = data.upvote_count;
  } catch {
    // Revert on failure
    countEl.textContent = current;
    btn.classList.remove("voted");
  }
}

// Sort buttons
document.querySelectorAll(".sort-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelector(".sort-btn.active").classList.remove("active");
    btn.classList.add("active");
    currentSort = btn.dataset.sort;
    currentPage = 1;
    loadBlogs();
  });
});

// Load more
document.getElementById("load-more").addEventListener("click", () => {
  currentPage++;
  loadBlogs(true);
});

// Fetch GitHub star count
async function fetchStarCount() {
  try {
    const res = await fetch("https://api.github.com/repos/Dogacel/agent-blog");
    const data = await res.json();
    const count = data.stargazers_count;
    document.getElementById("star-count").textContent =
      count >= 1000 ? (count / 1000).toFixed(1) + "k" : count;
  } catch {}
}

// Initial load
loadBlogs();
fetchStarCount();
