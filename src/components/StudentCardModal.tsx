import React, { useEffect, useState } from 'react';
import { X, Printer, Download, CheckSquare, Square } from 'lucide-react';
import { Student, ClassRoom } from '../types';
import { generateQRCodeDataUrl } from '../utils/qrHelper';

interface StudentCardModalProps {
  students: Student[];
  classes: ClassRoom[];
  selectedClassId?: string;
  onClose: () => void;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
  students,
  classes,
  selectedClassId,
  onClose,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [filterClassId, setFilterClassId] = useState<string>(selectedClassId || 'all');

  const filteredStudents = students.filter(s => 
    filterClassId === 'all' ? true : s.classId === filterClassId
  );

  useEffect(() => {
    // Select all displayed by default
    setSelectedIds(filteredStudents.map(s => s.id));
  }, [filterClassId]);

  useEffect(() => {
    let isMounted = true;
    async function loadQRs() {
      const map: Record<string, string> = {};
      for (const st of filteredStudents) {
        // QR payload contains student ID and verification token
        const payload = `DBS-STUDENT:${st.id}:${st.fullName}`;
        const url = await generateQRCodeDataUrl(payload);
        map[st.id] = url;
      }
      if (isMounted) setQrMap(map);
    }
    loadQRs();
    return () => { isMounted = false; };
  }, [filteredStudents]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getClassName = (cid: string) => {
    return classes.find(c => c.id === cid)?.name || cid;
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col my-auto border border-slate-200">
        {/* Header - Screen only */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-t-xl print:hidden">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>Thẻ Học Sinh Giáo Lý Don Bosco Đà Lạt</span>
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                In kèm mã QR Điểm Danh
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              In thẻ để học sinh đeo khi tham dự Thánh lễ và học giáo lý, quét mã điểm danh tự động.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700"
            >
              <option value="all">Tất cả các lớp</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <button
              onClick={toggleAll}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-md hover:bg-slate-100 text-slate-700 flex items-center gap-1"
            >
              {selectedIds.length === filteredStudents.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                  <span>Bỏ chọn tất cả</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>Chọn tất cả ({filteredStudents.length})</span>
                </>
              )}
            </button>

            <button
              id="print-cards-btn"
              onClick={handlePrint}
              disabled={selectedIds.length === 0}
              className="text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-md font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In {selectedIds.length} thẻ</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area - Scrollable on screen, Full page on Print */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/60 print:bg-white print:p-0">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Không tìm thấy học sinh nào trong lớp đã chọn.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
              {filteredStudents.map((st) => {
                const isSelected = selectedIds.includes(st.id);
                if (!isSelected) return null;

                return (
                  <div
                    key={st.id}
                    className="relative bg-white border-2 border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between overflow-hidden print:shadow-none print:break-inside-avoid print:border-slate-700"
                    style={{ minHeight: '230px' }}
                  >
                    {/* Checkbox toggle (screen only) */}
                    <button
                      onClick={() => toggleSelect(st.id)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-800 print:hidden"
                      title="Chọn in"
                    >
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    </button>

                    {/* Card Header */}
                    <div className="border-b border-amber-600/40 pb-2 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-700 font-bold text-base">✝</span>
                          <div>
                            <div className="text-[10px] font-bold tracking-wider uppercase text-blue-950">
                              GIÁO SỞ DON BOSCO ĐÀ LẠT
                            </div>
                            <div className="text-[9px] font-semibold text-amber-800 uppercase">
                              BAN GIÁO LÝ THIẾU NHI
                            </div>
                          </div>
                        </div>
                        <div className="text-right pr-6 print:pr-0">
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">
                            Niên khóa 2026-2027
                          </span>
                        </div>
                      </div>
                      <div className="text-center mt-1">
                        <h3 className="text-xs font-black tracking-widest text-slate-800 uppercase">
                          THẺ HỌC SINH GIÁO LÝ
                        </h3>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="flex items-center gap-3.5 flex-1">
                      {/* Photo / Avatar */}
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-24 bg-slate-100 border border-slate-300 rounded-md overflow-hidden flex items-center justify-center relative">
                          {st.avatarUrl ? (
                            <img 
                              src={st.avatarUrl} 
                              alt={st.fullName} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="text-center p-1">
                              <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm mb-1">
                                {st.holyName.charAt(0)}
                              </div>
                              <span className="text-[8px] text-slate-400 font-medium">ẢNH 3x4</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-600 mt-1 font-semibold">{st.id}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 space-y-1 text-slate-800 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-medium">Tên Thánh:</span>
                          <span className="font-bold text-amber-900 text-sm">{st.holyName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-medium">Họ và tên:</span>
                          <span className="font-bold text-slate-900 text-sm">{st.fullName}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px] pt-0.5">
                          <div>
                            <span className="text-slate-500">Lớp:</span>{' '}
                            <span className="font-semibold text-blue-900">{getClassName(st.classId)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Sinh:</span>{' '}
                            <span>{new Date(st.dob).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-500">Giáo họ:</span>{' '}
                            <span className="font-medium">{st.subParish}</span>
                          </div>
                        </div>
                      </div>

                      {/* QR Code */}
                      <div className="flex flex-col items-center justify-center pl-2 border-l border-slate-200">
                        {qrMap[st.id] ? (
                          <img 
                            src={qrMap[st.id]} 
                            alt={`QR ${st.id}`} 
                            className="w-20 h-20 border border-slate-200 rounded p-0.5 bg-white"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                            Đang tạo QR...
                          </div>
                        )}
                        <span className="text-[8px] text-slate-500 mt-0.5 font-medium">Quét Điểm Danh</span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="border-t border-slate-200 mt-2 pt-1 flex items-center justify-between text-[9px] text-slate-500">
                      <span>Phụ huynh: {st.parentName} ({st.parentPhone})</span>
                      <span className="italic font-serif">Don Bosco Đà Lạt</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info (screen only) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center rounded-b-xl print:hidden">
          <span>Gợi ý: Chọn khổ giấy A4, hướng ngang hoặc dọc để in được từ 4 đến 8 thẻ mỗi trang.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-md"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
