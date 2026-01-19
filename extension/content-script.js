// Content script for Eagle Image Organizer
// Detects image drags and shows the save overlay

(function () {
  "use strict";

  // Prevent multiple injections
  if (window.__eagleImageOrganizerInjected) return;
  window.__eagleImageOrganizerInjected = true;

  // Folder colors
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

  let currentDragData = null;
  let overlay = null;
  let shadowRoot = null;
  const chrome = window.chrome; // Declare the chrome variable

  // Create Shadow DOM container for isolated styles
  function createOverlay() {
    const container = document.createElement("div");
    container.id = "eagle-image-organizer-overlay";
    shadowRoot = container.attachShadow({ mode: "closed" });

    // Inject styles
    const styles = document.createElement("style");
    styles.textContent = getOverlayStyles();
    shadowRoot.appendChild(styles);

    // Inject HTML
    overlay = document.createElement("div");
    overlay.className = "eagle-overlay";
    overlay.innerHTML = getOverlayHTML();
    shadowRoot.appendChild(overlay);

    document.body.appendChild(container);

    // Attach event listeners
    attachEventListeners();
  }

  function getOverlayStyles() {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      .eagle-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: none;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
      .eagle-overlay.visible {
        display: flex;
      }
      
      .eagle-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        animation: fadeIn 0.2s ease;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes zoomIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .eagle-modal {
        position: relative;
        width: 100%;
        max-width: 400px;
        margin: 16px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        animation: zoomIn 0.2s ease;
        overflow: hidden;
      }
      
      .eagle-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #f5f5f5;
      }
      
      .eagle-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .eagle-header-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: #f5f5f5;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .eagle-header-icon svg {
        width: 20px;
        height: 20px;
        color: #525252;
      }
      
      .eagle-header-text h2 {
        font-size: 14px;
        font-weight: 600;
        color: #171717;
      }
      
      .eagle-header-text p {
        font-size: 11px;
        color: #737373;
        margin-top: 2px;
      }
      
      .eagle-close-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: none;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
      }
      
      .eagle-close-btn:hover {
        background: #f5f5f5;
      }
      
      .eagle-close-btn svg {
        width: 16px;
        height: 16px;
        color: #737373;
      }
      
      .eagle-preview {
        padding: 16px 20px;
        border-bottom: 1px solid #f5f5f5;
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .eagle-preview-img {
        width: 80px;
        height: 56px;
        border-radius: 8px;
        background: #f5f5f5;
        object-fit: cover;
        flex-shrink: 0;
      }
      
      .eagle-preview-info {
        flex: 1;
        min-width: 0;
      }
      
      .eagle-preview-title {
        font-size: 13px;
        font-weight: 500;
        color: #171717;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .eagle-preview-domain {
        font-size: 11px;
        color: #737373;
        margin-top: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .eagle-content {
        padding: 20px;
      }
      
      .eagle-create-form {
        margin-bottom: 16px;
        padding: 16px;
        border-radius: 12px;
        background: #fafafa;
        border: 1px solid #e5e5e5;
        display: none;
      }
      
      .eagle-create-form.visible {
        display: block;
      }
      
      .eagle-create-input {
        width: 100%;
        padding: 8px 12px;
        font-size: 13px;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        background: white;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      
      .eagle-create-input:focus {
        border-color: #171717;
        box-shadow: 0 0 0 2px rgba(23, 23, 23, 0.1);
      }
      
      .eagle-color-picker {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }
      
      .eagle-color-btn {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
      }
      
      .eagle-color-btn:hover {
        transform: scale(1.1);
      }
      
      .eagle-color-btn.selected {
        box-shadow: 0 0 0 2px white, 0 0 0 4px #171717;
      }
      
      .eagle-form-actions {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }
      
      .eagle-btn {
        flex: 1;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 500;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        transition: background 0.15s, opacity 0.15s;
      }
      
      .eagle-btn-secondary {
        background: white;
        color: #525252;
        border: 1px solid #e5e5e5;
      }
      
      .eagle-btn-secondary:hover {
        background: #fafafa;
      }
      
      .eagle-btn-primary {
        background: #171717;
        color: white;
      }
      
      .eagle-btn-primary:hover {
        background: #262626;
      }
      
      .eagle-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .eagle-create-btn {
        width: 100%;
        margin-bottom: 16px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        border: 2px dashed #e5e5e5;
        border-radius: 12px;
        background: transparent;
        color: #525252;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
      }
      
      .eagle-create-btn:hover {
        border-color: #d4d4d4;
        background: #fafafa;
      }
      
      .eagle-create-btn svg {
        width: 20px;
        height: 20px;
      }
      
      .eagle-folders {
        max-height: 256px;
        overflow-y: auto;
      }
      
      .eagle-folders::-webkit-scrollbar {
        width: 6px;
      }
      
      .eagle-folders::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .eagle-folders::-webkit-scrollbar-thumb {
        background: #e5e5e5;
        border-radius: 3px;
      }
      
      .eagle-folder-item {
        width: 100%;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        background: transparent;
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
        margin-bottom: 8px;
      }
      
      .eagle-folder-item:last-child {
        margin-bottom: 0;
      }
      
      .eagle-folder-item:hover {
        border-color: #d4d4d4;
        background: #fafafa;
      }
      
      .eagle-folder-item.saving {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .eagle-folder-item.saved {
        border-color: #22c55e;
        background: #f0fdf4;
      }
      
      .eagle-folder-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .eagle-folder-color {
        width: 12px;
        height: 12px;
        border-radius: 4px;
      }
      
      .eagle-folder-info {
        flex: 1;
        text-align: left;
        min-width: 0;
      }
      
      .eagle-folder-name {
        font-size: 13px;
        font-weight: 500;
        color: #171717;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .eagle-folder-count {
        font-size: 11px;
        color: #737373;
        margin-top: 2px;
      }
      
      .eagle-folder-arrow {
        width: 16px;
        height: 16px;
        color: #a3a3a3;
      }
      
      .eagle-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #e5e5e5;
        border-top-color: #171717;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }
      
      .eagle-check {
        width: 16px;
        height: 16px;
        color: #22c55e;
      }
      
      .eagle-empty {
        text-align: center;
        padding: 32px 0;
      }
      
      .eagle-empty-icon {
        width: 48px;
        height: 48px;
        border-radius: 16px;
        background: #f5f5f5;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 12px;
      }
      
      .eagle-empty-icon svg {
        width: 24px;
        height: 24px;
        color: #a3a3a3;
      }
      
      .eagle-empty-text {
        font-size: 13px;
        color: #737373;
      }
      
      .eagle-empty-subtext {
        font-size: 11px;
        color: #a3a3a3;
        margin-top: 4px;
      }
    `;
  }

  function getOverlayHTML() {
    return `
      <div class="eagle-backdrop" data-action="close"></div>
      <div class="eagle-modal">
        <div class="eagle-header">
          <div class="eagle-header-left">
            <div class="eagle-header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div class="eagle-header-text">
              <h2>Save Image</h2>
              <p>Select a folder or create new</p>
            </div>
          </div>
          <button class="eagle-close-btn" data-action="close">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="eagle-preview">
          <img class="eagle-preview-img" src="" alt="Preview" crossorigin="anonymous" />
          <div class="eagle-preview-info">
            <div class="eagle-preview-title"></div>
            <div class="eagle-preview-domain"></div>
          </div>
        </div>
        
        <div class="eagle-content">
          <div class="eagle-create-form" id="eagle-create-form">
            <input type="text" class="eagle-create-input" id="eagle-folder-input" placeholder="Folder name" />
            <div class="eagle-color-picker" id="eagle-color-picker"></div>
            <div class="eagle-form-actions">
              <button class="eagle-btn eagle-btn-secondary" data-action="cancel-create">Cancel</button>
              <button class="eagle-btn eagle-btn-primary" id="eagle-create-submit" disabled>Create</button>
            </div>
          </div>
          
          <button class="eagle-create-btn" id="eagle-create-btn">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create new folder
          </button>
          
          <div class="eagle-folders" id="eagle-folders"></div>
        </div>
      </div>
    `;
  }

  function attachEventListeners() {
    // Close overlay
    overlay.querySelectorAll("[data-action='close']").forEach((el) => {
      el.addEventListener("click", closeOverlay);
    });

    // Show create form
    overlay.querySelector("#eagle-create-btn").addEventListener("click", () => {
      overlay.querySelector("#eagle-create-form").classList.add("visible");
      overlay.querySelector("#eagle-create-btn").style.display = "none";
      overlay.querySelector("#eagle-folder-input").focus();
    });

    // Cancel create
    overlay
      .querySelector("[data-action='cancel-create']")
      .addEventListener("click", () => {
        overlay.querySelector("#eagle-create-form").classList.remove("visible");
        overlay.querySelector("#eagle-create-btn").style.display = "";
        overlay.querySelector("#eagle-folder-input").value = "";
      });

    // Folder input
    const folderInput = overlay.querySelector("#eagle-folder-input");
    const submitBtn = overlay.querySelector("#eagle-create-submit");

    folderInput.addEventListener("input", () => {
      submitBtn.disabled = !folderInput.value.trim();
    });

    folderInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && folderInput.value.trim()) {
        createNewFolder();
      }
      if (e.key === "Escape") {
        overlay.querySelector("#eagle-create-form").classList.remove("visible");
        overlay.querySelector("#eagle-create-btn").style.display = "";
        folderInput.value = "";
      }
    });

    submitBtn.addEventListener("click", createNewFolder);

    // Initialize color picker
    initColorPicker();
  }

  let selectedColor = FOLDER_COLORS[0];

  function initColorPicker() {
    const picker = overlay.querySelector("#eagle-color-picker");
    picker.innerHTML = FOLDER_COLORS.map(
      (color, i) =>
        `<button class="eagle-color-btn${i === 0 ? " selected" : ""}" 
         style="background-color: ${color}" 
         data-color="${color}"></button>`
    ).join("");

    picker.querySelectorAll(".eagle-color-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        picker
          .querySelectorAll(".eagle-color-btn")
          .forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedColor = btn.dataset.color;
      });
    });
  }

  async function createNewFolder() {
    const input = overlay.querySelector("#eagle-folder-input");
    const name = input.value.trim();
    if (!name) return;

    const folder = await chrome.runtime.sendMessage({
      action: "createFolder",
      name,
      color: selectedColor,
    });

    input.value = "";
    overlay.querySelector("#eagle-create-form").classList.remove("visible");
    overlay.querySelector("#eagle-create-btn").style.display = "";

    // Refresh folder list and save to new folder
    await loadFolders();
    saveToFolder(folder);
  }

  async function loadFolders() {
    const folders = await chrome.runtime.sendMessage({ action: "getFolders" });
    const container = overlay.querySelector("#eagle-folders");

    if (folders.length === 0) {
      container.innerHTML = `
        <div class="eagle-empty">
          <div class="eagle-empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div class="eagle-empty-text">No folders yet</div>
          <div class="eagle-empty-subtext">Create your first folder above</div>
        </div>
      `;
      return;
    }

    container.innerHTML = folders
      .map(
        (folder) => `
        <button class="eagle-folder-item" data-folder-id="${folder.id}">
          <div class="eagle-folder-icon" style="background-color: ${folder.color}20">
            <div class="eagle-folder-color" style="background-color: ${folder.color}"></div>
          </div>
          <div class="eagle-folder-info">
            <div class="eagle-folder-name">${escapeHtml(folder.name)}</div>
            <div class="eagle-folder-count">${folder.imageCount || 0} image${folder.imageCount !== 1 ? "s" : ""}</div>
          </div>
          <svg class="eagle-folder-arrow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      `
      )
      .join("");

    // Attach click handlers
    container.querySelectorAll(".eagle-folder-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const folderId = btn.dataset.folderId;
        const folder = folders.find((f) => f.id === folderId);
        if (folder) saveToFolder(folder);
      });
    });
  }

  async function saveToFolder(folder) {
    if (!currentDragData) return;

    const btn = overlay.querySelector(`[data-folder-id="${folder.id}"]`);
    if (btn) {
      btn.classList.add("saving");
      btn.querySelector(".eagle-folder-arrow").outerHTML =
        '<div class="eagle-spinner"></div>';
    }

    try {
      // Generate thumbnail
      const thumbnailData = await generateThumbnail(currentDragData.imageUrl);

      await chrome.runtime.sendMessage({
        action: "saveImage",
        data: {
          folderId: folder.id,
          imageUrl: currentDragData.imageUrl,
          sourceUrl: currentDragData.sourceUrl,
          pageTitle: currentDragData.pageTitle,
          domain: currentDragData.domain,
          thumbnailData,
        },
      });

      if (btn) {
        btn.classList.remove("saving");
        btn.classList.add("saved");
        btn.querySelector(".eagle-spinner").outerHTML =
          '<svg class="eagle-check" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>';
      }

      setTimeout(closeOverlay, 600);
    } catch (error) {
      console.error("Failed to save image:", error);
      if (btn) {
        btn.classList.remove("saving");
        btn.querySelector(".eagle-spinner").outerHTML =
          '<svg class="eagle-folder-arrow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>';
      }
    }
  }

  function generateThumbnail(imageUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const maxSize = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = imageUrl;
    });
  }

  function showOverlay(dragData) {
    if (!overlay) createOverlay();

    currentDragData = dragData;

    // Update preview
    const previewImg = overlay.querySelector(".eagle-preview-img");
    const previewTitle = overlay.querySelector(".eagle-preview-title");
    const previewDomain = overlay.querySelector(".eagle-preview-domain");

    previewImg.src = dragData.imageUrl;
    previewTitle.textContent = dragData.pageTitle || "Untitled";
    previewDomain.textContent = dragData.domain;

    // Reset form state
    overlay.querySelector("#eagle-create-form").classList.remove("visible");
    overlay.querySelector("#eagle-create-btn").style.display = "";
    overlay.querySelector("#eagle-folder-input").value = "";

    // Load folders
    loadFolders();

    // Show overlay
    overlay.classList.add("visible");
  }

  function closeOverlay() {
    if (overlay) {
      overlay.classList.remove("visible");
    }
    currentDragData = null;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Detect image drags
  let draggedImageUrl = null;

  document.addEventListener("dragstart", (e) => {
    const target = e.target;
    let imageUrl = null;

    // Check if dragging an img element
    if (target.tagName === "IMG" && target.src) {
      imageUrl = target.src;
    }

    // Check for background image
    if (!imageUrl && target.style && target.style.backgroundImage) {
      const match = target.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/);
      if (match) imageUrl = match[1];
    }

    // Check computed styles
    if (!imageUrl) {
      const computed = window.getComputedStyle(target);
      const bgImage = computed.backgroundImage;
      if (bgImage && bgImage !== "none") {
        const match = bgImage.match(/url\(["']?(.+?)["']?\)/);
        if (match) imageUrl = match[1];
      }
    }

    if (imageUrl) {
      draggedImageUrl = imageUrl;
    }
  });

  document.addEventListener("dragend", (e) => {
    if (draggedImageUrl) {
      // Small delay to detect if dropped outside the page
      setTimeout(() => {
        showOverlay({
          imageUrl: draggedImageUrl,
          sourceUrl: window.location.href,
          pageTitle: document.title,
          domain: window.location.hostname,
        });
        draggedImageUrl = null;
      }, 100);
    }
  });

  // Listen for keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay?.classList.contains("visible")) {
      closeOverlay();
    }
  });
})();
