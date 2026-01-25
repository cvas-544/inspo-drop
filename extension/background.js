// background.js — Inspo Drop

const DEFAULT_FOLDER = "Inspo-Drop/General";

function log(...args) {
  console.log("📦 [Inspo Drop]", ...args);
}

// Ensure General folder exists on install
chrome.runtime.onInstalled.addListener(() => {
  log("Extension installed");

  chrome.storage.local.get(["folders"], (res) => {
    if (!res.folders) {
      chrome.storage.local.set({
        folders: {
          general: {
            id: "general",
            name: "General",
            images: [],
            createdAt: Date.now(),
          },
        },
      });
      log("Initialized General folder");
    }
  });
});

// Message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ---------- SAVE IMAGE ----------
  if (message.action === "saveImage") {
    const { imageUrl, pageTitle } = message.data;

    const filename =
      (pageTitle || "image")
        .replace(/[^\w\d]+/g, "_")
        .toLowerCase()
        .slice(0, 40) +
      "_" +
      Date.now() +
      ".jpg";

    chrome.downloads.download(
      {
        url: imageUrl,
        filename: `${DEFAULT_FOLDER}/${filename}`,
        conflictAction: "uniquify",
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("❌ Download failed", chrome.runtime.lastError);
          sendResponse({ success: false });
        } else {
          log("Image saved →", `${DEFAULT_FOLDER}/${filename}`);
          sendResponse({ success: true, filename });
        }
      }
    );

    return true; // async response
  }

  // ---------- CREATE FOLDER ----------
  if (message.action === "createFolder") {
    const { name, color } = message;

    chrome.storage.local.get(["folders"], (res) => {
      const folders = res.folders || {};
      const id = crypto.randomUUID();

      folders[id] = {
        id,
        name,
        color,
        images: [],
        createdAt: Date.now(),
      };

      chrome.storage.local.set({ folders }, () => {
        log("Folder created:", name);
        sendResponse(folders[id]);
      });
    });

    return true;
  }

  // ---------- GET FOLDERS ----------
  if (message.action === "getFolders") {
    chrome.storage.local.get(["folders"], (res) => {
      sendResponse(Object.values(res.folders || {}));
    });
    return true;
  }
});