import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  UserCheck, 
  Zap, 
  Search, 
  Keyboard, 
  IdCard,
  Clock,
  Timer,
  Info,
  SlidersHorizontal,
  Check,
  AlertTriangle
} from 'lucide-react';
import jsQR from 'jsqr';
import { Student, AttendanceStatus, ClassRoom, AttendanceTimeSlot } from '../types';
import { 
  evaluateAttendanceTime, 
  SUNDAY_TIME_CONFIGS, 
  THURSDAY_TIME_CONFIGS, 
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
  const [activeMode, setActiveMode] = useState<'camera' | 'manual'>('camera');
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

  // Simulated Time for Testing (Allows testing on-time vs late at any time of day)
  const [useSimulatedTime, setUseSimulatedTime] = useState<boolean>(false);
  const [simulatedTime, setSimulatedTime] = useState<string>('07:20');

  // Manual fallback status override (if autoCalculateScore is turned off)
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('A');

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

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

  const effectiveScanTime = useSimulatedTime ? `${simulatedTime}:00` : currentTime;

  // Real-time evaluation calculation for current time
  const currentEvaluation: AttendanceTimeEvaluation = evaluateAttendanceTime(
    effectiveScanTime,
    sessionType,
    timeSlotMode
  );

  // Sound beep using Web Audio API
  const playBeep = (isLate = false) => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = isLate ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isLate ? 520 : 880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch {
      // Audio not permitted or supported
    }
  };

  const handleStudentDetected = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) {
      alert(`Không tìm thấy học sinh có mã: ${studentId}`);
      return;
    }

    let finalStatus: AttendanceStatus = selectedStatus;
    let slotLabel = 'Thủ công';
    let reason = 'Ghi nhận theo lựa chọn thủ công';
    let isLate = false;
    let slot: AttendanceTimeSlot | undefined = undefined;

    if (autoCalculateScore) {
      const evaluation = evaluateAttendanceTime(effectiveScanTime, sessionType, timeSlotMode);
      finalStatus = evaluation.status;
      slotLabel = evaluation.slotLabel;
      reason = evaluation.reason;
      isLate = evaluation.isLate;
      slot = evaluation.slot;
    }

    playBeep(isLate);

    onAttendanceMarked(
      student.id, 
      finalStatus, 
      sessionDate, 
      sessionType, 
      effectiveScanTime, 
      slot, 
      reason
    );

    const result = {
      student,
      status: finalStatus,
      scanTime: effectiveScanTime,
      slotLabel,
      reason,
      isLate,
    };

    setLastScannedResult(result);
    setRecentLogs(prev => [
      {
        student,
        status: finalStatus,
        time: effectiveScanTime,
        reason,
      },
      ...prev.slice(0, 8),
    ]);
  };

  // Start Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    async function startCamera() {
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          setIsCameraActive(true);
          requestAnimationFrame(scanFrame);
        }
      } catch (err) {
        setIsCameraActive(false);
        setCameraError('Không thể mở Camera. Vui lòng cấp quyền truy cập Camera hoặc sử dụng Chế độ nhập mã học sinh.');
      }
    }

    let lastDetectedId = '';
    let lastDetectedTime = 0;

    function scanFrame() {
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
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            let detectedId = code.data.trim();
            if (code.data.startsWith('DBS:')) {
              const parts = code.data.split(':');
              detectedId = parts[1];
            }

            const now = Date.now();
            // Prevent duplicate triggers within 2.5 seconds
            if (detectedId !== lastDetectedId || now - lastDetectedTime > 2500) {
              lastDetectedId = detectedId;
              lastDetectedTime = now;
              handleStudentDetected(detectedId);
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanFrame);
    }

    startCamera();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [autoCalculateScore, timeSlotMode, effectiveScanTime, selectedStatus, sessionDate, sessionType]);

  const getStatusLabel = (st: AttendanceStatus) => {
    switch (st) {
      case 'A': return 'A: Đạt (Đúng giờ & Tham dự đầy đủ)';
      case 'B': return 'B: Đi học / Đi lễ trễ (-0.1đ)';
      case 'C': return 'C: Vắng có phép (GLV nhập)';
      case 'D': return 'D: Vắng không phép (GLV nhập)';
    }
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
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-xs">
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
                  Tính điểm theo giờ thực
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Tự động tính điểm A (Đúng giờ) hoặc B (Trễ) theo khung giờ Tập trung, Thánh Lễ hoặc Giờ Giáo Lý
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-4 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveMode('camera')}
            className={`px-4 py-2 font-bold rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeMode === 'camera'
                ? 'bg-white text-slate-900 border-t-2 border-amber-500 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-amber-600" />
            <span>Chế Độ 1: Quét Mã QR Qua Camera</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={`px-4 py-2 font-bold rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeMode === 'manual'
                ? 'bg-white text-slate-900 border-t-2 border-amber-500 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 text-blue-600" />
            <span>Chế Độ 2: Nhập Mã Học Sinh Nhanh (DBS-xxx)</span>
          </button>
        </div>

        {/* Dynamic Time Slot & Session Configuration Bar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5 text-xs">
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
                onChange={(e) => setTimeSlotMode(e.target.value as any)}
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
          <div className="bg-white rounded-lg p-2.5 border border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
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
          {/* Main Left Area: Camera or Manual ID Search */}
          <div className="lg:col-span-7 flex flex-col">
            {activeMode === 'camera' ? (
              <div className="flex flex-col items-center justify-center bg-slate-950 rounded-xl p-4 text-white relative min-h-[320px]">
                {isCameraActive ? (
                  <div className="relative w-full aspect-4/3 max-w-md rounded-lg overflow-hidden border-2 border-amber-400">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Aiming square animation */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-amber-400/80 rounded-lg relative animate-pulse">
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-400"></div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-400"></div>
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-400"></div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-400"></div>
                      </div>
                    </div>
                    <div className="absolute bottom-2 inset-x-0 text-center text-xs bg-slate-900/80 py-1 text-amber-300">
                      Đang hướng camera • Giờ hệ thống: {effectiveScanTime}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                    <p className="text-xs text-slate-300 max-w-xs">{cameraError || 'Đang khởi động camera...'}</p>
                    <div className="text-[11px] text-slate-400">
                      (Nếu camera không khả dụng, bạn có thể chuyển sang <strong className="text-amber-300">Chế độ 2: Nhập Mã Học Sinh Nhanh</strong> bên trên)
                    </div>
                  </div>
                )}

                {/* Quick input right inside camera view */}
                <div className="w-full mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Hoặc gõ nhanh mã học sinh (vd: DBS-KT-001)..."
                      value={manualIdInput}
                      onChange={(e) => setManualIdInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = manualIdInput.trim();
                          if (trimmed) {
                            const exact = students.find(s => s.id.toLowerCase() === trimmed.toLowerCase());
                            if (exact) {
                              handleStudentDetected(exact.id);
                              setManualIdInput('');
                            } else {
                              const match = students.find(s => s.id.toLowerCase().includes(trimmed.toLowerCase()));
                              if (match) {
                                handleStudentDetected(match.id);
                                setManualIdInput('');
                              } else {
                                alert(`Không tìm thấy học sinh khớp với mã "${trimmed}"`);
                              }
                            }
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
                          const exact = students.find(s => s.id.toLowerCase() === trimmed.toLowerCase());
                          if (exact) {
                            handleStudentDetected(exact.id);
                            setManualIdInput('');
                          } else {
                            const match = students.find(s => s.id.toLowerCase().includes(trimmed.toLowerCase()));
                            if (match) {
                              handleStudentDetected(match.id);
                              setManualIdInput('');
                            } else {
                              alert(`Không tìm thấy học sinh khớp với mã "${trimmed}"`);
                            }
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Điểm Danh
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Mode 2: Manual Search & Entry */
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
                    const exact = students.find(s => s.id.toLowerCase() === trimmed.toLowerCase());
                    if (exact) {
                      handleStudentDetected(exact.id);
                      setManualIdInput('');
                    } else {
                      const match = students.find(s => s.id.toLowerCase().includes(trimmed.toLowerCase()));
                      if (match) {
                        handleStudentDetected(match.id);
                        setManualIdInput('');
                      } else {
                        alert(`Không tìm thấy học sinh với mã: ${trimmed}`);
                      }
                    }
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
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
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
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-2xs transition-colors ml-2 shrink-0"
                          >
                            + Điểm Danh ({currentEvaluation.status})
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
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

            {/* Explanatory Policy Card for Catechists */}
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
                        <span className="text-[10px] text-slate-500">{log.student.id}</span>
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
            className="px-4 py-1.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-medium transition-colors"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
};
