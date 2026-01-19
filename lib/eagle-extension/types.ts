// Types for the Eagle Image Organizer Extension

export interface Folder {
  id: string
  name: string
  color: string
  createdAt: number
  imageCount: number
}

export interface SavedImage {
  id: string
  folderId: string
  imageUrl: string
  sourceUrl: string
  pageTitle: string
  domain: string
  savedAt: number
  thumbnailData?: string
}

export interface DragImageData {
  imageUrl: string
  sourceUrl: string
  pageTitle: string
  domain: string
}

export const FOLDER_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
]
