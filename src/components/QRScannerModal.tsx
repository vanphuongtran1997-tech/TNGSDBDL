import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  X, 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  Keyboard, 
  Clock, 
  Timer, 
  Info, 
  AlertTriangle,
  Upload,
  SwitchCamera,
  Search,
  Sparkles,
  Check,
  Smartphone
} from 'lucide-react';
import jsQR from 'jsqr';
import { Student, AttendanceStatus, ClassRoom, AttendanceTimeSlot } from '../types';
import { 
  evaluateAttendanceTime, 
  AttendanceTimeEvaluation 
} from '../utils/attendanceTimeUtils';

interface QRScannerModalProps {
  students: Student[];
  classes: ClassRoom[];
  onAttendanceMarked: (
    studentId: string, 
    status: AttendanceStatus, 
    date: string, 
    sessionType: 'Chúa Nhật' | 'Thứ 5',
    scanTime?: string,
    timeSlot?: AttendanceTimeSlot,
    note?: string
  ) => void;
  onClose: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  students,
  classes,
  onAttendanceMarked,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [manualIdInput, setManualIdInput] = useState<string>('');
  
  // Date & Session
  const [sessionDate, setSessionDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [sessionType, setSessionType] = useState<'Chúa Nhật' | 'Thứ 5'>('Chúa Nhật');

  // Real-time Attendance Time Calculation settings
  const [autoCalculateScore, setAutoCalculateScore] = useState<boolean>(true);
  const [timeSlotMode, setTimeSlotMode] = useState<AttendanceTimeSlot | 'auto'>('auto');
  const [currentTime, setCurrentTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  });

  // Simulated Time for Testing
  const [useSimulatedTime, setUseSimulatedTime] = useState<boolean>(false);
  const [simulatedTime, setSimulatedTime] = useState<string>('07:20');

  // Manual fallback status override (if autoCalculateScore is turned off)
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('A');

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const [lastScannedResult, setLastScannedResult] = useState<{
    student: Student;
    status: AttendanceStatus;
    scanTime: string;
    slotLabel: string;
    reason: string;
    isLate: boolean;
  } | null>(null);

  const [recentLogs, setRecentLogs] = useState<{
    student: Student;
    status: AttendanceStatus;
    time: string;
    reason: string;
  }[]>([]);

  // Refs to hold current values without triggering re-render of the camera stream
  const effectiveScanTimeRef = useRef<string>(currentTime);
  const sessionDateRef = useRef<string>(sessionDate);
  const sessionTypeRef = useRef<'Chúa Nhật' | 'Thứ 5'>(sessionType);
  const autoCalculateScoreRef = useRef<boolean>(autoCalculateScore);
  const timeSlotModeRef = useRef<AttendanceTimeSlot | 'auto'>(timeSlotMode);
  const selectedStatusRef = useRef<AttendanceStatus>(selectedStatus);
  const studentsRef = useRef<Student[]>(students);
  const onAttendanceMarkedRef = useRef(onAttendanceMarked);

  // Keep refs in sync
  const effectiveScanTime = useSimulatedTime ? `${simulatedTime}:00` : currentTime;
  useEffect(() => {
    effectiveScanTimeRef.current = effectiveScanTime;
    sessionDateRef.current = sessionDate;
    sessionTypeRef.current = sessionType;
    autoCalculateScoreRef.current = autoCalculateScore;
    timeSlotModeRef.current = timeSlotMode;
    selectedStatusRef.current = selectedStatus;
    studentsRef.current = students;
    onAttendanceMarkedRef.current = onAttendanceMarked;
  }, [effectiveScanTime, sessionDate, sessionType, autoCalculateScore, timeSlotMode, selectedStatus, students, onAttendanceMarked]);

  // Clock ticker: update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time evaluation calculation for display
  const currentEvaluation: AttendanceTimeEvaluation = evaluateAttendanceTime(
    effectiveScanTime,
    sessionType,
    timeSlotMode
  );

