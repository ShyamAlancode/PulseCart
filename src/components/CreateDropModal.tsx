"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { PlusCircle, Loader2, Sparkles, AlertCircle, CheckCircle, Upload, X } from "lucide-react";

export default function CreateDropModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [inventoryCount, setInventoryCount] = useState("");
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must be less than 5MB.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const queryParams = new URLSearchParams({
        filename: file.name,
        contentType: file.type,
      });
      const configRes = await fetch(`/api/upload?${queryParams.toString()}`);
      if (!configRes.ok) {
        throw new Error("Failed to initialize upload session.");
      }

      const configData = await configRes.json();

      if (configData.localFallback) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload image to local server.");
        }

        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          setImageUrl(uploadData.url);
        } else {
          throw new Error(uploadData.error || "Upload failed");
        }
      } else {
        const uploadRes = await fetch(configData.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload image to storage bucket.");
        }

        setImageUrl(configData.publicUrl);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Basic validation
    if (!title || !description || !price || !inventoryCount || !startTime || !endTime || !imageUrl) {
      setError("All fields are required.");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Price must be a positive number.");
      return;
    }

    const invNum = parseInt(inventoryCount, 10);
    if (isNaN(invNum) || invNum <= 0) {
      setError("Inventory count must be greater than 0.");
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      setError("End time must be after the start time.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert rupees to paise (e.g., 85.00 -> 8500)
      const priceInPaise = Math.round(priceNum * 100);

      const res = await fetch("/api/drops/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          price: priceInPaise,
          inventoryCount: invNum,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          imageUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to create drop. Please verify details.");
        setIsSubmitting(false);
        return;
      }

      // On Success
      setToastMessage(`Success! Drop "${title}" created successfully.`);
      setTimeout(() => setToastMessage(null), 4000);

      // Reset form
      setTitle("");
      setDescription("");
      setPrice("");
      setInventoryCount("");
      setImageUrl("");
      setStartTime("");
      setEndTime("");
      setUploadError(null);
      setIsUploading(false);

      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Error creating drop:", err);
      setError("A connection error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to autofill fields for fast sandbox testing
  const fillDemoData = (minutesFromNow: number) => {
    const start = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

    const formatDateTime = (d: Date) => {
      const offsetMs = d.getTimezoneOffset() * 60 * 1000;
      const local = new Date(d.getTime() - offsetMs);
      return local.toISOString().slice(0, 16);
    };

    setTitle(`Limited Cyber Jersey ${Math.floor(Math.random() * 900 + 100)}`);
    setDescription("Ultra premium cyberpunk design with integrated LED-reactive stitchings. Extremely limited drop size.");
    setPrice("1250.00");
    setInventoryCount("50");
    setImageUrl("https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&auto=format&fit=crop&q=80");
    setStartTime(formatDateTime(start));
    setEndTime(formatDateTime(end));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="btn-shimmer text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all select-none active:scale-[0.98] shadow-lg shadow-purple-500/20 cursor-pointer flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Create New Drop
          </button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provision Flash Drop</DialogTitle>
            <DialogDescription>
              Launch a limited product drop backed by DynamoDB atomic isolation layers.
            </DialogDescription>
          </DialogHeader>

          {/* Sandbox seed bar */}
          <div className="mb-6 bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center justify-between gap-4">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Demo Autofill</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillDemoData(-2)}
                className="text-[10px] font-bold px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer"
              >
                Active (Starts Now)
              </button>
              <button
                type="button"
                onClick={() => fillDemoData(5)}
                className="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all cursor-pointer"
              >
                Upcoming (+5m)
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Product Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Signature Cyber Bomber"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Description */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Description</label>
                <textarea
                  required
                  placeholder="Describe your limited drop product..."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Price */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Price (INR / ₹)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 1999.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Stock */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Inventory Count</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="e.g. 50"
                  value={inventoryCount}
                  onChange={(e) => setInventoryCount(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Image URL & File Upload */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Product Image</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* File Upload Zone */}
                  <div className="relative group border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors min-h-[120px]">
                    {isUploading ? (
                      <div className="flex flex-col items-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                        <span className="text-xs text-zinc-400 font-medium">Uploading image...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-zinc-500 group-hover:text-zinc-400 mb-2 transition-colors" />
                        <span className="text-xs text-zinc-300 font-semibold mb-1">Upload image file</span>
                        <span className="text-[10px] text-zinc-500">Drag & drop or click to browse (Max 5MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </>
                    )}
                  </div>

                  {/* URL Input and Preview */}
                  <div className="flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider block">Or Paste URL</span>
                      <input
                        type="url"
                        required
                        placeholder="https://images.unsplash.com/..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Preview Image */}
                    {imageUrl && (
                      <div className="relative h-16 w-full rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-950 flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageUrl}
                            alt="Preview"
                            className="h-10 w-10 object-cover rounded-lg border border-zinc-800"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80";
                            }}
                          />
                          <div className="flex flex-col truncate max-w-[140px]">
                            <span className="text-[10px] text-zinc-300 font-semibold truncate">Image Selected</span>
                            <span className="text-[9px] text-zinc-500 truncate font-mono">{imageUrl}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {uploadError && (
                  <span className="text-[10px] text-red-400 font-semibold block mt-1">{uploadError}</span>
                )}
              </div>

              {/* Start Time */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none transition-colors text-zinc-300"
                />
              </div>

              {/* End Time */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none transition-colors text-zinc-300"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 btn-shimmer py-3 px-4 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Deploy Drop
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Floating Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-zinc-900 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)] animate-pulse">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
