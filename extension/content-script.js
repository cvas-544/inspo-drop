// content-script.js — Inspo Drop
console.log("🔥 Inspo Drop content script loaded");

(() => {
  "use strict";

  if (window.__inspoDropInjected) return;
  window.__inspoDropInjected = true;

  const browserAPI = globalThis.chrome ?? globalThis.browser;

  let overlay;
  let shadowRoot;
  let currentDragData = null;

  /* -------------------- helpers -------------------- */

  function sendMessage(message) {
    return new Promise((resolve) => {
      browserAPI.runtime.sendMessage(message, resolve);
    });
  }

  function createOverlay() {
    const container = document.createElement("div");
    shadowRoot = container.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = getStyles();
    shadowRoot.appendChild(style);

    overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = getHTML();
    shadowRoot.appendChild(overlay);

    document.body.appendChild(container);
    attachEvents();
  }

  function showOverlay(dragData) {
    if (!overlay) createOverlay();

    currentDragData = dragData;
    resetGeneralZone();

    overlay.querySelector(".preview-img").src = dragData.imageUrl;
    overlay.querySelector(".preview-title").textContent =
      dragData.pageTitle || "Untitled";
    overlay.querySelector(".preview-domain").textContent = dragData.domain;

    overlay.querySelector(".create-form").classList.remove("visible");
    overlay.querySelector(".create-btn").style.display = "";

    loadFolders();
    overlay.classList.add("visible");
  }

  function closeOverlay() {
    overlay?.classList.remove("visible");
    currentDragData = null;
  }

  /* -------------------- UI -------------------- */

  function getHTML() {
    return `
      <div class="modal">
        <div class="preview">
          <img class="preview-img" />
          <div class="preview-meta">
            <div class="preview-title"></div>
            <div class="preview-domain"></div>
          </div>
        </div>

        <div class="zones">
          <div class="zone zone-general" id="zone-general">
            <strong>General</strong>
            <span>Drop to save</span>
          </div>

          <div class="zone zone-folder" id="zone-folder">
            <strong>Folder</strong>
            <span>Drop to organize</span>
          </div>
        </div>

        <button class="create-btn">Create new folder</button>

        <div class="create-form">
          <input id="folder-input" placeholder="Folder name" />
          <button id="create-submit">Create & Save</button>
        </div>

        <div class="folders"></div>
      </div>
    `;
  }

  function getStyles() {
    return `
      * { box-sizing: border-box; font-family: system-ui, -apple-system, BlinkMacSystemFont; }

      .overlay {
        position: fixed;
        inset: 0;
        display: none;
        pointer-events: none;
        z-index: 999999;
        align-items: center;
        justify-content: center;
      }

      .overlay.visible { display: flex; }

      .modal {
        width: 510px;
        padding: 26px;
        background: #ffffff;
        border-radius: 14px;
        padding: 22px;
        pointer-events: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,.22);
      }

      .preview {
        display: flex;
        gap: 16px;
        margin-bottom: 22px;
        align-items: center;
      }

      .preview-img {
        width: 56px;
        height: 56px;
        object-fit: cover;
        border-radius: 8px;
        background: #f3f3f3;
      }

      .preview-title {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
      }

      .preview-domain {
        font-size: 11px;
        color: #777;
        margin-top: 2px;
      }

      .zones {
        display: flex;
        gap: 18px;
        margin-bottom: 24px;
      }

      .zone {
        flex: 1;
        border: 1.5px dashed #e5e5e5;
        border-radius: 12px;
        padding: 22px 16px;
        text-align: center;
        transition: background .15s, border-color .15s;
        background: #fafafa;
      }

      .zone strong {
        display: block;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 2px;
      }

      .zone span {
        font-size: 12px;
        color: #737373;
      }

      .zone.drag {
        border-color: #171717;
        background: #f3f3f3;
      }

      .create-btn {
        width: 100%;
        padding: 18px;
        margin-bottom: 22px;
        border: none;
        background: #fafafa;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        color: #525252;
        cursor: pointer;
        transition: background .15s;
      }

      .create-btn:hover {
        background: #f0f0f0;
      }

      .create-form {
        display: none;
        margin-bottom: 18px;
      }

      .create-form.visible { display: block; }

      .create-form input {
        width: 100%;
        padding: 8px 10px;
        margin-bottom: 8px;
        border-radius: 8px;
        border: 1px solid #e5e5e5;
        font-size: 13px;
      }

      .create-form button {
        width: 100%;
        padding: 8px;
        border-radius: 8px;
        border: none;
        background: #171717;
        color: #ffffff;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
      }

      .folders button {
        width: 100%;
        padding: 16px;
        border-radius: 10px;
        border: 1px solid #e5e5e5;
        background: #ffffff;
        cursor: pointer;
        margin-bottom: 12px;
        font-size: 13px;
        text-align: left;
        transition: background .15s, border-color .15s;
      }

      .folders button.drag {
        border-color: #171717;
        background: #f6f6f6;
      }
    `;
  }

  /* -------------------- events -------------------- */

  function attachEvents() {
    const general = overlay.querySelector("#zone-general");
    const folder = overlay.querySelector("#zone-folder");
    const createBtn = overlay.querySelector(".create-btn");
    const createForm = overlay.querySelector(".create-form");
    const input = overlay.querySelector("#folder-input");
    const submit = overlay.querySelector("#create-submit");

    [general, folder].forEach((z) => {
      z.addEventListener("dragover", (e) => {
        e.preventDefault();
        z.classList.add("drag");
      });
      z.addEventListener("dragleave", () => z.classList.remove("drag"));
    });

    general.addEventListener("drop", async () => {
      await saveImage("general");
      closeOverlay();
    });

    folder.addEventListener("drop", () => {
      createForm.classList.add("visible");
      createBtn.style.display = "none";
      input.focus();
    });

    createBtn.addEventListener("click", () => {
      createForm.classList.add("visible");
      createBtn.style.display = "none";
      input.focus();
    });

    submit.addEventListener("click", async () => {
      const name = input.value.trim();
      if (!name) return;

      const folder = await sendMessage({
        action: "createFolder",
        name,
        color: "#888"
      });

      await saveImage(folder.id);
      closeOverlay();
    });
  }

  async function saveImage(folderId) {
    if (!currentDragData) return;

    await sendMessage({
      action: "saveImage",
      data: {
        folderId,
        imageUrl: currentDragData.imageUrl,
        pageTitle: currentDragData.pageTitle,
        domain: currentDragData.domain,
        sourceUrl: currentDragData.sourceUrl
      }
    });
  }

  async function loadFolders() {
    const folders = await sendMessage({ action: "getFolders" });
    const container = overlay.querySelector(".folders");
    container.innerHTML = "";

    folders
      .filter((f) => f.id !== "general")
      .forEach((folder) => {
        const btn = document.createElement("button");
        btn.textContent = folder.name;

        btn.addEventListener("dragover", (e) => {
          e.preventDefault();
          btn.classList.add("drag");
        });

        btn.addEventListener("dragleave", () =>
          btn.classList.remove("drag")
        );

        btn.addEventListener("drop", async () => {
          await saveImage(folder.id);
          closeOverlay();
        });

        container.appendChild(btn);
      });
  }

  function resetGeneralZone() {
    const g = overlay?.querySelector("#zone-general");
    if (!g) return;
    g.classList.remove("drag");
    g.innerHTML = "<strong>General</strong><span>Drop to save</span>";
  }

  /* -------------------- drag detection -------------------- */

  document.addEventListener(
    "dragstart",
    (e) => {
      let imgSrc;

      if (e.target?.tagName === "IMG") imgSrc = e.target.src;
      if (!imgSrc) return;

      // --- FORCE small drag preview (must be synchronous) ---
      const dragImg = document.createElement("img");
      dragImg.src = imgSrc;

      // IMPORTANT: use attributes, not styles
      dragImg.width = 48;
      dragImg.height = 48;

      dragImg.style.objectFit = "cover";
      dragImg.style.borderRadius = "6px";
      dragImg.style.opacity = "0.7";
      dragImg.style.position = "fixed";
      dragImg.style.top = "-1000px";
      dragImg.style.left = "-1000px";
      dragImg.style.pointerEvents = "none";

      document.body.appendChild(dragImg);

      try {
        // MUST be called immediately, not in onload
        e.dataTransfer.setDragImage(dragImg, 72, 72);
      } catch (err) {
        console.warn("setDragImage failed", err);
      }

      // Cleanup
      setTimeout(() => dragImg.remove(), 0);

      showOverlay({
        imageUrl: imgSrc,
        sourceUrl: location.href,
        pageTitle: document.title,
        domain: location.hostname
      });
    },
    true
  );

  document.addEventListener("dragend", closeOverlay);
})();
