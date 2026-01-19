// Popup script for Eagle Image Organizer

const FOLDER_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

let folders = [];
let images = [];
let currentView = "folders"; // folders, folder-detail, all-images
let selectedFolder = null;
let isGridView = true;
let searchQuery = "";
let selectedColor = FOLDER_COLORS[0];
let contextMenuTarget = null;

// Elements
const content = document.getElementById("content");
const headerTitle = document.getElementById("header-title");
const headerSubtitle = document.getElementById("header-subtitle");
const backBtn = document.getElementById("back-btn");
const gridViewBtn = document.getElementById("grid-view-btn");
const listViewBtn = document.getElementById("list-view-btn");
const searchInput = document.getElementById("search-input");
const contextMenu = document.getElementById("context-menu");
const deleteBtn = document.getElementById("delete-btn");

// Chrome variable declaration
const chrome = window.chrome;

// Initialize
async function init() {
  await loadData();
  renderContent();

  // Event listeners
  backBtn.addEventListener("click", handleBack);
  gridViewBtn.addEventListener("click", () => setGridView(true));
  listViewBtn.addEventListener("click", () => setGridView(false));
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderContent();
  });
  deleteBtn.addEventListener("click", handleDelete);

  // Close context menu on click outside
  document.addEventListener("click", (e) => {
    if (!contextMenu.contains(e.target)) {
      contextMenu.classList.remove("visible");
    }
  });
}

async function loadData() {
  folders = await chrome.runtime.sendMessage({ action: "getFolders" });
  images = await chrome.runtime.sendMessage({ action: "getImages" });
}

function setGridView(value) {
  isGridView = value;
  gridViewBtn.classList.toggle("active", value);
  listViewBtn.classList.toggle("active", !value);
  renderContent();
}

function handleBack() {
  currentView = "folders";
  selectedFolder = null;
  renderContent();
}

async function handleDelete() {
  if (!contextMenuTarget) return;

  if (contextMenuTarget.type === "folder") {
    await chrome.runtime.sendMessage({
      action: "deleteFolder",
      folderId: contextMenuTarget.id,
    });
    folders = folders.filter((f) => f.id !== contextMenuTarget.id);
  } else if (contextMenuTarget.type === "image") {
    await chrome.runtime.sendMessage({
      action: "deleteImage",
      imageId: contextMenuTarget.id,
    });
    images = images.filter((img) => img.id !== contextMenuTarget.id);
  }

  contextMenu.classList.remove("visible");
  contextMenuTarget = null;
  await loadData();
  renderContent();
}

function showContextMenu(e, type, id) {
  e.stopPropagation();
  contextMenuTarget = { type, id };
  contextMenu.style.left = `${Math.min(e.clientX, 360 - 150)}px`;
  contextMenu.style.top = `${Math.min(e.clientY, 500 - 50)}px`;
  contextMenu.classList.add("visible");
}

function renderContent() {
  updateHeader();

  if (currentView === "folders") {
    renderFoldersView();
  } else if (currentView === "folder-detail" || currentView === "all-images") {
    renderImagesView();
  }
}

function updateHeader() {
  backBtn.classList.toggle("visible", currentView !== "folders");

  const totalImages = folders.reduce((acc, f) => acc + (f.imageCount || 0), 0);

  if (currentView === "folders") {
    headerTitle.textContent = "My Collections";
    headerSubtitle.textContent = `${folders.length} folder${folders.length !== 1 ? "s" : ""}, ${totalImages} image${totalImages !== 1 ? "s" : ""}`;
  } else if (currentView === "folder-detail" && selectedFolder) {
    headerTitle.textContent = selectedFolder.name;
    const folderImages = images.filter(
      (img) => img.folderId === selectedFolder.id
    );
    headerSubtitle.textContent = `${folderImages.length} image${folderImages.length !== 1 ? "s" : ""}`;
  } else if (currentView === "all-images") {
    headerTitle.textContent = "All Images";
    headerSubtitle.textContent = `${images.length} image${images.length !== 1 ? "s" : ""}`;
  }
}

