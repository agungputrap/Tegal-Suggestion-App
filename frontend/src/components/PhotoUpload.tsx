import { useState } from "react";
import { uploadProviderPhoto } from "../api";
import { BTN_SECONDARY } from "./ui";

type Props = {
  providerId: string;
  onUploaded: (photoUrl: string) => void;
};

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PhotoUpload({ providerId, onUploaded }: Props) {
  const [status, setStatus] = useState<"idle" | "uploading" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatus("error");
      setErrorMsg("Format harus JPEG, PNG, atau WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus("error");
      setErrorMsg("Ukuran foto maksimal 5MB");
      return;
    }

    setStatus("uploading");
    try {
      const photoUrl = await uploadProviderPhoto(providerId, file);
      onUploaded(photoUrl);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload gagal");
    }
  }

  return (
    <div>
      <label
        className={`${BTN_SECONDARY} cursor-pointer`}
        style={{ cursor: "pointer" }}
      >
        <i
          className={`fa-solid ${
            status === "uploading" ? "fa-spinner fa-spin" : "fa-camera"
          }`}
        ></i>
        <span>{status === "uploading" ? "Mengunggah..." : "Pilih foto"}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          style={{ display: "none" }}
          disabled={status === "uploading"}
        />
      </label>
      {status === "error" && (
        <p className="text-xs text-rose-500 mt-2">{errorMsg}</p>
      )}
    </div>
  );
}
