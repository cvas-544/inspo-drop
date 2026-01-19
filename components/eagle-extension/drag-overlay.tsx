"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Plus, FolderPlus, Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Folder, DragImageData } from "@/lib/eagle-extension/types"
import { FOLDER_COLORS } from "@/lib/eagle-extension/types"
import {
  getAllFolders,
  createFolder,
  saveImage,
  generateThumbnail,
} from "@/lib/eagle-extension/storage"

interface DragOverlayProps {
  isVisible: boolean
  dragData: DragImageData | null
  onClose: () => void
  onSaveSuccess: (folder: Folder) => void
}

export function DragOverlay({
  isVisible,
  dragData,
  onClose,
  onSaveSuccess,
}: DragOverlayProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0])
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const loadFolders = useCallback(async () => {
    const loadedFolders = await getAllFolders()
    setFolders(loadedFolders)
  }, [])

  useEffect(() => {
    if (isVisible) {
      loadFolders()
      setIsCreating(false)
      setNewFolderName("")
      setSaving(null)
      setSaved(null)
    }
  }, [isVisible, loadFolders])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    const folder = await createFolder(newFolderName.trim(), selectedColor)
    setFolders((prev) => [folder, ...prev])
    setIsCreating(false)
    setNewFolderName("")
    setSelectedColor(FOLDER_COLORS[0])
  }

  const handleSaveToFolder = async (folder: Folder) => {
    if (!dragData || saving) return

    setSaving(folder.id)
    try {
      const thumbnail = await generateThumbnail(dragData.imageUrl)
      await saveImage(
        folder.id,
        dragData.imageUrl,
        dragData.sourceUrl,
        dragData.pageTitle,
        dragData.domain,
        thumbnail
      )
      setSaved(folder.id)
      onSaveSuccess(folder)
      setTimeout(() => {
        onClose()
      }, 600)
    } catch (error) {
      console.error("Failed to save image:", error)
      setSaving(null)
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-neutral-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Save Image</h2>
              <p className="text-xs text-neutral-500">Select a folder or create new</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Image Preview */}
        {dragData && (
          <div className="px-5 py-4 border-b border-neutral-100">
            <div className="flex items-center gap-4">
              <div className="w-20 h-14 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dragData.imageUrl || "/placeholder.svg"}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {dragData.pageTitle || "Untitled"}
                </p>
                <p className="text-xs text-neutral-500 truncate">{dragData.domain}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {/* Create New Folder */}
          {isCreating ? (
            <div className="mb-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                autoFocus
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
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
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

          {/* Folder List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {folders.length === 0 && !isCreating ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3">
                  <FolderPlus className="w-6 h-6 text-neutral-400" />
                </div>
                <p className="text-sm text-neutral-500">No folders yet</p>
                <p className="text-xs text-neutral-400 mt-1">Create your first folder above</p>
              </div>
            ) : (
              folders.map((folder) => {
                const isSaving = saving === folder.id
                const isSaved = saved === folder.id

                return (
                  <button
                    key={folder.id}
                    onClick={() => handleSaveToFolder(folder)}
                    disabled={!!saving}
                    className={cn(
                      "w-full px-4 py-3 flex items-center gap-3 rounded-xl border transition-all",
                      isSaved
                        ? "border-green-500 bg-green-50"
                        : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50",
                      saving && !isSaving && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${folder.color}20` }}
                    >
                      {isSaved ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: folder.color }}
                        />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {folder.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {folder.imageCount || 0} image{folder.imageCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