function renderFoldersView() {
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalImages = folders.reduce((acc, f) => acc + (f.imageCount || 0), 0);

  content.innerHTML = `
    <button class="all-images-btn" id="all-images-btn">
      <div class="all-images-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </div>
      <div class="all-images-info">
        <div class="all-images-title">All Images</div>
        <div class="all-images-count">${totalImages} saved</div>
      </div>
    </button>
    
    <div class="create-form" id="create-form">
      <input type="text" class="create-input" id="folder-input" placeholder="Folder name">
      <div class="color-picker" id="color-picker">
        ${FOLDER_COLORS.map(
          (color, i) =>
            `<button class="color-btn${i === 0 ? " selected" : ""}" style="background-color: ${color}" data-color="${color}"></button>`
        ).join("")}
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" id="cancel-create">Cancel</button>
        <button class="btn btn-primary" id="submit-create" disabled>Create</button>
      </div>
    </div>
    
    <button class="create-btn" id="create-btn">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Create new folder
    </button>
    
    ${
      filteredFolders.length === 0
        ? `
      <div class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <div class="empty-text">No folders yet</div>
        <div class="empty-subtext">Create your first folder to get started</div>
      </div>
    `
        : isGridView
          ? `
      <div class="folders-grid">
        ${filteredFolders.map((folder) => renderFolderCard(folder)).join("")}
      </div>
    `
          : `
      <div class="folders-list">
        ${filteredFolders.map((folder) => renderFolderListItem(folder)).join("")}
      </div>
    `
    }
  `;

  // Attach event listeners
  document.getElementById("all-images-btn").addEventListener("click", () => {
    currentView = "all-images";
    renderContent();
  });

  const createBtn = document.getElementById("create-btn");
  const createForm = document.getElementById("create-form");
  const folderInput = document.getElementById("folder-input");
  const cancelCreate = document.getElementById("cancel-create");
  const submitCreate = document.getElementById("submit-create");
  const colorPicker = document.getElementById("color-picker");

  createBtn.addEventListener("click", () => {
    createForm.classList.add("visible");
    createBtn.style.display = "none";
    folderInput.focus();
  });

  cancelCreate.addEventListener("click", () => {
    createForm.classList.remove("visible");
    createBtn.style.display = "";
    folderInput.value = "";
  });

  folderInput.addEventListener("input", () => {
    submitCreate.disabled = !folderInput.value.trim();
  });

  folderInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && folderInput.value.trim()) {
      createFolder();
    }
    if (e.key === "Escape") {
      createForm.classList.remove("visible");
      createBtn.style.display = "";
      folderInput.value = "";
    }
  });

  submitCreate.addEventListener("click", createFolder);

  colorPicker.querySelectorAll(".color-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      colorPicker
        .querySelectorAll(".color-btn")
        .forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedColor = btn.dataset.color;
    });
  });

  // Folder click handlers
  document.querySelectorAll("[data-folder-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const folder = folders.find((f) => f.id === el.dataset.folderId);
      if (folder) {
        selectedFolder = folder;
        currentView = "folder-detail";
        renderContent();
      }
    });
  });

  // Folder menu handlers
  document.querySelectorAll("[data-folder-menu]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      showContextMenu(e, "folder", btn.dataset.folderMenu);
    });
  });
}

async function createFolder() {
  const folderInput = document.getElementById("folder-input");
  const name = folderInput.value.trim();
  if (!name) return;

  const folder = await chrome.runtime.sendMessage({
    action: "createFolder",
    name,
    color: selectedColor,
  });

  folders = [folder, ...folders];
  folderInput.value = "";
  document.getElementById("create-form").classList.remove("visible");
  document.getElementById("create-btn").style.display = "";
  renderContent();
}

function renderFolderCard(folder) {
  return `
    <button class="folder-card" data-folder-id="${folder.id}">
      <div class="folder-card-icon" style="background-color: ${folder.color}20">
        <svg style="color: ${folder.color}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
      <div class="folder-card-name">${escapeHtml(folder.name)}</div>
      <div class="folder-card-count">${folder.imageCount || 0} image${folder.imageCount !== 1 ? "s" : ""}</div>
      <button class="folder-card-menu" data-folder-menu="${folder.id}">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
    </button>
  `;
}

function renderFolderListItem(folder) {
  return `
    <button class="folder-list-item" data-folder-id="${folder.id}">
      <div class="folder-list-icon" style="background-color: ${folder.color}20">
        <svg style="color: ${folder.color}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
      <div class="folder-list-info">
        <div class="folder-list-name">${escapeHtml(folder.name)}</div>
        <div class="folder-list-count">${folder.imageCount || 0} image${folder.imageCount !== 1 ? "s" : ""}</div>
      </div>
    </button>
  `;
}

function renderImagesView() {
  let displayImages = images;

  if (currentView === "folder-detail" && selectedFolder) {
    displayImages = images.filter((img) => img.folderId === selectedFolder.id);
  }

  const filteredImages = displayImages.filter(
    (img) =>
      img.pageTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredImages.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </div>
        <div class="empty-text">No images yet</div>
        <div class="empty-subtext">Drag images from websites to save them here</div>
      </div>
    `;
    return;
  }

  content.innerHTML = isGridView
    ? `
    <div class="images-grid">
      ${filteredImages.map((img) => renderImageCard(img)).join("")}
    </div>
  `
    : `
    <div class="images-list">
      ${filteredImages.map((img) => renderImageListItem(img)).join("")}
    </div>
  `;

  // Attach event listeners
  document.querySelectorAll("[data-image-link]").forEach((btn) => {
    btn.addEventListener("click", () => {
      chrome.tabs.create({ url: btn.dataset.imageLink });
    });
  });

  document.querySelectorAll("[data-image-delete]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const imageId = btn.dataset.imageDelete;
      await chrome.runtime.sendMessage({ action: "deleteImage", imageId });
      images = images.filter((img) => img.id !== imageId);
      await loadData();
      renderContent();
    });
  });
}

function renderImageCard(image) {
  return `
    <div class="image-card">
      <img src="${image.thumbnailData || image.imageUrl}" alt="${escapeHtml(image.pageTitle)}" crossorigin="anonymous">
      <div class="image-card-actions">
        <button class="image-action-btn" data-image-link="${image.sourceUrl}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
        <button class="image-action-btn delete" data-image-delete="${image.id}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  `;
}

function renderImageListItem(image) {
  return `
    <div class="image-list-item">
      <div class="image-list-thumb">
        <img src="${image.thumbnailData || image.imageUrl}" alt="${escapeHtml(image.pageTitle)}" crossorigin="anonymous">
      </div>
      <div class="image-list-info">
        <div class="image-list-title">${escapeHtml(image.pageTitle || "Untitled")}</div>
        <div class="image-list-domain">${escapeHtml(image.domain)}</div>
      </div>
      <div class="image-list-actions">
        <button class="image-action-btn" data-image-link="${image.sourceUrl}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
        <button class="image-action-btn delete" data-image-delete="${image.id}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initialize popup
init();
