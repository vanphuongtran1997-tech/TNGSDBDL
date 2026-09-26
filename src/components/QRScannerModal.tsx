import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  X, 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
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
  Smartphone,
  CheckCheck,
  Lock,
  Zap,
  Volume2,
  VolumeX,
  History
} from 'lucide-react';
import jsQR from 'jsqr';
import { Student, AttendanceStatus, ClassRoom, AttendanceTimeSlot, UserAccount, CustomDateSchedule, AttendanceRecord } from '../types';
import { 
  evaluateAttendanceTime, 
  AttendanceTimeEvaluation,
  getEffectiveTimeConfigs,
  loadCustomSchedules
} from '../utils/attendanceTimeUtils';
import { 
  playSuccessChime, 
  playAlreadyMarkedChime, 
  playErrorChime, 
  isSoundEnabled, 
  setSoundEnabled 
} from '../utils/soundUtils';
import { CustomScheduleModal } from './CustomScheduleModal';

interface QRScannerModalProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords?: AttendanceRecord[];
  currentUser?: UserAccount;
  authorizedClassIds?: string[];
  customSchedules?: Record<string, CustomDateSchedule>;
  onScheduleUpdated?: (updated: Record<string, CustomDateSchedule>) => void;
  onOpenHistoryModal?: (classId?: string, studentId?: string) => void;
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
  attendanceRecords,
  currentUser,
  authorizedClassIds,
  customSchedules,
  onScheduleUpdated,
  onOpenHistoryModal,
  onAttendanceMarked,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authorizedClassIdsRef = useRef<string[] | undefined>(authorizedClassIds);
  authorizedClassIdsRef.current = authorizedClassIds;

  const accessibleStudents = useMemo(() => {
    if (!authorizedClassIds || authorizedClassIds.length === 0) return students;
    return students.filter(s => authorizedClassIds.includes(s.classId));
  }, [students, authorizedClassIds]);

  const assignedClassName = useMemo(() => {
    if (!authorizedClassIds || authorizedClassIds.length === 0) return null;
    return classes.find(c => authorizedClassIds.includes(c.id))?.name || 'Lớp phụ trách';
  }, [classes, authorizedClassIds]);

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
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [flashSuccess, setFlashSuccess] = useState<boolean>(false);
  const [cameraRestartCount, setCameraRestartCount] = useState<number>(0);

  // Non-blocking toast notifications for camera/scan (replaces blocking alert dialogs)
  const [scanNotification, setScanNotification] = useState<{
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
  } | null>(null);

  // Audio feedback toggle (persisted)
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSuccessChime(false);
  };

  const [lastScannedResult, setLastScannedResult] = useState<{
    student: Student;
    status: AttendanceStatus;
    scanTime: string;
    slotLabel: string;
    reason: string;
    isLate: boolean;
    isDuplicate?: boolean;
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
  const attendanceRecordsRef = useRef<AttendanceRecord[] | undefined>(attendanceRecords);
  attendanceRecordsRef.current = attendanceRecords;

  // Session cache to prevent repeated scans in the same modal session
  const sessionScannedMapRef = useRef<Map<string, { time: string; status: AttendanceStatus; sessionType: string }>>(new Map());

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

  // Custom schedule state & effective configs
  const [internalCustomSchedules, setInternalCustomSchedules] = useState<Record<string, CustomDateSchedule>>(() => {
    return customSchedules || loadCustomSchedules();
  });

  useEffect(() => {
    if (customSchedules) {
      setInternalCustomSchedules(customSchedules);
    }
  }, [customSchedules]);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);

  const effectiveScheduleInfo = getEffectiveTimeConfigs(sessionDate, sessionType, internalCustomSchedules);

  const effectiveConfigsRef = useRef(effectiveScheduleInfo.configs);
  const customScheduleRef = useRef(effectiveScheduleInfo.customSchedule);

  useEffect(() => {
    effectiveConfigsRef.current = effectiveScheduleInfo.configs;
    customScheduleRef.current = effectiveScheduleInfo.customSchedule;
  }, [effectiveScheduleInfo]);

  // Real-time evaluation calculation for display
  const currentEvaluation: AttendanceTimeEvaluation = evaluateAttendanceTime(
    effectiveScanTime,
    sessionType,
    timeSlotMode,
    effectiveScheduleInfo.configs,
    effectiveScheduleInfo.customSchedule
  );

  // Sound chime using Web Audio API (POS dual-tone scanner sound)
  const playBeep = (type: 'on_time' | 'late' | 'error' = 'on_time') => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();

      if (type === 'error') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
        return;
      }

      if (type === 'late') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.28);
        return;
      }

      // Success 'on_time': crisp supermarket/scanner two-tone chime (880Hz -> 1318.5Hz)
      const now = audioCtx.currentTime;
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.1);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now + 0.08);
      gain2.gain.setValueAtTime(0.25, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
    } catch {
      // Audio not permitted or supported
    }
  };

  // Process a detected student code - TỰ ĐỘNG ĐIỂM DANH 1 BƯỚC KHÔNG CẦN BẤM XÁC NHẬN
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

    // Match student flexibly
    const cleanLower = cleanId.toLowerCase();
    const cleanNormalized = cleanLower.replace(/[-_\s]/g, '');

    const student = studentsRef.current.find(s => {
      const sIdLower = s.id.toLowerCase().trim();
      const sIdNorm = sIdLower.replace(/[-_\s]/g, '');
      return sIdLower === cleanLower ||
             sIdNorm === cleanNormalized ||
             sIdLower.endsWith(`-${cleanLower}`) ||
             sIdLower.endsWith(`-${cleanNormalized}`);
    });

    if (!student) {
      playErrorChime();
      setScanNotification({
        title: 'Mã Thẻ Không Tồn Tại',
        message: `Mã nhận diện "${rawDetected}" không khớp với học sinh nào trong danh sách. Vui lòng kiểm tra lại.`,
        type: 'error'
      });
      setTimeout(() => {
        setScanNotification(prev => (prev?.type === 'error' ? null : prev));
      }, 3000);
      return;
    }

    // Role-based permission enforcement: Check if student belongs to teacher's authorized class
    if (authorizedClassIdsRef.current && authorizedClassIdsRef.current.length > 0 && !authorizedClassIdsRef.current.includes(student.classId)) {
      const studentClass = classes.find(c => c.id === student.classId);
      const assignedClass = classes.find(c => authorizedClassIdsRef.current?.includes(c.id));
      playErrorChime();
      setScanNotification({
        title: 'Giới Hạn Phân Quyền Lớp',
        message: `Học sinh ${student.holyName} ${student.fullName} thuộc lớp ${studentClass?.name || student.classId}. Bạn chỉ được điểm danh cho lớp ${assignedClass?.name || 'phụ trách'}.`,
        type: 'warning'
      });
      setTimeout(() => {
        setScanNotification(prev => (prev?.type === 'warning' ? null : prev));
      }, 3500);
      return;
    }

    // KIỂM TRA ĐIỀU KIỆN QUY ĐỊNH: Mỗi mã QR chỉ được điểm danh 1 lần duy nhất trong ngày
    // Nếu quét lần 2 thì phát âm báo đã điểm danh và hiển thị thông báo đã điểm danh
    const existingRecord = (attendanceRecordsRef.current || []).find(
      r => r.studentId === student.id && r.date === sessionDateRef.current
    );
    const sessionRecord = sessionScannedMapRef.current.get(student.id);

    if (existingRecord || sessionRecord) {
      const prevScanTime = (existingRecord?.scanTime || sessionRecord?.time) || 'trong ngày';
      const prevStatus = existingRecord?.status || sessionRecord?.status || 'A';
      const statusLabel = prevStatus === 'A' ? 'Đạt (A - Đúng giờ)' :
                          prevStatus === 'B' ? 'Trễ (B - Đi muộn)' :
                          prevStatus === 'C' ? 'Có Phép (C)' : 'Vắng (D)';

      // Phát âm báo đã điểm danh
      playAlreadyMarkedChime();

      setScanNotification({
        title: 'Học Sinh Đã Được Điểm Danh Hôm Nay',
        message: `${student.holyName} ${student.fullName} (${student.id}) ĐÃ ĐIỂM DANH lúc ${prevScanTime} hôm nay (${sessionDateRef.current}). Trạng thái: ${statusLabel}. Mỗi mã QR chỉ được điểm danh 1 lần duy nhất trong ngày!`,
        type: 'warning'
      });

      setLastScannedResult({
        student,
        status: prevStatus,
        scanTime: prevScanTime,
        slotLabel: 'ĐÃ ĐIỂM DANH HÔM NAY',
        reason: `Đã điểm danh lúc ${prevScanTime} hôm nay. Hệ thống chỉ cho phép điểm danh 1 lần/ngày.`,
        isLate: prevStatus === 'B',
        isDuplicate: true,
      });

      setTimeout(() => {
        setScanNotification(prev => (prev?.title === 'Học Sinh Đã Được Điểm Danh Hôm Nay' ? null : prev));
      }, 4500);

      return;
    }

    let finalStatus: AttendanceStatus = selectedStatusRef.current;
    let slotLabel = 'Thủ công';
    let reason = 'Ghi nhận tự động';
    let isLate = false;
    let slot: AttendanceTimeSlot | undefined = undefined;

    if (autoCalculateScoreRef.current) {
      const evaluation = evaluateAttendanceTime(
        effectiveScanTimeRef.current, 
        sessionTypeRef.current, 
        timeSlotModeRef.current,
        effectiveConfigsRef.current,
        customScheduleRef.current
      );
      finalStatus = evaluation.status;
      slotLabel = evaluation.slotLabel;
      reason = evaluation.reason;
      isLate = evaluation.isLate;
      slot = evaluation.slot;
    }

    // Phát âm báo khi điểm danh THÀNH CÔNG (Web Audio API)
    playSuccessChime(isLate);

    // Ghi nhớ vào phiên hiện tại để chặn quét lần 2 ngay lập tức
    sessionScannedMapRef.current.set(student.id, {
      time: effectiveScanTimeRef.current,
      status: finalStatus,
      sessionType: sessionTypeRef.current
    });

    // TỰ ĐỘNG ĐIỂM DANH VÀ LƯU VÀO SỔ TỨC THÌ (KHÔNG CẦN BƯỚC XÁC NHẬN NÀO)
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

    setScanNotification(null);
    setFlashSuccess(true);
    setTimeout(() => setFlashSuccess(false), 2500);

    setLastScannedResult(result);
    setRecentLogs(prev => [
      {
        student,
        status: finalStatus,
        time: effectiveScanTimeRef.current,
        reason,
      },
      ...prev.slice(0, 8),
    ]);
  }, [classes]);

  // Hardware barcode / QR scanner listener (USB / Bluetooth barcode gun)
  useEffect(() => {
    let keyBuffer = '';
    let lastKeyTimestamp = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      const now = Date.now();
      const elapsed = now - lastKeyTimestamp;
      lastKeyTimestamp = now;

      if (e.key === 'Enter') {
        const trimmed = keyBuffer.trim();
        if (trimmed.length >= 3) {
          // Hardware scanner detected!
          e.preventDefault();
          keyBuffer = '';
          handleStudentDetected(trimmed);
        } else {
          keyBuffer = '';
        }
        return;
      }

      // Barcode scanners input characters in rapid bursts (< 60ms). Human typing is > 100ms.
      if (elapsed > 200) {
        keyBuffer = '';
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        keyBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleStudentDetected]);

  // Enumerate cameras
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCameraId) {
          // Prefer back camera if available
          const backCam = videoDevices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('sau') || 
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
        }
      }).catch(() => {});
    }
  }, [selectedCameraId]);

  // Start Camera Stream & Scanning Loop
  useEffect(() => {
    if (activeMode !== 'camera') {
      setIsCameraActive(false);
      setIsCameraLoading(false);
      return;
    }

    let currentStream: MediaStream | null = null;
    let animationFrameId: number;
    let isMounted = true;
    let lastDetectedId = '';
    let lastDetectedTime = 0;

    // Check BarcodeDetector native API
    let barcodeDetector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        barcodeDetector = null;
      }
    }

    async function startCamera() {
      setIsCameraLoading(true);
      setCameraError(null);

      try {
        if (!navigator?.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setIsCameraActive(false);
          setIsCameraLoading(false);
          setCameraError('Trình duyệt không hỗ trợ truy cập Camera trực tiếp. Vui lòng chuyển sang chế độ Tải Ảnh QR hoặc Nhập Mã Học Sinh để điểm danh.');
          return;
        }

        // Pre-check if hardware video devices exist
        if (navigator.mediaDevices.enumerateDevices) {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(d => d.kind === 'videoinput');
            // If device enumeration lists hardware devices but explicitly 0 video cameras
            if (devices.length > 0 && videoInputs.length === 0) {
              if (!isMounted) return;
              setIsCameraActive(false);
              setIsCameraLoading(false);
              console.warn('No video input hardware detected on this device.');
              setCameraError('Không tìm thấy thiết bị Camera trên máy (chưa cắm webcam). Bạn có thể dùng chế độ "Tải Ảnh QR" hoặc "Nhập Mã Học Sinh" ở phía trên để điểm danh.');
              return;
            }
          } catch {
            // Ignore enumeration errors and proceed to getUserMedia
          }
        }

        let stream: MediaStream | null = null;

        // 1. Try exact camera if selected
        if (selectedCameraId) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: selectedCameraId },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            });
          } catch (camErr) {
            console.warn('Selected device camera failed, attempting fallback...', camErr);
          }
        }

        // 2. Try back-facing environment camera
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            });
          } catch (envErr) {
            console.warn('FacingMode environment failed, attempting generic video...', envErr);
          }
        }

        // 3. Fallback to basic generic video
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (genericErr) {
            console.warn('Generic getUserMedia failed:', genericErr);
            throw genericErr;
          }
        }

        currentStream = stream;

        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          
          await new Promise<void>((resolve) => {
            if (video.readyState >= 1) return resolve();
            video.onloadedmetadata = () => resolve();
          });

          await video.play().catch((playErr) => {
            console.warn('Video playback warning:', playErr);
          });

          if (isMounted) {
            setIsCameraActive(true);
            setIsCameraLoading(false);
            animationFrameId = requestAnimationFrame(scanLoop);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setIsCameraActive(false);
        setIsCameraLoading(false);

        const isDeviceNotFound = 
          err?.name === 'NotFoundError' || 
          err?.name === 'DevicesNotFoundError' ||
          (typeof err?.message === 'string' && (
            err.message.toLowerCase().includes('requested device not found') || 
            err.message.toLowerCase().includes('device not found') ||
            err.message.toLowerCase().includes('could not start video source')
          ));

        const isPermissionDenied = 
          err?.name === 'NotAllowedError' || 
          err?.name === 'PermissionDeniedError';

        const isNotReadable = 
          err?.name === 'NotReadableError' || 
          err?.name === 'TrackStartError';

        if (isDeviceNotFound) {
          console.warn('Camera device not found:', err?.message || err?.name);
          setCameraError('Không tìm thấy thiết bị Camera trên máy tính/thiết bị này (chưa cắm webcam). Bạn hãy bấm vào nút "Tải Ảnh QR" hoặc "Nhập Mã Học Sinh" ở dưới để tiếp tục.');
        } else if (isPermissionDenied) {
          console.warn('Camera permission denied by user or browser policy:', err?.message || err?.name);
          setCameraError('Quyền truy cập Camera bị từ chối. Vui lòng cho phép quyền Camera trên thanh địa chỉ của trình duyệt, hoặc chuyển sang chế độ Tải ảnh QR / Nhập mã.');
        } else if (isNotReadable) {
          console.warn('Camera in use or not readable:', err?.message || err?.name);
          setCameraError('Camera đang được một ứng dụng khác sử dụng hoặc bị khóa. Vui lòng tắt ứng dụng đó rồi bấm "Thử Lại Camera".');
        } else {
          console.warn('Camera initialization warning:', err?.message || err);
          setCameraError(err?.message || 'Không thể mở Camera. Vui lòng thử lại hoặc dùng chế độ Tải ảnh / Nhập mã.');
        }
      }
    }

    async function scanLoop() {
      if (!isMounted) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        try {
          let detectedCode: string | null = null;

          // 1. First attempt: Native BarcodeDetector (high speed & hardware accelerated)
          if (barcodeDetector) {
            try {
              const barcodes = await barcodeDetector.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detectedCode = barcodes[0].rawValue;
              }
            } catch {
              // BarcodeDetector failed, fallback to jsQR
            }
          }

          // 2. Second attempt: jsQR via Canvas
          if (!detectedCode && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              // Scale down frame to max 640 for rapid jsQR analysis
              const maxDim = Math.max(video.videoWidth, video.videoHeight);
              const scale = maxDim > 640 ? 640 / maxDim : 1;
              const w = Math.floor(video.videoWidth * scale);
              const h = Math.floor(video.videoHeight * scale);

              canvas.width = w;
              canvas.height = h;
              ctx.drawImage(video, 0, 0, w, h);

              const imgData = ctx.getImageData(0, 0, w, h);
              const qr = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: 'attemptBoth'
              });

              if (qr && qr.data) {
                detectedCode = qr.data;
              }
            }
          }

          // Trigger detection with debouncing (Fast 1-step attendance)
          if (detectedCode) {
            const rawData = detectedCode.trim();
            const now = Date.now();
            // Fast scan: If different card, 600ms cooldown; if same card, 2500ms debounce
            const isSameCard = rawData === lastDetectedId;
            const cooldown = isSameCard ? 2500 : 600;
            if (now - lastDetectedTime > cooldown) {
              lastDetectedId = rawData;
              lastDetectedTime = now;
              handleStudentDetected(rawData);
            }
          }
        } catch (e) {
          console.warn('Scan frame processing warning:', e);
        }
      }

      if (isMounted) {
        animationFrameId = requestAnimationFrame(scanLoop);
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeMode, selectedCameraId, cameraRestartCount, handleStudentDetected]);

  // Handle QR Scan from uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        let detected = false;

        // Try BarcodeDetector first on Image
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(img);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleStudentDetected(barcodes[0].rawValue);
              detected = true;
            }
          } catch {
            // fallback
          }
        }

        if (!detected) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;

          // Scale image down if larger than 1200px to avoid memory exhaustion
          const maxDim = Math.max(img.width, img.height);
          const scale = maxDim > 1200 ? 1200 / maxDim : 1;
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data) {
            handleStudentDetected(code.data);
          } else {
            playBeep('error');
            setScanNotification({
              title: 'Không Nhận Diện Được Mã QR',
              message: 'Vui lòng chọn ảnh chụp rõ nét, vuông góc với mã QR hoặc có độ tương phản cao.',
              type: 'error'
            });
            setTimeout(() => {
              setScanNotification(prev => (prev?.type === 'error' ? null : prev));
            }, 3500);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 text-[10px] font-black flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                  Điểm Danh Tức Thì (1 Bước - Không Cần Bấm Thêm)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Chuẩn hóa theo giờ thực tế
                </span>
                {assignedClassName && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Chỉ điểm danh: {assignedClassName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Tự động nhận diện Đúng Giờ (Loại A) hoặc Đi Trễ (Loại B, -0.1đ) theo giờ Thánh Lễ & Giáo Lý
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Sound Toggle Button */}
            <button
              type="button"
              onClick={toggleSound}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                soundOn
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
              title={soundOn ? 'Âm báo đang BẬT (bấm để tắt)' : 'Âm báo đang TẮT (bấm để bật)'}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-amber-300" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span className="hidden sm:inline">{soundOn ? 'Âm Báo: Bật' : 'Âm Báo: Tắt'}</span>
            </button>

            {/* History Modal Trigger */}
            {onOpenHistoryModal && (
              <button
                type="button"
                onClick={() => onOpenHistoryModal()}
                className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-400/30 cursor-pointer"
                title="Xem lịch sử điểm danh của học sinh hoặc lớp"
              >
                <History className="w-4 h-4 text-blue-300" />
                <span className="hidden sm:inline">Lịch Sử Điểm Danh</span>
              </button>
            )}

            <button 
              id="close-qr-scanner-btn"
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer ml-1"
              title="Đóng cửa sổ quét QR"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3 Interactive Modes Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-4 pt-2 gap-2 text-xs overflow-x-auto">
          <button
            type="button"
            id="qr-mode-camera-btn"
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
            id="qr-mode-upload-btn"
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
            id="qr-mode-manual-btn"
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
                <option value="Chúa Nhật">Chúa Nhật (7h30 tập trung • 8h00 Thánh lễ • 9h15 học giáo lý)</option>
                <option value="Thứ 5">Thứ 5 (2 lớp Bí Tích: 18h00 Học Giáo Lý)</option>
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
                <option value="auto">⚡ Tự động nhận diện theo giờ quét</option>
                {sessionType === 'Chúa Nhật' ? (
                  <>
                    <option value="tap_trung">1. Giờ Tập Trung (Mốc 07:30)</option>
                    <option value="gio_le">2. Giờ Thánh Lễ (Mốc 08:00)</option>
                    <option value="giao_ly">3. Giờ Học Giáo Lý (Mốc 09:15)</option>
                  </>
                ) : (
                  <option value="giao_ly">Học Giáo Lý Thứ 5 (Mốc 18:00 - mốc duy nhất)</option>
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
                Khung giờ:
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold text-xs">
                {currentEvaluation.slotLabel}
              </span>
              <span className="text-slate-600 text-xs">
                (Mốc đúng giờ: <strong className="font-mono">{currentEvaluation.targetTime}</strong>
                {effectiveScheduleInfo.isCustom && (
                  <span className="ml-1 text-amber-900 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                    ⚡ {effectiveScheduleInfo.customSchedule?.title || 'Ngoại thường'}
                  </span>
                )}
                )
              </span>

              <button
                type="button"
                id="qr-change-schedule-btn"
                onClick={() => setIsScheduleModalOpen(true)}
                className={`ml-1 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 border transition-all ${
                  effectiveScheduleInfo.isCustom
                    ? 'bg-amber-500 text-slate-950 border-amber-600 hover:bg-amber-400 font-bold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
                title="Thay đổi mốc giờ đúng giờ / đi muộn của ngày hôm nay (ngoại thường)"
              >
                <Clock className="w-3 h-3 text-current" />
                <span>{effectiveScheduleInfo.isCustom ? 'Sửa Giờ Ngoại Thường' : '⚙ Thay Đổi Giờ Ngày Này'}</span>
              </button>
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
              <div className="flex flex-col items-center justify-center bg-slate-950 rounded-xl p-4 text-white relative min-h-[340px]">
                {/* Camera device selection bar */}
                <div className="w-full mb-3 flex items-center justify-between text-xs bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 flex-wrap gap-2">
                  <span className="text-slate-300 flex items-center gap-1 text-[11px]">
                    <SwitchCamera className="w-3.5 h-3.5 text-amber-400" />
                    Thiết bị camera:
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {availableCameras.length > 0 ? (
                      <select
                        value={selectedCameraId}
                        onChange={(e) => setSelectedCameraId(e.target.value)}
                        className="bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-xs max-w-[200px] truncate"
                      >
                        {availableCameras.map((cam, idx) => (
                          <option key={cam.deviceId || idx} value={cam.deviceId}>
                            {cam.label || `Camera ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Đang dò camera...</span>
                    )}

                    <button
                      type="button"
                      onClick={() => setCameraRestartCount(c => c + 1)}
                      className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                      title="Khởi động lại camera"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Video Viewport - ALWAYS IN DOM so videoRef is ready */}
                <div className={`relative w-full aspect-4/3 max-w-md rounded-xl overflow-hidden border-2 transition-all bg-black flex items-center justify-center ${
                  flashSuccess ? 'border-emerald-400 ring-4 ring-emerald-400/50 scale-[1.01]' : 'border-amber-400/80 shadow-lg'
                }`}>
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover" 
                    playsInline 
                    autoPlay 
                    muted 
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Real-time Instant Attendance Success Overlay on Camera */}
                  {lastScannedResult && flashSuccess && (
                    <div className="absolute inset-x-3 top-3 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                      <div className={`p-3.5 rounded-2xl shadow-2xl border-2 flex items-center gap-3 backdrop-blur-md ${
                        lastScannedResult.status === 'A'
                          ? 'bg-emerald-700/95 border-emerald-300 text-white shadow-emerald-950/60'
                          : 'bg-amber-600/95 border-amber-300 text-white shadow-amber-950/60'
                      }`}>
                        <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                          <CheckCheck className="w-7 h-7 text-white animate-pulse" />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/25">
                              ✓ ĐÃ ĐIỂM DANH XONG
                            </span>
                            <span className="text-[11px] font-mono opacity-90">
                              {lastScannedResult.scanTime}
                            </span>
                          </div>
                          <div className="text-base font-black truncate leading-tight mt-0.5">
                            {lastScannedResult.student.holyName} {lastScannedResult.student.fullName}
                          </div>
                          <div className="text-xs opacity-95 flex items-center gap-2 mt-0.5 font-medium flex-wrap">
                            <span className="font-mono bg-black/25 px-1.5 py-0.5 rounded text-[11px] font-bold">{lastScannedResult.student.id}</span>
                            <span>•</span>
                            <span>{classes.find(c => c.id === lastScannedResult.student.classId)?.name || lastScannedResult.student.classId}</span>
                            <span>•</span>
                            <span className="font-bold underline underline-offset-2">
                              {lastScannedResult.status === 'A' ? 'Loại A (Đúng giờ)' : 'Loại B (Trễ -0.1đ)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Non-blocking Notification Toast on Camera */}
                  {scanNotification && (
                    <div className="absolute inset-x-3 top-3 z-30 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className={`p-3 rounded-xl shadow-2xl border-2 flex items-center gap-3 backdrop-blur-md ${
                        scanNotification.type === 'error'
                          ? 'bg-rose-700/95 border-rose-300 text-white shadow-rose-950/60'
                          : 'bg-amber-600/95 border-amber-300 text-white shadow-amber-950/60'
                      }`}>
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1 text-left text-xs">
                          <div className="font-black uppercase tracking-wider">{scanNotification.title}</div>
                          <div className="opacity-95 leading-snug mt-0.5">{scanNotification.message}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scanning Overlay Grid & Target Box */}
                  {isCameraActive && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`w-52 h-52 rounded-2xl relative transition-all ${
                        flashSuccess ? 'border-4 border-emerald-400 bg-emerald-500/20' : 'border-2 border-amber-400/90'
                      }`}>
                        {/* 4 Corner brackets */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg"></div>

                        {/* Animated Laser Scanning Line */}
                        <div 
                          className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_12px_#f59e0b] animate-bounce" 
                          style={{ animationDuration: '2s' }}
                        ></div>
                      </div>

                      <div className="absolute bottom-2 inset-x-3 text-center text-[11px] bg-slate-900/90 py-1.5 px-3 rounded-full text-emerald-300 font-semibold border border-emerald-500/40 shadow-lg flex items-center justify-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 shrink-0" />
                        <span className="truncate">1 Bước duy nhất: Quét mã là hoàn tất, không cần bấm thêm</span>
                      </div>
                    </div>
                  )}

                  {/* Loading State Overlay */}
                  {isCameraLoading && !cameraError && (
                    <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-4 text-center space-y-2 z-10">
                      <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                      <p className="text-xs text-slate-300 font-medium">Đang kết nối camera thiết bị...</p>
                    </div>
                  )}

                  {/* Camera Error Overlay */}
                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                      <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                      <p className="text-xs text-rose-200 max-w-sm leading-relaxed">{cameraError}</p>
                      
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setCameraRestartCount(c => c + 1)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Thử Lại Camera</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMode('upload')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Tải Ảnh QR</span>
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
                </div>

                {/* Quick keyboard search inside camera mode */}
                <div className="w-full mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Hoặc gõ nhanh mã thẻ (vd: DBS-KT-001, DBS-SC-004, 001)..."
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
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Điểm Danh
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeMode === 'upload' && (
              /* Mode 2: Upload Image of QR */
              <div className="bg-slate-50 border-2 border-dashed border-emerald-300 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[340px]">
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
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col space-y-3 min-h-[340px]">
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
                      placeholder="Nhập mã học sinh (vd: DBS-KT-001, DBS-SC-004, 001)..."
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
                  {accessibleStudents
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
                <span>Thử nghiệm nhanh không cần thẻ ({assignedClassName || 'Toàn xứ'}):</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {accessibleStudents.slice(0, 4).map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleStudentDetected(st.id)}
                    className="px-2 py-1 bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-400 text-slate-700 hover:text-amber-900 rounded text-[11px] font-medium transition-colors cursor-pointer truncate max-w-[130px]"
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
              <div className={`border rounded-xl p-3.5 shadow-xs animate-in fade-in zoom-in-95 duration-200 ${
                lastScannedResult.isDuplicate
                  ? 'bg-amber-100 border-amber-400 text-amber-950'
                  : lastScannedResult.status === 'A' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                    : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {lastScannedResult.isDuplicate ? (
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    ) : lastScannedResult.status === 'A' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      {lastScannedResult.isDuplicate
                        ? 'ĐÃ ĐIỂM DANH HÔM NAY (QUÉT LẶP LẠI)'
                        : lastScannedResult.status === 'A' 
                          ? 'ĐIỂM DANH ĐẠT (ĐÚNG GIỜ)' 
                          : 'ĐIỂM DANH TRỄ (-0.1Đ)'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                    lastScannedResult.isDuplicate
                      ? 'bg-amber-600 text-white'
                      : lastScannedResult.status === 'A' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-amber-500 text-white'
                  }`}>
                    {lastScannedResult.isDuplicate ? 'Đã Ghi Nhận' : `Loại ${lastScannedResult.status}`}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900">
                  {lastScannedResult.student.holyName} {lastScannedResult.student.fullName}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Mã số: <span className="font-mono font-bold text-slate-900">{lastScannedResult.student.id}</span>
                </div>

                <div className="mt-2 text-[11px] bg-white/90 p-2 rounded-lg border border-slate-200/60 space-y-0.5">
                  <div>Trạng thái: <strong>Loại {lastScannedResult.status}</strong></div>
                  <div>Thời gian điểm danh: <strong className="font-mono">{lastScannedResult.scanTime}</strong></div>
                  <div className={lastScannedResult.isDuplicate ? "text-amber-800 font-semibold" : "text-slate-600"}>
                    {lastScannedResult.reason}
                  </div>
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

      {isScheduleModalOpen && (
        <CustomScheduleModal
          initialDate={sessionDate}
          initialSessionType={sessionType}
          customSchedules={internalCustomSchedules}
          onScheduleUpdated={(updated) => {
            setInternalCustomSchedules(updated);
            if (onScheduleUpdated) {
              onScheduleUpdated(updated);
            }
          }}
          onClose={() => setIsScheduleModalOpen(false)}
        />
      )}
    </div>
  );
};
