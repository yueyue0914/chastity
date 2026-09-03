import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

type PhotoVerifyProps = {
  busy?: boolean;
  onSubmit: (dataUrl: string) => Promise<void>;
};

export function PhotoVerify({ busy, onSubmit }: PhotoVerifyProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch {
      setError("无法打开摄像头，请检查权限");
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    const w = 320;
    const h = Math.round((video.videoHeight / video.videoWidth) * w) || 240;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
    const stream = video.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    setStreaming(false);
    await onSubmit(dataUrl);
  }

  return (
    <div className="space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
      <div className="flex items-center gap-2 text-sm text-fg">
        <Camera className="size-4 text-warn" />
        钥匙要求拍照验证
      </div>
      <video
        ref={videoRef}
        className="aspect-video w-full rounded-lg bg-bg object-cover"
        playsInline
        muted
      />
      {error ? <p className="text-xs text-warn">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy || streaming}
          onClick={() => void startCamera()}
        >
          打开摄像头
        </Button>
        <Button
          type="button"
          disabled={busy || !streaming}
          onClick={() => void capture()}
        >
          拍照提交
        </Button>
      </div>
    </div>
  );
}
