import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, 
  X, 
  FlipHorizontal, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { playSuccessChime } from '../utils/soundUtils';

interface StudentPhotoCaptureModalProps {
  isOpen: boolean;
  studentName?: string;
  holyName?: string;
  onPhotoCaptured: (dataUrl: string) => void;
  onClose: () => void;
}

export const StudentPhotoCaptureModal: React.FC<StudentPhotoCaptureModalProps> = ({
  isOpen,
  studentName,
  holyName,
  onPhotoCaptured,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [cameraRestartCount, setCameraRestartCount] = useState<number>(0);
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);

  // Start Camera Stream
  useEffect(() => {
    if (!isOpen || capturedDataUrl) return;

    let currentStream: MediaStream | null = null;
    let isMounted = true;

    async function startCamera() {
      setIsCameraLoading(true);
      setCameraError(null);

      try {
        if (!navigator?.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setIsCameraActive(false);
          setIsCameraLoading(false);
          setCameraError('Trình duyệt không hỗ trợ truy cập máy ảnh trực tiếp (getUserMedia). Vui lòng dùng tính năng Tải File Ảnh Lên.');
          return;
        }

        let stream: MediaStream | null = null;

        // Try facingMode ideal first
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback to generic video
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } catch (err: any) {
            console.warn('Camera access failed:', err);
            throw err;
          }
        }

        currentStream = stream;

        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        if (videoRef.current) {
          const video = videoRef.current;
          video.muted = true;
          video.defaultMuted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.srcObject = stream;

          await new Promise<void>((resolve) => {
            let done = false;
            const finish = () => {
              if (!done) {
                done = true;
                resolve();
              }
            };
            if (video.readyState >= 1) return finish();
            video.onloadedmetadata = finish;
            video.oncanplay = finish;
            setTimeout(finish, 800);
          });

          await video.play().catch(e => console.warn('Play error:', e));

          if (isMounted) {
            setIsCameraActive(true);
            setIsCameraLoading(false);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setIsCameraActive(false);
        setIsCameraLoading(false);
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setCameraError('Quyền truy cập Camera bị từ chối. Vui lòng cho phép quyền Camera trên thanh địa chỉ trình duyệt, hoặc dùng tính năng Tải File Ảnh Lên.');
        } else if (err?.name === 'NotFoundError') {
          setCameraError('Không tìm thấy thiết bị Camera trên máy.');
        } else {
          setCameraError('Không thể mở Camera. Vui lòng thử lại hoặc chọn Tải File Ảnh Lên.');
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, facingMode, cameraRestartCount, capturedDataUrl]);

  if (!isOpen) return null;

  // Take snapshot and crop to standard 3x4 portrait aspect ratio
  const handleSnap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    if (!vWidth || !vHeight) return;

    // Visual shutter flash effect
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 200);

    // Audio chime feedback
    try {
      playSuccessChime(false);
    } catch {
      // Audio fallback
    }

    // Standard 3:4 portrait dimensions (360x480 for crisp avatar quality)
    const targetWidth = 360;
    const targetHeight = 480;
    const targetAspect = targetWidth / targetHeight; // 0.75

    let cropWidth = vWidth;
    let cropHeight = vHeight;
    let cropX = 0;
    let cropY = 0;

    const videoAspect = vWidth / vHeight;

    if (videoAspect > targetAspect) {
      // Video is wider than 3:4 -> crop sides
      cropWidth = vHeight * targetAspect;
      cropX = (vWidth - cropWidth) / 2;
    } else {
      // Video is taller than 3:4 -> crop top & bottom
      cropHeight = vWidth / targetAspect;
      cropY = (vHeight - cropHeight) / 2;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If using user (selfie) camera, mirror horizontally for natural feel
    if (facingMode === 'user') {
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedDataUrl(dataUrl);

    // Stop video tracks to turn off camera light
    if (video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    setCameraRestartCount(c => c + 1);
  };

  const handleAcceptPhoto = () => {
    if (capturedDataUrl) {
      onPhotoCaptured(capturedDataUrl);
      onClose();
    }
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md my-auto border border-slate-700 overflow-hidden flex flex-col text-white">
        
        {/* Modal Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Chụp Ảnh Thẻ Trực Tiếp (3x4)
              </h3>
              <p className="text-[11px] text-slate-400">
                {studentName ? `${holyName ? holyName + ' ' : ''}${studentName}` : 'Hồ sơ thiếu nhi giáo lý'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            title="Đóng cửa sổ chụp ảnh"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Camera Viewfinder or Snapshot Preview */}
        <div className="p-4 flex flex-col items-center justify-center bg-slate-950">
          <canvas ref={canvasRef} className="hidden" />

          {capturedDataUrl ? (
            /* PREVIEW OF CAPTURED SNAPSHOT */
            <div className="flex flex-col items-center space-y-3 py-2 animate-in zoom-in-95 duration-150">
              <div className="relative w-48 h-64 rounded-xl overflow-hidden border-3 border-emerald-400 shadow-2xl bg-black">
                <img 
                  src={capturedDataUrl} 
                  alt="Ảnh vừa chụp" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-emerald-600 text-white p-1 rounded-full shadow-md">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>

              <div className="text-center space-y-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold">
                  <Sparkles className="w-3 h-3" />
                  Ảnh thẻ tỷ lệ chuẩn 3x4
                </span>
                <p className="text-xs text-slate-300">
                  Xem lại ảnh chân dung của học sinh. Bạn có thể chụp lại hoặc chấp nhận lưu ảnh.
                </p>
              </div>

              {/* Action Buttons for Preview */}
              <div className="flex items-center gap-3 pt-2 w-full">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Chụp Lại</span>
                </button>

                <button
                  type="button"
                  onClick={handleAcceptPhoto}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Sử Dụng Ảnh Này</span>
                </button>
              </div>
            </div>
          ) : (
            /* LIVE CAMERA STREAM VIEW */
            <div className="w-full flex flex-col items-center">
              {/* Controls bar above camera: Switch camera / Reload */}
              <div className="w-full max-w-sm mb-2 flex items-center justify-between text-xs px-1">
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Đổi camera trước / sau"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>{facingMode === 'user' ? 'Camera Trước (Selfie)' : 'Camera Sau'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCameraRestartCount(c => c + 1)}
                  className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Khởi động lại camera"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Viewport Frame */}
              <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden border-2 border-amber-400/70 shadow-2xl bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  playsInline
                  autoPlay
                  muted
                />

                {/* Shutter flash effect */}
                {isShutterFlashing && (
                  <div className="absolute inset-0 bg-white z-30 transition-opacity duration-200" />
                )}

                {/* Portrait Oval / Rectangular Framing Guide */}
                {isCameraActive && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    {/* Head oval silhouette guide */}
                    <div className="w-44 h-56 rounded-[50%/60%] border-2 border-dashed border-amber-300/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] relative flex items-center justify-center">
                      {/* Crosshairs */}
                      <div className="w-4 h-0.5 bg-amber-300/60 absolute"></div>
                      <div className="h-4 w-0.5 bg-amber-300/60 absolute"></div>
                    </div>

                    <div className="mt-2 bg-slate-900/90 text-amber-200 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-amber-400/40">
                      Căn khuôn mặt vào trong khung hình
                    </div>
                  </div>
                )}

                {/* Loading state */}
                {isCameraLoading && !cameraError && (
                  <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-4 text-center space-y-2 z-10">
                    <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
                    <p className="text-xs text-slate-300 font-medium">Đang kết nối camera thiết bị...</p>
                  </div>
                )}

                {/* Camera error */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-5 text-center space-y-3 z-20">
                    <AlertCircle className="w-9 h-9 text-rose-400 mx-auto" />
                    <p className="text-xs text-rose-200 leading-relaxed max-w-xs">{cameraError}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCameraRestartCount(c => c + 1)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Thử Lại</span>
                      </button>
                      <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                        <span>Đổi Camera</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Shutter Capture Button */}
              {isCameraActive && !cameraError && (
                <div className="mt-4 flex items-center justify-center w-full">
                  <button
                    type="button"
                    onClick={handleSnap}
                    className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 p-1.5 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center ring-4 ring-amber-400/30"
                    title="Chụp ảnh ngay"
                  >
                    <div className="w-full h-full rounded-full border-2 border-slate-900 bg-white flex items-center justify-center text-slate-900">
                      <Camera className="w-6 h-6 text-slate-900 stroke-[2.2]" />
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <span>Chuẩn thẻ 3x4 • Don Bosco Đà Lạt</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
