import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Info,
  Trash2,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';
import { CustomDateSchedule, AttendanceTimeSlot } from '../types';
import { 
  SUNDAY_TIME_CONFIGS, 
  THURSDAY_TIME_CONFIGS, 
  saveCustomSchedule, 
  deleteCustomSchedule, 
  getEffectiveTimeConfigs 
} from '../utils/attendanceTimeUtils';

interface CustomScheduleModalProps {
  initialDate: string; // YYYY-MM-DD
  initialSessionType: 'Chúa Nhật' | 'Thứ 5';
  customSchedules: Record<string, CustomDateSchedule>;
  onScheduleUpdated: (updatedSchedules: Record<string, CustomDateSchedule>) => void;
  onClose: () => void;
}

export const CustomScheduleModal: React.FC<CustomScheduleModalProps> = ({
  initialDate,
  initialSessionType,
  customSchedules,
  onScheduleUpdated,
  onClose,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedSessionType, setSelectedSessionType] = useState<'Chúa Nhật' | 'Thứ 5'>(initialSessionType);

  // Read current effective schedule for selected date & session
  const effectiveInfo = getEffectiveTimeConfigs(selectedDate, selectedSessionType, customSchedules);
  const currentCustom = effectiveInfo.customSchedule;

  const baseConfigs = selectedSessionType === 'Chúa Nhật' ? SUNDAY_TIME_CONFIGS : THURSDAY_TIME_CONFIGS;

  // Form State
  const [tapTrungTime, setTapTrungTime] = useState<string>(
    currentCustom?.targetTimes?.tap_trung || baseConfigs.tap_trung.targetTime
  );
  const [gioLeTime, setGioLeTime] = useState<string>(
    currentCustom?.targetTimes?.gio_le || baseConfigs.gio_le.targetTime
  );
  const [giaoLyTime, setGiaoLyTime] = useState<string>(
    currentCustom?.targetTimes?.giao_ly || baseConfigs.giao_ly.targetTime
  );
  const [eventTitle, setEventTitle] = useState<string>(currentCustom?.title || '');
  const [eventNote, setEventNote] = useState<string>(currentCustom?.note || '');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // When selectedDate or selectedSessionType changes, update form fields
  const handleDateOrSessionChange = (newDate: string, newSession: 'Chúa Nhật' | 'Thứ 5') => {
    setSelectedDate(newDate);
    setSelectedSessionType(newSession);
    const info = getEffectiveTimeConfigs(newDate, newSession, customSchedules);
    const base = newSession === 'Chúa Nhật' ? SUNDAY_TIME_CONFIGS : THURSDAY_TIME_CONFIGS;
    if (info.customSchedule) {
      setTapTrungTime(info.customSchedule.targetTimes.tap_trung || base.tap_trung.targetTime);
      setGioLeTime(info.customSchedule.targetTimes.gio_le || base.gio_le.targetTime);
      setGiaoLyTime(info.customSchedule.targetTimes.giao_ly || base.giao_ly.targetTime);
      setEventTitle(info.customSchedule.title || '');
      setEventNote(info.customSchedule.note || '');
    } else {
      setTapTrungTime(base.tap_trung.targetTime);
      setGioLeTime(base.gio_le.targetTime);
      setGiaoLyTime(base.giao_ly.targetTime);
      setEventTitle('');
      setEventNote('');
    }
    setSaveFeedback(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const finalTargetTimes = selectedSessionType === 'Chúa Nhật' ? {
      tap_trung: tapTrungTime || baseConfigs.tap_trung.targetTime,
      gio_le: gioLeTime || baseConfigs.gio_le.targetTime,
      giao_ly: giaoLyTime || baseConfigs.giao_ly.targetTime,
    } : {
      tap_trung: giaoLyTime || '18:00',
      gio_le: giaoLyTime || '18:00',
      giao_ly: giaoLyTime || '18:00',
    };

    const newSchedule: CustomDateSchedule = {
      date: selectedDate,
      sessionType: selectedSessionType,
      title: eventTitle.trim() || (selectedSessionType === 'Chúa Nhật' ? 'Lịch Chúa Nhật Ngoại Thường' : 'Lịch Giáo Lý Thứ 5 Ngoại Thường'),
      targetTimes: finalTargetTimes,
      note: eventNote.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    const updated = saveCustomSchedule(newSchedule);
    onScheduleUpdated(updated);
    setSaveFeedback(`Đã lưu thành công mốc giờ ngoại thường cho ngày ${selectedDate}!`);
    setTimeout(() => {
      setSaveFeedback(null);
    }, 3000);
  };

  const handleResetToDefault = () => {
    const defaultTimeStr = selectedSessionType === 'Chúa Nhật' ? '7h30 / 8h00 / 9h15' : '18h00';
    if (confirm(`Bạn có chắc chắn muốn khôi phục mốc giờ chuẩn mặc định (${defaultTimeStr}) cho ngày ${selectedDate}?`)) {
      const updated = deleteCustomSchedule(selectedDate, selectedSessionType);
      onScheduleUpdated(updated);
      setTapTrungTime(baseConfigs.tap_trung.targetTime);
      setGioLeTime(baseConfigs.gio_le.targetTime);
      setGiaoLyTime(baseConfigs.giao_ly.targetTime);
      setEventTitle('');
      setEventNote('');
      setSaveFeedback(`Đã xóa mốc ngoại thường và trở về giờ chuẩn mặc định!`);
      setTimeout(() => {
        setSaveFeedback(null);
      }, 3000);
    }
  };

  const handleDeleteSavedSchedule = (dateToDelete: string, sessionToDelete: 'Chúa Nhật' | 'Thứ 5') => {
    if (confirm(`Xóa mốc giờ ngoại thường của ngày ${dateToDelete} (${sessionToDelete})?`)) {
      const updated = deleteCustomSchedule(dateToDelete, sessionToDelete);
      onScheduleUpdated(updated);
      if (dateToDelete === selectedDate && sessionToDelete === selectedSessionType) {
        setTapTrungTime(baseConfigs.tap_trung.targetTime);
        setGioLeTime(baseConfigs.gio_le.targetTime);
        setGiaoLyTime(baseConfigs.giao_ly.targetTime);
        setEventTitle('');
        setEventNote('');
      }
    }
  };

  // Quick preset suggestions
  const commonEvents = [
    'Lễ Khai Giảng Năm Học',
    'Lễ Bổn Mạng Don Bosco',
    'Chúa Nhật Lễ Phục Sinh',
    'Tập Trung Tĩnh Tâm Mùa Vọng',
    'Đại Hội Giới Trẻ / Lễ Ra Trường',
    'Lễ Bế Giảng Năm Học Giáo Lý',
  ];

  const tapTrungPresets = ['07:00', '07:15', '07:20', '07:30', '07:45'];
  const gioLePresets = ['07:45', '07:50', '08:00', '08:15', '08:30'];
  const giaoLyPresets = ['09:00', '09:10', '09:15', '09:20', '09:30'];
  const thursdayPresets = ['17:30', '17:45', '18:00', '18:15', '18:30'];

  // All custom schedules list
  const allCustomEntries: CustomDateSchedule[] = (Object.values(customSchedules) as CustomDateSchedule[]).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Thiết Lập Mốc Giờ Điểm Danh</span>
                <span className="text-[11px] bg-amber-500 text-slate-950 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Ngoại Thường
                </span>
              </h2>
              <p className="text-xs text-blue-100/80">
                Điều chỉnh mốc thời gian đúng giờ / đi muộn linh hoạt theo ngày sinh hoạt thực tế
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Rules Explanation Card */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-xs text-amber-950 flex items-center gap-2">
                <span>Quy tắc đánh giá mốc thời gian:</span>
                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300 text-[11px]">
                  Mặc định giờ tập trung: 07:30
                </span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                • <strong>Sớm hơn hoặc bằng (≤ mốc thời gian):</strong> Tính là <strong>Bình thường / Đúng giờ (Loại A)</strong>, đạt yêu cầu không trừ điểm.<br />
                • <strong>Muộn hơn (&gt; mốc thời gian):</strong> Tính là <strong>Đi muộn (Loại B)</strong>, hệ thống tự động ghi nhận số phút trễ và trừ 0.1 điểm chuyên cần.<br />
                • <strong>Trường hợp ngoại thường:</strong> Khi giáo sở đổi giờ tập trung, giờ lễ hoặc giờ giáo lý vào dịp lễ đặc biệt, bạn chỉnh mốc giờ bên dưới để máy quét QR và bảng điểm danh áp dụng chính xác cho ngày hôm đó.
              </p>
            </div>
          </div>

          {/* Date & Session Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-700" />
                Ngày áp dụng:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateOrSessionChange(e.target.value, selectedSessionType)}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800 font-semibold text-xs focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-700" />
                Buổi sinh hoạt:
              </label>
              <select
                value={selectedSessionType}
                onChange={(e) => handleDateOrSessionChange(selectedDate, e.target.value as 'Chúa Nhật' | 'Thứ 5')}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800 font-semibold text-xs focus:ring-1 focus:ring-amber-500"
              >
                <option value="Chúa Nhật">Chúa Nhật (7h30 tập trung • 8h00 Thánh lễ • 9h15 học giáo lý)</option>
                <option value="Thứ 5">Thứ 5 (2 lớp Bí Tích: 18h00 Học Giáo Lý)</option>
              </select>
            </div>
          </div>

          {/* Current Status Badge */}
          <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
            effectiveInfo.isCustom 
              ? 'bg-amber-50/80 border-amber-300 text-amber-950' 
              : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-2">
              {effectiveInfo.isCustom ? (
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <div>
                <span className="font-bold">
                  {effectiveInfo.isCustom 
                    ? `Đang áp dụng mốc giờ ngoại thường: ${effectiveInfo.customSchedule?.title || 'Đặc biệt'}`
                    : 'Đang áp dụng mốc giờ chuẩn mặc định của giáo sở'}
                </span>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {selectedSessionType === 'Chúa Nhật' ? (
                    <>Tập trung: {effectiveInfo.configs.tap_trung.targetTime} • Lễ: {effectiveInfo.configs.gio_le.targetTime} • Giáo lý: {effectiveInfo.configs.giao_ly.targetTime}</>
                  ) : (
                    <>Học Giáo Lý Thứ 5: {effectiveInfo.configs.giao_ly.targetTime} (Mốc duy nhất cho 2 lớp Bí Tích)</>
                  )}
                </div>
              </div>
            </div>

            {effectiveInfo.isCustom && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-xs text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                Khôi phục chuẩn
              </button>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            {/* Event Name & Tag */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                Tên sự kiện / Lý do đổi giờ ngoại thường (tùy chọn):
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Lễ Bổn Mạng Giáo Sở, Lễ Khai Giảng, Tập trung sớm..."
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-amber-500 mb-1.5"
              />
              <div className="flex flex-wrap gap-1.5">
                {commonEvents.map(ev => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => setEventTitle(ev)}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 transition-colors"
                  >
                    + {ev}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Adjusters */}
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-700" />
                {selectedSessionType === 'Chúa Nhật'
                  ? 'Mốc Thời Gian Chuẩn Cho Từng Khung Giờ (Chúa Nhật):'
                  : 'Mốc Thời Gian Cho 2 Lớp Học Thứ 5 (Chỉ có 1 mốc giờ này):'}
              </h3>

              {selectedSessionType === 'Chúa Nhật' ? (
                <>
                  {/* 1. Giờ Tập Trung */}
                  <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/40 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          1. Giờ Tập Trung
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Mốc chuẩn ban đầu: <strong>{baseConfigs.tap_trung.targetTime}</strong>. Quét thẻ ≤ mốc này tính là bình thường (A), sau mốc này là đi muộn (B).
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-600">Mốc giờ:</span>
                        <input
                          type="time"
                          value={tapTrungTime}
                          onChange={(e) => setTapTrungTime(e.target.value)}
                          required
                          className="border border-amber-400 rounded-lg px-2.5 py-1 text-xs font-mono font-bold bg-white text-slate-900 shadow-2xs w-28 text-center"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-600">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Chọn nhanh:</span>
                      <div className="flex flex-wrap gap-1">
                        {tapTrungPresets.map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setTapTrungTime(preset)}
                            className={`px-2 py-0.5 rounded font-mono text-[11px] border transition-colors ${
                              tapTrungTime === preset 
                                ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-100'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 2. Giờ Thánh Lễ */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          2. Giờ Thánh Lễ
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Mốc chuẩn ban đầu: <strong>{baseConfigs.gio_le.targetTime}</strong>. Quét thẻ sau mốc này tính là đi lễ trễ (B).
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-600">Mốc giờ:</span>
                        <input
                          type="time"
                          value={gioLeTime}
                          onChange={(e) => setGioLeTime(e.target.value)}
                          required
                          className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold bg-white text-slate-900 shadow-2xs w-28 text-center"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-600">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Chọn nhanh:</span>
                      <div className="flex flex-wrap gap-1">
                        {gioLePresets.map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setGioLeTime(preset)}
                            className={`px-2 py-0.5 rounded font-mono text-[11px] border transition-colors ${
                              gioLeTime === preset 
                                ? 'bg-blue-700 text-white border-blue-800 font-bold'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. Giờ Học Giáo Lý */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          3. Giờ Học Giáo Lý
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Mốc chuẩn ban đầu: <strong>{baseConfigs.giao_ly.targetTime}</strong>. Quét thẻ sau mốc này tính là vào lớp trễ (B).
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-600">Mốc giờ:</span>
                        <input
                          type="time"
                          value={giaoLyTime}
                          onChange={(e) => setGiaoLyTime(e.target.value)}
                          required
                          className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold bg-white text-slate-900 shadow-2xs w-28 text-center"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-600">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Chọn nhanh:</span>
                      <div className="flex flex-wrap gap-1">
                        {giaoLyPresets.map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setGiaoLyTime(preset)}
                            className={`px-2 py-0.5 rounded font-mono text-[11px] border transition-colors ${
                              giaoLyTime === preset 
                                ? 'bg-emerald-700 text-white border-emerald-800 font-bold'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Thứ 5: Chỉ có duy nhất 1 mốc giờ 18h00 Học Giáo Lý cho 2 lớp */
                <div className="p-4 rounded-xl border border-blue-300 bg-blue-50/50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                        Giờ Học Giáo Lý Thứ 5 (Mốc Giờ Duy Nhất)
                      </span>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Áp dụng riêng cho 2 lớp Bí Tích (Sơ Cấp 2 & Căn Bản 4). Mốc chuẩn ban đầu: <strong>18:00</strong>. Quét thẻ ≤ mốc này tính là bình thường (A), muộn hơn là đi muộn (B).
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-700">Mốc giờ:</span>
                      <input
                        type="time"
                        value={giaoLyTime}
                        onChange={(e) => {
                          setGiaoLyTime(e.target.value);
                          setTapTrungTime(e.target.value);
                          setGioLeTime(e.target.value);
                        }}
                        required
                        className="border border-blue-400 rounded-lg px-3 py-1.5 text-sm font-mono font-bold bg-white text-slate-900 shadow-2xs w-32 text-center"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-xs text-slate-700">
                    <span className="text-[11px] uppercase font-bold text-slate-500">Chọn nhanh mốc giờ:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {thursdayPresets.map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setGiaoLyTime(preset);
                            setTapTrungTime(preset);
                            setGioLeTime(preset);
                          }}
                          className={`px-2.5 py-1 rounded-md font-mono text-xs border transition-colors ${
                            giaoLyTime === preset 
                              ? 'bg-blue-700 text-white border-blue-800 font-bold shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-100'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ghi chú nội bộ (tùy chọn):
              </label>
              <textarea
                value={eventNote}
                onChange={(e) => setEventNote(e.target.value)}
                placeholder="Ví dụ: Cha Quản xứ thông báo tập trung sớm 15 phút để chuẩn bị đoàn rước..."
                rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Feedback Alert */}
            {saveFeedback && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg flex items-center gap-2 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveFeedback}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              {effectiveInfo.isCustom ? (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa Ngoại Thường & Trở Về Giờ Chuẩn</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  Chưa có mốc ngoại thường cho ngày này
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu Mốc Giờ Cho Ngày Này</span>
                </button>
              </div>
            </div>
          </form>

          {/* List of other custom schedules across the year */}
          {allCustomEntries.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-indigo-700" />
                Các Ngày Đang Có Mốc Giờ Ngoại Thường ({allCustomEntries.length}):
              </span>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {allCustomEntries.map((sch) => {
                  const isCurrent = sch.date === selectedDate && sch.sessionType === selectedSessionType;
                  return (
                    <div 
                      key={`${sch.date}_${sch.sessionType}`}
                      className={`p-2 rounded-lg border text-[11px] flex items-center justify-between gap-2 transition-colors ${
                        isCurrent 
                          ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-medium'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-900">
                          {sch.date}
                        </span>
                        <span className="font-semibold text-blue-900">({sch.sessionType}):</span>
                        <span>{sch.title || 'Lịch ngoại thường'}</span>
                        <span className="text-slate-400 font-mono">
                          {sch.sessionType === 'Chúa Nhật'
                            ? `[TT: ${sch.targetTimes.tap_trung || '07:30'} • Lễ: ${sch.targetTimes.gio_le || '08:00'} • GL: ${sch.targetTimes.giao_ly || '09:15'}]`
                            : `[Giáo lý: ${sch.targetTimes.giao_ly || '18:00'}]`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDateOrSessionChange(sch.date, sch.sessionType)}
                          className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-semibold transition-colors"
                        >
                          Chọn sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedSchedule(sch.date, sch.sessionType)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Xóa mốc giờ ngày này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
