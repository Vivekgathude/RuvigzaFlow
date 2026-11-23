
import React, { useEffect, useRef, useState } from "react";
import { Camera, Trash2, User, LoaderCircle } from "lucide-react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

const BUCKET = "profile-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ProfilePicture({
  size = 34,
  editable = true,
  onUpdated,
}) {
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);

  const [photoUrl, setPhotoUrl] = useState("");
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const photoPath = currentUser?.profilePicturePath || null;
  const authUserId = currentUser?.authUserId;

  useEffect(() => {
    let cancelled = false;

    async function loadPhoto() {
      setPhotoUrl("");

      if (!photoPath) return;

      setLoadingPhoto(true);

      try {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(photoPath, 60 * 60);

        if (error) throw error;

        if (!cancelled) {
          setPhotoUrl(data?.signedUrl || "");
        }
      } catch (error) {
        console.error("Profile photo load error:", error);
      } finally {
        if (!cancelled) setLoadingPhoto(false);
      }
    }

    loadPhoto();

    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  async function refreshSignedUrl(path) {
    if (!path) {
      setPhotoUrl("");
      return;
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);

    if (error) throw error;

    setPhotoUrl(data?.signedUrl || "");
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setErrorMessage("");

    if (!authUserId) {
      setErrorMessage("Login session not found. Please log in again.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Please select a JPG, PNG or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("Photo must be 5 MB or smaller.");
      return;
    }

    const extensionByType = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    const extension = extensionByType[file.type];
    const newPath = `${authUserId}/avatar-${Date.now()}.${extension}`;

    setUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: updatedRows, error: updateError } = await supabase
        .from("team_members")
        .update({ profile_picture_path: newPath })
        .eq("auth_user_id", authUserId)
        .select("id");

      if (updateError) {
        await supabase.storage.from(BUCKET).remove([newPath]);
        throw updateError;
      }

      if (!updatedRows?.length) {
        await supabase.storage.from(BUCKET).remove([newPath]);
        throw new Error(
          "Profile was not updated. Check team_members update permissions."
        );
      }

      await refreshSignedUrl(newPath);

      if (onUpdated) {
        await onUpdated(newPath);
      }

      setMenuOpen(false);
    } catch (error) {
      console.error("Profile photo upload error:", error);
      setErrorMessage(error.message || "Unable to upload photo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    if (!authUserId || !photoPath) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove your profile photo?"
    );

    if (!confirmed) return;

    setErrorMessage("");
    setUploading(true);

    try {
      const { data: updatedRows, error: updateError } = await supabase
        .from("team_members")
        .update({ profile_picture_path: null })
        .eq("auth_user_id", authUserId)
        .select("id");

      if (updateError) throw updateError;

      if (!updatedRows?.length) {
        throw new Error(
          "Profile was not updated. Check team_members update permissions."
        );
      }

      setPhotoUrl("");

      if (onUpdated) {
        await onUpdated(null);
      }

      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove([photoPath]);

      if (removeError) {
        console.error("Old photo cleanup error:", removeError);
      }

      setMenuOpen(false);
    } catch (error) {
      console.error("Profile photo remove error:", error);
      setErrorMessage(error.message || "Unable to remove photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{
        position: "relative",
        width: size,
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (editable) setMenuOpen((open) => !open);
        }}
        disabled={uploading || loadingPhoto}
        title={editable ? "Manage profile photo" : "Profile photo"}
        aria-label="Profile photo"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          padding: 0,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.16)",
          background: "#1E293B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: editable ? "pointer" : "default",
          position: "relative",
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Profile"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : loadingPhoto || uploading ? (
          <LoaderCircle
            size={Math.max(16, size * 0.48)}
            color="#CBD5E1"
          />
        ) : (
          <User
            size={Math.max(16, size * 0.48)}
            color="#CBD5E1"
          />
        )}

        {editable && (
          <span
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: Math.max(13, size * 0.38),
              height: Math.max(13, size * 0.38),
              borderRadius: "50%",
              background: "#00A8FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #0B1220",
            }}
          >
            <Camera size={Math.max(8, size * 0.22)} color="#fff" />
          </span>
        )}
      </button>

      {editable && menuOpen && (
        <div
          style={{
            position: "absolute",
            bottom: size + 8,
            left: 0,
            zIndex: 3000,
            width: 190,
            padding: 8,
            borderRadius: 10,
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            color: "#0F172A",
          }}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={menuButtonStyle}
          >
            <Camera size={15} />
            {photoPath ? "Change photo" : "Upload photo"}
          </button>

          {photoPath && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={uploading}
              style={{
                ...menuButtonStyle,
                color: "#DC2626",
              }}
            >
              <Trash2 size={15} />
              Remove photo
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setErrorMessage("");
            }}
            style={menuButtonStyle}
          >
            Cancel
          </button>

          {uploading && (
            <div style={{ fontSize: 11, padding: "7px 8px", color: "#64748B" }}>
              Saving photo...
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              style={{
                fontSize: 11,
                lineHeight: 1.5,
                color: "#B91C1C",
                padding: "7px 8px",
                overflowWrap: "anywhere",
              }}
            >
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}

const menuButtonStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "9px 8px",
  border: "none",
  borderRadius: 6,
  background: "transparent",
  cursor: "pointer",
  color: "#0F172A",
  fontSize: 12,
  textAlign: "left",
};
