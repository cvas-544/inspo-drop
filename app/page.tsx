"use client"

import React from "react"

import { useState, useEffect, useCallback } from "react"
import { DragOverlay } from "@/components/eagle-extension/drag-overlay"
import { PopupPanel } from "@/components/eagle-extension/popup-panel"
import type { DragImageData, Folder } from "@/lib/eagle-extension/types"
import { initDB } from "@/lib/eagle-extension/storage"
import { ExternalLink, GripVertical, Download, Github, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"

const sampleImages = [
  {
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop",
    title: "Modern Architecture",
    source: "unsplash.com",
  },
  {
    url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop",
    title: "Contemporary Home",
    source: "unsplash.com",
  },
  {
    url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop",
    title: "Minimal Interior",
    source: "unsplash.com",
  },
  {
    url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=400&fit=crop",
    title: "Luxury Villa",
    source: "unsplash.com",
  },
  {
    url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=400&fit=crop",
    title: "Dream House",
    source: "unsplash.com",
  },
  {
    url: "https://images.unsplash.com/photo-1494526585095-c41746248156?w=600&h=400&fit=crop",
    title: "Urban Living",
    source: "unsplash.com",
  },
  {
    url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&h=400&fit=crop",
    title: "Scandinavian Design",
    source: "unsplash.com",
  },
  {
    url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&h=400&fit=crop",
    title: "Open Space",
    source: "unsplash.com",
  },
]

export default function DemoPage() {
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [dragData, setDragData] = useState<DragImageData | null>(null)
  const [savedNotification, setSavedNotification] = useState<string | null>(null)

  useEffect(() => {
    initDB()
  }, [])

  const handleDragStart = useCallback(
    (e: React.DragEvent, image: (typeof sampleImages)[0]) => {
      setDragData({
        imageUrl: image.url,
        sourceUrl: `https://${image.source}`,
        pageTitle: image.title,
        domain: image.source,
      })
    },
    []
  )

  const handleDragEnd = useCallback(() => {
    if (dragData) {
      setOverlayVisible(true)
    }
  }, [dragData])

  const handleCloseOverlay = useCallback(() => {
    setOverlayVisible(false)
    setDragData(null)
  }, [])

  const handleSaveSuccess = useCallback((folder: Folder) => {
    setSavedNotification(`Saved to "${folder.name}"`)
    setTimeout(() => setSavedNotification(null), 2000)
  }, [])

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-neutral-900">
                  Eagle Image Organizer
                </h1>
                <p className="text-xs text-neutral-500">Cross-browser extension demo</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                  <Github className="w-4 h-4" />
                  View Source
                </a>
              </Button>
              <Button size="sm">
                <Download className="w-4 h-4" />
                Download Extension
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Grid Demo */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100">
                <h2 className="text-lg font-semibold text-neutral-900">
                  Inspiration Feed
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Drag any image to save it to a folder
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {sampleImages.map((image, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, image)}
                      onDragEnd={handleDragEnd}
                      className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing bg-neutral-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url || "/placeholder.svg"}
                        alt={image.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        crossOrigin="anonymous"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-medium">{image.title}</p>
                          <p className="text-white/70 text-xs">{image.source}</p>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center text-neutral-600">
                          <GripVertical className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="mt-8 bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100">
                <h2 className="text-lg font-semibold text-neutral-900">How It Works</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold text-neutral-400">1</span>
                    </div>
                    <h3 className="font-semibold text-neutral-900 mb-2">Drag an Image</h3>
                    <p className="text-sm text-neutral-500">
                      Click and drag any image from websites like Instagram, Pinterest, or
                      Behance
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold text-neutral-400">2</span>
                    </div>
                    <h3 className="font-semibold text-neutral-900 mb-2">Select a Folder</h3>
                    <p className="text-sm text-neutral-500">
                      Release the image and choose an existing folder or create a new one
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold text-neutral-400">3</span>
                    </div>
                    <h3 className="font-semibold text-neutral-900 mb-2">Stay Organized</h3>
                    <p className="text-sm text-neutral-500">
                      Access your saved images anytime from the extension popup
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mt-8 bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100">
                <h2 className="text-lg font-semibold text-neutral-900">Features</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      title: "Cross-Browser",
                      desc: "Works on Chrome, Edge, Brave, Arc, and more",
                    },
                    {
                      title: "Manifest V3",
                      desc: "Built with the latest extension standards",
                    },
                    {
                      title: "Local Storage",
                      desc: "Your images are stored locally with IndexedDB",
                    },
                    {
                      title: "Fast & Minimal",
                      desc: "Lightweight overlay that won't slow you down",
                    },
                    {
                      title: "Source Tracking",
                      desc: "Automatically saves source URL and metadata",
                    },
                    {
                      title: "Shadow DOM",
                      desc: "Isolated UI that won't conflict with websites",
                    },
                  ].map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-xl bg-neutral-50"
                    >
                      <div className="w-2 h-2 rounded-full bg-neutral-900 mt-2 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-neutral-900">{feature.title}</h3>
                        <p className="text-sm text-neutral-500">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Popup Panel Demo */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="mb-4">
                <h2 className="text-sm font-medium text-neutral-500 mb-2">
                  Extension Popup Preview
                </h2>
              </div>
              <PopupPanel className="w-full h-[600px] shadow-xl" />

              {/* Compatible Browsers */}
              <div className="mt-6 p-4 rounded-xl bg-white border border-neutral-200">
                <h3 className="text-sm font-medium text-neutral-900 mb-3">
                  Compatible Browsers
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["Chrome", "Edge", "Brave", "Arc", "Opera", "Vivaldi"].map(
                    (browser) => (
                      <span
                        key={browser}
                        className="px-3 py-1.5 rounded-lg bg-neutral-100 text-xs font-medium text-neutral-600"
                      >
                        {browser}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-neutral-500">
              Inspired by{" "}
              <a
                href="https://en.eagle.cool/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-900 hover:underline inline-flex items-center gap-1"
              >
                Eagle App
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <p className="text-sm text-neutral-400">
              Built with WebExtension APIs for cross-browser compatibility
            </p>
          </div>
        </div>
      </footer>

      {/* Drag Overlay */}
      <DragOverlay
        isVisible={overlayVisible}
        dragData={dragData}
        onClose={handleCloseOverlay}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Save Notification */}
      {savedNotification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          {savedNotification}
        </div>
      )}
    </div>
  )
}