  // Sound beep using Web Audio API
  const playBeep = (isLate = false) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = isLate ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isLate ? 440 : 880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // Audio not permitted or supported
    }
  };

  // Process a detected student code
  const handleStudentDetected = useCallback((rawDetected: string) => {
    let cleanId = rawDetected.trim();

    // Strip prefixes like DBS:DBS-KT-001:Name or DBS-STUDENT:DBS-KT-001
    if (cleanId.startsWith('DBS:')) {
      const parts = cleanId.split(':');
      cleanId = parts[1] || cleanId;
    } else if (cleanId.startsWith('DBS-STUDENT:')) {
      const parts = cleanId.split(':');
      cleanId = parts[1] || cleanId;
    } else if (cleanId.startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanId);
        if (parsed.id) cleanId = parsed.id;
      } catch {
        // Not JSON
      }
    }

    cleanId = cleanId.trim();

    // Match student
    const student = studentsRef.current.find(
      s => s.id.toLowerCase().trim() === cleanId.toLowerCase() ||
           s.id.toLowerCase().trim().replace(/[-_]/g, '') === cleanId.toLowerCase().replace(/[-_]/g, '')
    );

    if (!student) {
      alert(`Không tìm thấy học sinh có mã thẻ: "${rawDetected}". Vui lòng kiểm tra lại mã hoặc in lại thẻ mới.`);
      return;
    }

    let finalStatus: AttendanceStatus = selectedStatusRef.current;
    let slotLabel = 'Thủ công';
    let reason = 'Ghi nhận thủ công';
    let isLate = false;
    let slot: AttendanceTimeSlot | undefined = undefined;

    if (autoCalculateScoreRef.current) {
      const evaluation = evaluateAttendanceTime(
        effectiveScanTimeRef.current, 
        sessionTypeRef.current, 
        timeSlotModeRef.current
      );
      finalStatus = evaluation.status;
      slotLabel = evaluation.slotLabel;
      reason = evaluation.reason;
      isLate = evaluation.isLate;
      slot = evaluation.slot;
    }

    playBeep(isLate);

    onAttendanceMarkedRef.current(
      student.id, 
      finalStatus, 
      sessionDateRef.current, 
      sessionTypeRef.current, 
      effectiveScanTimeRef.current, 
      slot, 
      reason
    );

    const result = {
      student,
      status: finalStatus,
      scanTime: effectiveScanTimeRef.current,
      slotLabel,
      reason,
      isLate,
    };

    setLastScannedResult(result);
    setRecentLogs(prev => [
      {
        student,
        status: finalStatus,
        time: effectiveScanTimeRef.current,
        reason,
      },
      ...prev.slice(0, 7),
    ]);
  }, []);

  // Enumerate cameras
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCameraId) {
          // Prefer back camera if available
          const backCam = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('sau') || d.label.toLowerCase().includes('environment'));
          setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
        }
      }).catch(() => {});
    }
  }, []);

  // Start Camera Stream - Robust decoupled implementation
  useEffect(() => {
    if (activeMode !== 'camera') {
      setIsCameraActive(false);
      return;
    }

    let currentStream: MediaStream | null = null;
    let animationFrameId: number;
    let isMounted = true;

    async function startCamera() {
      try {
        setCameraError(null);
        let constraints: MediaStreamConstraints = {
          video: selectedCameraId 
            ? { deviceId: { exact: selectedCameraId }, width: { ideal: 640 }, height: { ideal: 480 } }
            : { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        };

        try {
          currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (firstErr) {
          // Fallback if facingMode environment or exact deviceId failed
          console.warn('First camera constraint failed, falling back to basic video...', firstErr);
          currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (!isMounted) {
          if (currentStream) {
            currentStream.getTracks().forEach(t => t.stop());
          }
          return;
        }

        if (videoRef.current && currentStream) {
          videoRef.current.srcObject = currentStream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          setIsCameraActive(true);
          requestAnimationFrame(scanLoop);
        }
      } catch (err) {
        if (!isMounted) return;
        setIsCameraActive(false);
        setCameraError('Không thể mở Camera. Vui lòng cấp quyền truy cập Camera trên trình duyệt, hoặc chuyển sang Chế độ Tải ảnh QR / Nhập mã học sinh.');
      }
    }

    let lastDetectedId = '';
    let lastDetectedTime = 0;

    function scanLoop() {
      if (!isMounted) return;

      if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data) {
            const rawData = code.data.trim();
            const now = Date.now();
            
            // Prevent duplicate triggers for same code within 3 seconds
            if (rawData !== lastDetectedId || now - lastDetectedTime > 3000) {
              lastDetectedId = rawData;
              lastDetectedTime = now;
              handleStudentDetected(rawData);
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanLoop);
    }

    startCamera();

    return () => {
      isMounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeMode, selectedCameraId, handleStudentDetected]);

  // Handle QR Scan from uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          handleStudentDetected(code.data);
        } else {
          alert('Không nhận diện được mã QR trong bức ảnh này. Vui lòng chụp ảnh rõ nét, vuông góc với mã QR hoặc nhập mã học sinh bằng tay.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input value
    e.target.value = '';
  };

  const getStatusColor = (st: AttendanceStatus) => {
    switch (st) {
      case 'A': return 'bg-emerald-600 text-white';
      case 'B': return 'bg-amber-500 text-white';
      case 'C': return 'bg-blue-600 text-white';
      case 'D': return 'bg-red-600 text-white';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col my-auto border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Quét Mã QR & Tính Giờ Điểm Danh Tự Động
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Chuẩn hóa theo giờ thực tế
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Tự động nhận diện Đúng Giờ (Loại A) hoặc Đi Trễ (Loại B, -0.1đ) theo giờ Thánh Lễ & Giáo Lý
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Interactive Modes Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-4 pt-2 gap-2 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveMode('camera')}
            className={`px-3.5 py-2 font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeMode === 'camera'
                ? 'bg-white text-slate-900 border-t-2 border-amber-500 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-amber-600" />
            <span>1. Quét Bằng Camera</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`px-3.5 py-2 font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeMode === 'upload'
                ? 'bg-white text-slate-900 border-t-2 border-amber-500 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>2. Tải Lên Ảnh Chụp Mã QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={`px-3.5 py-2 font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeMode === 'manual'
                ? 'bg-white text-slate-900 border-t-2 border-amber-500 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 text-blue-600" />
            <span>3. Nhập Mã Học Sinh (DBS-xxx)</span>
          </button>
        </div>

        {/* Dynamic Time Slot & Session Configuration Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Session Date */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Ngày Điểm Danh:</label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium text-xs focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Session Type */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Buổi Sinh Hoạt:</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as 'Chúa Nhật' | 'Thứ 5')}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium text-xs focus:ring-1 focus:ring-amber-500"
              >
                <option value="Chúa Nhật">Chúa Nhật (Lễ & Học Giáo Lý)</option>
                <option value="Thứ 5">Thứ 5 (Lớp Bí Tích 17h30-19h00)</option>
              </select>
            </div>

            {/* Khung Giờ Điểm Danh (Time Slot) */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Khung Giờ Tham Dự:</label>
              <select
                value={timeSlotMode}
                onChange={(e) => setTimeSlotMode(e.target.value as AttendanceTimeSlot | 'auto')}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium text-xs focus:ring-1 focus:ring-amber-500"
              >
                <option value="auto">⚡ Tự động nhận diện theo giờ</option>
                {sessionType === 'Chúa Nhật' ? (
                  <>
                    <option value="tap_trung">Giờ Tập Trung (07:00 - 07:30)</option>
                    <option value="gio_le">Giờ Thánh Lễ (07:30 - 08:30)</option>
                    <option value="giao_ly">Giờ Học Giáo Lý (08:45 - 10:15)</option>
                  </>
                ) : (
                  <>
                    <option value="tap_trung">Tập Trung & Kinh Nguyện (17:15 - 17:30)</option>
                    <option value="gio_le">Giờ Lễ Thứ 5 (17:30 - 18:15)</option>
                    <option value="giao_ly">Học Bí Tích (17:30 - 19:00)</option>
                  </>
                )}
              </select>
            </div>

            {/* Real Clock / Test Time Switcher */}
            <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Đồng Hồ Điểm Danh:
                </span>
                <span className="font-mono font-bold text-amber-700 text-xs">{effectiveScanTime}</span>
              </div>

              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSimulatedTime}
                    onChange={(e) => setUseSimulatedTime(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Thử nghiệm mốc giờ</span>
                </label>

                {useSimulatedTime && (
                  <input
                    type="time"
                    value={simulatedTime}
                    onChange={(e) => setSimulatedTime(e.target.value)}
                    className="border border-amber-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold bg-amber-50 text-amber-900 w-20"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Time Evaluation Live Status Banner */}
          <div className="bg-white rounded-lg p-2 border border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-blue-600" />
                Khung giờ đang áp dụng:
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold text-xs">
                {currentEvaluation.slotLabel}
              </span>
              <span className="text-slate-500 text-xs">
                (Mốc chuẩn đúng giờ: <strong>{currentEvaluation.targetTime}</strong>)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Khi quét lúc này sẽ tính:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                currentEvaluation.status === 'A' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {currentEvaluation.status === 'A' ? '✓ Loại A (Đạt - Đúng Giờ)' : `⚠ Loại B (Trễ ${currentEvaluation.lateMinutes}p, -0.1đ)`}
              </span>
            </div>
          </div>
        </div>

        {/* Scanner & Live Results */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-y-auto">
          {/* Main Left Area: Camera, File Upload, or Manual ID */}
          <div className="lg:col-span-7 flex flex-col">
            {activeMode === 'camera' && (
              <div className="flex flex-col items-center justify-center bg-slate-950 rounded-xl p-4 text-white relative min-h-[320px]">
                {/* Camera device selection bar if multiple devices */}
                {availableCameras.length > 1 && (
                  <div className="w-full mb-3 flex items-center justify-between text-xs bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-300 flex items-center gap-1 text-[11px]">
                      <SwitchCamera className="w-3.5 h-3.5 text-amber-400" />
                      Thiết bị camera:
                    </span>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-xs"
                    >
                      {availableCameras.map((cam, idx) => (
                        <option key={cam.deviceId || idx} value={cam.deviceId}>
                          {cam.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {isCameraActive ? (
                  <div className="relative w-full aspect-4/3 max-w-md rounded-lg overflow-hidden border-2 border-amber-400 bg-black">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay muted />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Aiming square with scanning laser line */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-52 h-52 border-2 border-amber-400/80 rounded-xl relative overflow-hidden">
                        {/* 4 Corner brackets */}
                        <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-amber-400"></div>
                        <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-amber-400"></div>
                        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-amber-400"></div>
                        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-amber-400"></div>

                        {/* Animated Laser Scanning Line */}
                        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b] animate-bounce" style={{ animationDuration: '2s' }}></div>
                      </div>
                    </div>

                    <div className="absolute bottom-2 inset-x-0 text-center text-xs bg-slate-900/80 py-1 text-amber-300">
                      Đang hướng camera vào mã QR • {effectiveScanTime}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                    <p className="text-xs text-slate-300 max-w-xs">{cameraError || 'Đang kết nối camera...'}</p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveMode('upload')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Tải Lên Ảnh QR Thay Thế</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMode('manual')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Keyboard className="w-3.5 h-3.5" />
                        <span>Nhập Mã Học Sinh</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick keyboard search inside camera mode */}
                <div className="w-full mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Hoặc gõ nhanh mã thẻ (vd: DBS-KT-001)..."
                      value={manualIdInput}
                      onChange={(e) => setManualIdInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = manualIdInput.trim();
                          if (trimmed) {
                            handleStudentDetected(trimmed);
                            setManualIdInput('');
                          }
                        }
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = manualIdInput.trim();
                        if (trimmed) {
                          handleStudentDetected(trimmed);
                          setManualIdInput('');
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Điểm Danh
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeMode === 'upload' && (
              /* Mode 2: Upload Image of QR */
              <div className="bg-slate-50 border-2 border-dashed border-emerald-300 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[320px]">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Tải Lên Hình Ảnh Thẻ Hoặc Ảnh Chụp Mã QR
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Hệ thống sẽ tự động quét và phân tích mã QR trực tiếp từ file ảnh (PNG, JPG, JPEG) mà không cần webcam.
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Chọn Ảnh Từ Thiết Bị Của Bạn</span>
                </button>

                <div className="text-[11px] text-slate-400">
                  💡 Có thể chụp ảnh bằng camera điện thoại rồi chọn tải lên để điểm danh.
                </div>
              </div>
            )}

            {activeMode === 'manual' && (
              /* Mode 3: Manual Search & Entry */
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col space-y-3 min-h-[320px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Keyboard className="w-4 h-4 text-blue-600" />
                    <span>Nhập Thủ Công Mã Học Sinh</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Nhấn Enter để điểm danh ngay</span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = manualIdInput.trim();
                    if (!trimmed) return;
                    handleStudentDetected(trimmed);
                    setManualIdInput('');
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Nhập mã học sinh (vd: DBS-KT-001, 001, DBS-SC-004)..."
                      value={manualIdInput}
                      onChange={(e) => setManualIdInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
                  >
                    Ghi Nhận
                  </button>
                </form>

                {/* Matched Students List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 max-h-56 pr-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Gợi ý học sinh khớp mã:
                  </div>
                  {students
                    .filter(s => {
                      const q = manualIdInput.trim().toLowerCase();
                      if (!q) return true;
                      return s.id.toLowerCase().includes(q) || 
                             s.fullName.toLowerCase().includes(q) ||
                             s.holyName.toLowerCase().includes(q);
                    })
                    .slice(0, 8)
                    .map(st => {
                      const cName = classes.find(c => c.id === st.classId)?.name || st.classId;
                      return (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 transition-colors shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {st.id}
                              </span>
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {st.holyName} {st.fullName}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {cName} • {st.gender}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              handleStudentDetected(st.id);
                              setManualIdInput('');
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-2xs transition-colors ml-2 shrink-0 cursor-pointer"
                          >
                            + Điểm Danh ({currentEvaluation.status})
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Quick 1-Click Test Bar */}
            <div className="mt-3 p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Thử nghiệm nhanh không cần thẻ:</span>
              </div>
              <div className="flex items-center gap-1">
                {students.slice(0, 3).map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleStudentDetected(st.id)}
                    className="px-2 py-1 bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-400 text-slate-700 hover:text-amber-900 rounded text-[11px] font-medium transition-colors cursor-pointer truncate max-w-[120px]"
                    title={`Thử điểm danh cho ${st.holyName} ${st.fullName}`}
                  >
                    {st.fullName.split(' ').pop()} ({st.id.split('-').pop()})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Area: Results and Recent History */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            {/* Last Scanned Banner */}
            {lastScannedResult ? (
              <div className={`border rounded-xl p-3.5 shadow-xs animate-in fade-in ${
                lastScannedResult.status === 'A' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {lastScannedResult.status === 'A' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      {lastScannedResult.status === 'A' ? 'ĐIỂM DANH ĐẠT (ĐÚNG GIỜ)' : 'ĐIỂM DANH TRỄ (-0.1Đ)'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                    lastScannedResult.status === 'A' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    Loại {lastScannedResult.status}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900">
                  {lastScannedResult.student.holyName} {lastScannedResult.student.fullName}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Mã số: <span className="font-mono font-bold text-slate-900">{lastScannedResult.student.id}</span>
                </div>

                <div className="mt-2 text-[11px] bg-white/80 p-2 rounded-lg border border-slate-200/60 space-y-0.5">
                  <div>Khung giờ: <strong>{lastScannedResult.slotLabel}</strong></div>
                  <div>Thời gian ghi nhận: <strong className="font-mono">{lastScannedResult.scanTime}</strong></div>
                  <div className="text-slate-600">Đánh giá: {lastScannedResult.reason}</div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500">
                Chưa có học sinh nào được quét trong phiên này.
              </div>
            )}

            {/* Policy Explanatory Box */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1 text-blue-950">
                <Info className="w-3.5 h-3.5 text-blue-700" />
                <span>Quy Định Vắng Có Phép (C) & Không Phép (D):</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Hệ thống quét thẻ chỉ ghi nhận các em <strong>Có mặt</strong> (A hoặc B). Học sinh nghỉ có phép (C) hoặc không phép (D) sẽ do <strong>Giáo lý viên phụ trách lớp</strong> trực tiếp cập nhật vào Bảng Điểm Danh trong ngày học hôm nay.
              </p>
            </div>

            {/* Recent Scanned Log */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex-1 flex flex-col">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Lượt Quét Gần Nhất ({recentLogs.length})</span>
                <span className="text-[10px] text-slate-400 font-normal">Tự động cập nhật</span>
              </h3>

              <div className="space-y-1.5 overflow-y-auto max-h-44 pr-1">
                {recentLogs.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic text-center py-4">
                    Chưa có dữ liệu phiên quét...
                  </p>
                ) : (
                  recentLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded-md bg-slate-50 text-xs border border-slate-100"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-slate-800 truncate block">
                          {log.student.holyName} {log.student.fullName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{log.student.id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Giáo Sở Don Bosco Đà Lạt • Điểm danh chuẩn hóa theo giờ thực tế</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
};
