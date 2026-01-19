"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search,
  FolderOpen,
  Trash2,
  ExternalLink,
  ChevronLeft,
  MoreHorizontal,
  Plus,
  Grid3X3,
  List,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Folder, SavedImage } from "@/lib/eagle-extension/types"
import { FOLDER_COLORS } from "@/lib/eagle-extension/types"
import {
  getAllFolders,
  getAllImages,
  getImagesByFolder,
  createFolder,
  deleteFolder,
  deleteImage,
  initDB,
} from "@/lib/eagle-extension/storage"

interface PopupPanelProps {
  className?: string
}

type ViewMode = "folders" | "folder-detail" | "all-images"

export function PopupPanel({ className }: PopupPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("folders")
  const [folders, setFolders] = useState<Folder[]>([])
  const [images, setImages] = useState<SavedImage[]>([])
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isGridView, setIsGridView] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0])
  const [contextMenu, setContextMenu] = useState<{ id: string; type: "folder" | "image" } | null>(null)

  const loadData = useCallback(async () => {
    await initDB()
    const loadedFolders = await getAllFolders()
    setFolders(loadedFolders)
    const loadedImages = await getAllImages()
    setImages(loadedImages)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleViewFolder = async (folder: Folder) => {
    setSelectedFolder(folder)
    const folderImages = await getImagesByFolder(folder.id)
    setImages(folderImages)
    setViewMode("folder-detail")
  }

  const handleBack = async () => {
    setSelectedFolder(null)
    const loadedImages = await getAllImages()
    setImages(loadedImages)
    setViewMode("folders")
  }

  const handleViewAllImages = async () => {
    const loadedImages = await getAllImages()
    setImages(loadedImages)
    setViewMode("all-images")
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    const folder = await createFolder(newFolderName.trim(), selectedColor)
    setFolders((prev) => [folder, ...prev])
    setIsCreating(false)
    setNewFolderName("")
    setSelectedColor(FOLDER_COLORS[0])
  }

  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolder(folderId)
    setFolders((prev) => prev.filter((f) => f.id !== folderId))
    setContextMenu(null)
  }

  const handleDeleteImage = async (imageId: string) => {
    await deleteImage(imageId)
    setImages((prev) => prev.filter((img) => img.id !== imageId))
    await loadData()
    setContextMenu(null)
  }

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredImages = images.filter(
    (img) =>
      img.pageTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.domain.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalImages = folders.reduce((acc, f) => acc + (f.imageCount || 0), 0)

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-3">
        {viewMode !== "folders" && (
          <button
            onClick={handleBack}
            className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-neutral-600" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-neutral-900">
            {viewMode === "folders" && "My Collections"}
            {viewMode === "folder-detail" && selectedFolder?.name}
            {viewMode === "all-images" && "All Images"}
          </h1>
          <p className="text-xs text-neutral-500">
            {viewMode === "folders" && `${folders.length} folders, ${totalImages} images`}
            {viewMode === "folder-detail" && `${images.length} images`}
            {viewMode === "all-images" && `${images.length} images`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsGridView(true)}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              isGridView ? "bg-neutral-100 text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsGridView(false)}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              !isGridView ? "bg-neutral-100 text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-neutral-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === "folders" && (
          <>
            {/* Quick Actions */}
            <div className="mb-4">
              <button
                onClick={handleViewAllImages}
                className="w-full px-4 py-3 flex items-center gap-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-neutral-200 flex items-center justify-center">
                  <Grid3X3 className="w-5 h-5 text-neutral-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-neutral-900">All Images</p>
                  <p className="text-xs text-neutral-500">{totalImages} saved</p>
                </div>
              </button>
            </div>

            {/* Create Folder */}
            {isCreating ? (
              <div className="mb-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  autoFocus
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder()
                    if (e.key === "Escape") setIsCreating(false)
                  }}
                />
                <div className="flex items-center gap-2 mt-3">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "w-6 h-6 rounded-full transition-all",
                        selectedColor === color && "ring-2 ring-offset-2 ring-neutral-900"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full mb-4 px-4 py-3 flex items-center gap-3 rounded-xl border-2 border-dashed border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="text-sm font-medium">Create new folder</span>
              </button>
            )}

            {/* Folder Grid */}
            <div className={cn(isGridView ? "grid grid-cols-2 gap-3" : "space-y-2")}>
              {filteredFolders.map((folder) => (
                <div key={folder.id} className="relative group">
                  <button
                    onClick={() => handleViewFolder(folder)}
                    className={cn(
                      "w-full text-left transition-all",
                      isGridView
                        ? "p-4 rounded-xl bg-neutral-50 hover:bg-neutral-100"
                        : "px-4 py-3 flex items-center gap-3 rounded-xl hover:bg-neutral-50"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-xl flex items-center justify-center",
                        isGridView ? "w-12 h-12 mb-3" : "w-10 h-10"
                      )}
                      style={{ backgroundColor: `${folder.color}20` }}
                    >
                      <FolderOpen
                        className={cn(isGridView ? "w-6 h-6" : "w-5 h-5")}
                        style={{ color: folder.color }}
                      />
                    </div>
                    <div className={cn(!isGridView && "flex-1")}>
                      <p className="text-sm font-medium text-neutral-900 truncate">{folder.name}</p>
                      <p className="text-xs text-neutral-500">
                        {folder.imageCount || 0} image{folder.imageCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => setContextMenu({ id: folder.id, type: "folder" })}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/80 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <MoreHorizontal className="w-4 h-4 text-neutral-500" />
                  </button>
                  {contextMenu?.id === folder.id && contextMenu?.type === "folder" && (
                    <div className="absolute top-10 right-2 z-10 w-36 py-1 bg-white rounded-lg shadow-lg border border-neutral-200">
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete folder
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredFolders.length === 0 && !isCreating && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3">
                  <FolderOpen className="w-6 h-6 text-neutral-400" />
                </div>
                <p className="text-sm text-neutral-500">No folders found</p>
              </div>
            )}
          </>
        )}

        {(viewMode === "folder-detail" || viewMode === "all-images") && (
          <div className={cn(isGridView ? "grid grid-cols-2 gap-3" : "space-y-2")}>
            {filteredImages.map((image) => (
              <div key={image.id} className="relative group">
                {isGridView ? (
                  <div className="rounded-xl overflow-hidden bg-neutral-100 aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.thumbnailData || image.imageUrl}
                      alt={image.pageTitle}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="px-4 py-3 flex items-center gap-3 rounded-xl hover:bg-neutral-50">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.thumbnailData || image.imageUrl}
                        alt={image.pageTitle}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {image.pageTitle || "Untitled"}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{image.domain}</p>
                    </div>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={image.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-600" />
                  </a>
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="w-7 h-7 rounded-lg bg-white/90 hover:bg-red-50 flex items-center justify-center shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(viewMode === "folder-detail" || viewMode === "all-images") &&
          filteredImages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3">
                <Grid3X3 className="w-6 h-6 text-neutral-400" />
              </div>
              <p className="text-sm text-neutral-500">No images yet</p>
              <p className="text-xs text-neutral-400 mt-1">
                Drag images from websites to save them here
              </p>
            </div>
          )}
      </div>
    </div>
  )
}
