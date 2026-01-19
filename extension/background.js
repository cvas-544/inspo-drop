// Background service worker for Eagle Image Organizer
// Handles storage operations and communication between content scripts and popup

const DB_NAME = "eagle-image-organizer";
const DB_VERSION = 1;
const chrome = window.chrome; // Declare the chrome variable

let db = null;

// Initialize IndexedDB
async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains("folders")) {
        const foldersStore = database.createObjectStore("folders", {
          keyPath: "id",
        });
        foldersStore.createIndex("name", "name", { unique: false });
        foldersStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!database.objectStoreNames.contains("images")) {
        const imagesStore = database.createObjectStore("images", {
          keyPath: "id",
        });
        imagesStore.createIndex("folderId", "folderId", { unique: false });
        imagesStore.createIndex("savedAt", "savedAt", { unique: false });
      }
    };
  });
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));
  return true; // Keep channel open for async response
});

async function handleMessage(message) {
  const database = await initDB();

  switch (message.action) {
    case "getFolders":
      return getAllFolders(database);
    case "createFolder":
      return createFolder(database, message.name, message.color);
    case "saveImage":
      return saveImage(database, message.data);
    case "getImages":
      return getImages(database, message.folderId);
    case "deleteFolder":
      return deleteFolder(database, message.folderId);
    case "deleteImage":
      return deleteImage(database, message.imageId);
    default:
      throw new Error("Unknown action");
  }
}

async function getAllFolders(database) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("folders", "readonly");
    const store = transaction.objectStore("folders");
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const folders = request.result;
      folders.sort((a, b) => b.createdAt - a.createdAt);
      resolve(folders);
    };
  });
}

async function createFolder(database, name, color) {
  const folder = {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    color,
    createdAt: Date.now(),
    imageCount: 0,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction("folders", "readwrite");
    const store = transaction.objectStore("folders");
    const request = store.add(folder);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(folder);
  });
}

async function saveImage(database, data) {
  const image = {
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    folderId: data.folderId,
    imageUrl: data.imageUrl,
    sourceUrl: data.sourceUrl,
    pageTitle: data.pageTitle,
    domain: data.domain,
    savedAt: Date.now(),
    thumbnailData: data.thumbnailData,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(["images", "folders"], "readwrite");
    const imagesStore = transaction.objectStore("images");
    const foldersStore = transaction.objectStore("folders");

    const addRequest = imagesStore.add(image);

    addRequest.onerror = () => reject(addRequest.error);
    addRequest.onsuccess = () => {
      // Update folder image count
      const getRequest = foldersStore.get(data.folderId);
      getRequest.onsuccess = () => {
        const folder = getRequest.result;
        if (folder) {
          folder.imageCount = (folder.imageCount || 0) + 1;
          foldersStore.put(folder);
        }
        resolve(image);
      };
    };
  });
}

async function getImages(database, folderId) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("images", "readonly");
    const store = transaction.objectStore("images");
    let request;

    if (folderId) {
      const index = store.index("folderId");
      request = index.getAll(folderId);
    } else {
      request = store.getAll();
    }

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const images = request.result;
      images.sort((a, b) => b.savedAt - a.savedAt);
      resolve(images);
    };
  });
}

async function deleteFolder(database, folderId) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(["folders", "images"], "readwrite");
    const foldersStore = transaction.objectStore("folders");
    const imagesStore = transaction.objectStore("images");

    // Delete all images in the folder
    const index = imagesStore.index("folderId");
    const cursorRequest = index.openCursor(IDBKeyRange.only(folderId));

    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Delete the folder
    const deleteRequest = foldersStore.delete(folderId);
    deleteRequest.onerror = () => reject(deleteRequest.error);
    deleteRequest.onsuccess = () => resolve({ success: true });
  });
}

async function deleteImage(database, imageId) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(["images", "folders"], "readwrite");
    const imagesStore = transaction.objectStore("images");
    const foldersStore = transaction.objectStore("folders");

    // Get the image first to update folder count
    const getRequest = imagesStore.get(imageId);
    getRequest.onsuccess = () => {
      const image = getRequest.result;
      if (image) {
        // Delete the image
        const deleteRequest = imagesStore.delete(imageId);
        deleteRequest.onsuccess = () => {
          // Update folder count
          const folderRequest = foldersStore.get(image.folderId);
          folderRequest.onsuccess = () => {
            const folder = folderRequest.result;
            if (folder && folder.imageCount > 0) {
              folder.imageCount -= 1;
              foldersStore.put(folder);
            }
            resolve({ success: true });
          };
        };
        deleteRequest.onerror = () => reject(deleteRequest.error);
      } else {
        resolve({ success: false });
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  initDB();
});
