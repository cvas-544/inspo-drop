// Storage utilities for the Eagle Image Organizer Extension
// Uses IndexedDB for persistent local storage

import type { Folder, SavedImage } from "./types"

const DB_NAME = "eagle-image-organizer"
const DB_VERSION = 1
const FOLDERS_STORE = "folders"
const IMAGES_STORE = "images"

let db: IDBDatabase | null = null

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Create folders store
      if (!database.objectStoreNames.contains(FOLDERS_STORE)) {
        const foldersStore = database.createObjectStore(FOLDERS_STORE, {
          keyPath: "id",
        })
        foldersStore.createIndex("name", "name", { unique: false })
        foldersStore.createIndex("createdAt", "createdAt", { unique: false })
      }

      // Create images store
      if (!database.objectStoreNames.contains(IMAGES_STORE)) {
        const imagesStore = database.createObjectStore(IMAGES_STORE, {
          keyPath: "id",
        })
        imagesStore.createIndex("folderId", "folderId", { unique: false })
        imagesStore.createIndex("savedAt", "savedAt", { unique: false })
        imagesStore.createIndex("domain", "domain", { unique: false })
      }
    }
  })
}

// Folder operations
export async function getAllFolders(): Promise<Folder[]> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(FOLDERS_STORE, "readonly")
    const store = transaction.objectStore(FOLDERS_STORE)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const folders = request.result as Folder[]
      // Sort by creation date, newest first
      folders.sort((a, b) => b.createdAt - a.createdAt)
      resolve(folders)
    }
  })
}

export async function createFolder(name: string, color: string): Promise<Folder> {
  const database = await initDB()
  const folder: Folder = {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    color,
    createdAt: Date.now(),
    imageCount: 0,
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(FOLDERS_STORE, "readwrite")
    const store = transaction.objectStore(FOLDERS_STORE)
    const request = store.add(folder)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(folder)
  })
}

export async function updateFolder(folder: Folder): Promise<void> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(FOLDERS_STORE, "readwrite")
    const store = transaction.objectStore(FOLDERS_STORE)
    const request = store.put(folder)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function deleteFolder(folderId: string): Promise<void> {
  const database = await initDB()

  // First delete all images in the folder
  const images = await getImagesByFolder(folderId)
  for (const image of images) {
    await deleteImage(image.id)
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(FOLDERS_STORE, "readwrite")
    const store = transaction.objectStore(FOLDERS_STORE)
    const request = store.delete(folderId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// Image operations
export async function getAllImages(): Promise<SavedImage[]> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGES_STORE, "readonly")
    const store = transaction.objectStore(IMAGES_STORE)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const images = request.result as SavedImage[]
      images.sort((a, b) => b.savedAt - a.savedAt)
      resolve(images)
    }
  })
}

export async function getImagesByFolder(folderId: string): Promise<SavedImage[]> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGES_STORE, "readonly")
    const store = transaction.objectStore(IMAGES_STORE)
    const index = store.index("folderId")
    const request = index.getAll(folderId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const images = request.result as SavedImage[]
      images.sort((a, b) => b.savedAt - a.savedAt)
      resolve(images)
    }
  })
}

export async function saveImage(
  folderId: string,
  imageUrl: string,
  sourceUrl: string,
  pageTitle: string,
  domain: string,
  thumbnailData?: string
): Promise<SavedImage> {
  const database = await initDB()
  const image: SavedImage = {
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    folderId,
    imageUrl,
    sourceUrl,
    pageTitle,
    domain,
    savedAt: Date.now(),
    thumbnailData,
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGES_STORE, "readwrite")
    const store = transaction.objectStore(IMAGES_STORE)
    const request = store.add(image)

    request.onerror = () => reject(request.error)
    request.onsuccess = async () => {
      // Update folder image count
      const folders = await getAllFolders()
      const folder = folders.find((f) => f.id === folderId)
      if (folder) {
        folder.imageCount = (folder.imageCount || 0) + 1
        await updateFolder(folder)
      }
      resolve(image)
    }
  })
}

export async function deleteImage(imageId: string): Promise<void> {
  const database = await initDB()

  // Get the image first to update folder count
  const allImages = await getAllImages()
  const image = allImages.find((img) => img.id === imageId)

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGES_STORE, "readwrite")
    const store = transaction.objectStore(IMAGES_STORE)
    const request = store.delete(imageId)

    request.onerror = () => reject(request.error)
    request.onsuccess = async () => {
      // Update folder image count
      if (image) {
        const folders = await getAllFolders()
        const folder = folders.find((f) => f.id === image.folderId)
        if (folder && folder.imageCount > 0) {
          folder.imageCount = folder.imageCount - 1
          await updateFolder(folder)
        }
      }
      resolve()
    }
  })
}

// Utility to generate thumbnail data URL from image URL
export async function generateThumbnail(imageUrl: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        const maxSize = 200
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL("image/jpeg", 0.7))
        } else {
          resolve(undefined)
        }
      } catch {
        resolve(undefined)
      }
    }
    img.onerror = () => resolve(undefined)
    img.src = imageUrl
  })
}
