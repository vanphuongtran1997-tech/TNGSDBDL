import React, { useState } from 'react';
import { 
  GraduationCap, 
  UserPlus, 
  Award, 
  Calendar, 
  Mail, 
  Phone, 
  Star, 
  Clock, 
  Heart, 
  ShieldCheck, 
  BookOpen,
  Search,
  Plus
} from 'lucide-react';
import { Catechist, CatechistEvaluation, ClassRoom, Role } from '../types';

interface CatechistManagerProps {
  catechists: Catechist[];
  evaluations: CatechistEvaluation[];
  classes: ClassRoom[];
  userRole: Role;
  onAddCatechist: (cat: Omit<Catechist, 'id'>) => void;
  onUpdateCatechist: (cat: Catechist) => void;
  onAddEvaluation: (evalItem: Omit<CatechistEvaluation, 'id'>) => void;
}

export const CatechistManager: React.FC<CatechistManagerProps> = ({
  catechists,
  evaluations,
  classes,
  userRole,
  onAddCatechist,
  onUpdateCatechist,
  onAddEvaluation,
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'evaluation' | 'training'>('roster');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [activeEvalCat, setActiveEvalCat] = useState<Catechist | null>(null);

  // Evaluation Form State
  const [reasonScore, setReasonScore] = useState<number>(9);
  const [religionScore, setReligionScore] = useState<number>(9);
  const [lovingScore, setLovingScore] = useState<number>(9);
  const [preventiveScore, setPreventiveScore] = useState<number>(9);
  const [evalComments, setEvalComments] = useState<string>('');

  // Add Catechist Form State
  const [newCatData, setNewCatData] = useState({
    holyName: 'Maria',
    fullName: '',
    title: 'Giáo lý viên cơ hữu' as Catechist['title'],
    assignedClassId: classes[0]?.id || '',
    email: '',
    phone: '',
    patronSaintDay: '15/08',
    serviceYears: 1,
    status: 'Đang giảng dạy' as Catechist['status'],
  });

  const canEvaluate = userRole === 'admin' || userRole === 'pastor' || userRole === 'catechist_leader';

  const filteredCatechists = catechists.filter(c => 
    c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.holyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEvaluationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvalCat) return;

    const totalAvg = Math.round(((reasonScore + religionScore + lovingScore + preventiveScore) / 4) * 100) / 100;

    onAddEvaluation({
      catechistId: activeEvalCat.id,
      academicYear: '2026 - 2027',
      evaluatorName: (userRole === 'admin' || userRole === 'pastor') ? 'Ban Quản Trị / Lm. Quản sở' : 'Gioan Baotixita Trần Minh Tâm',
      evaluatorRole: (userRole === 'admin' || userRole === 'pastor') ? 'Quản Trị Viên / Cha Quản sở' : 'Trưởng Ban Giáo Lý',
      reasonScore,
      religionScore,
      lovingKindnessScore: lovingScore,
      preventiveMethodScore: preventiveScore,
      totalAverage: totalAvg,
      comments: evalComments,
      date: new Date().toISOString().split('T')[0],
    });

    alert(`Đã lưu đánh giá cho GLV ${activeEvalCat.holyName} ${activeEvalCat.fullName}!`);
    setActiveEvalCat(null);
  };

  const handleAddCatechistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedClass = classes.find(c => c.id === newCatData.assignedClassId);
    onAddCatechist({
      ...newCatData,
      assignedClassName: assignedClass?.name,
    });
    setIsAddCatModalOpen(false);
  };

  const getEvaluationForCat = (catId: string) => {
    return evaluations.find(e => e.catechistId === catId);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-800" />
              <span>Đội Ngũ Giáo Lý Viên & Huấn Luyện Don Bosco</span>
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý danh sách ban giảng huấn, theo dõi lớp phụ trách và đánh giá theo Hệ Thống Dự Phòng Don Bosco
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canEvaluate && (
              <button
                onClick={() => setIsAddCatModalOpen(true)}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Thêm Giáo Lý Viên Mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Salesian Pedagogy Reminder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <span className="font-bold text-slate-800">Lý Trí (Ragione)</span>
              <p className="text-[11px] text-slate-500">Chuẩn bị bài giảng, kiến thức giáo lý vững vàng, đúng giờ giấc.</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <span className="font-bold text-slate-800">Tôn Giáo (Religione)</span>
              <p className="text-[11px] text-slate-500">Gương mẫu đức tin, tham dự thánh lễ & chầu Thánh Thể hàng tuần.</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded bg-rose-100 text-rose-800 font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <span className="font-bold text-slate-800">Lòng Thương Mến (Amorevolezza)</span>
              <p className="text-[11px] text-slate-500">Hiện diện giữa thiếu nhi nơi sân chơi, lắng nghe và thấu hiểu.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 gap-3 text-xs font-semibold shadow-2xs">
        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-2.5 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'roster' ? 'border-blue-700 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Danh Sách Giáo Lý Viên ({catechists.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('evaluation')}
          className={`pb-2.5 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'evaluation' ? 'border-blue-700 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Bảng Đánh Giá & Phiếu Nhận Xét ({evaluations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('training')}
          className={`pb-2.5 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'training' ? 'border-blue-700 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Lộ Trình Đào Tạo 2026 - 2027</span>
        </button>
      </div>

      {/* Roster View */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-200">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm GLV theo tên, chức vụ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Tên Thánh & Họ Tên</th>
                  <th className="py-2.5 px-3">Chức Vụ / Phân Hạng</th>
                  <th className="py-2.5 px-3">Lớp Đang Phụ Trách</th>
                  <th className="py-2.5 px-3">Bổn Mạng</th>
                  <th className="py-2.5 px-3">Liên Hệ</th>
                  <th className="py-2.5 px-3">Thâm Niên</th>
                  <th className="py-2.5 px-3">Đánh Giá</th>
                  <th className="py-2.5 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredCatechists.map((cat) => {
                  const ev = getEvaluationForCat(cat.id);
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">
                          <span className="text-amber-800 mr-1">{cat.holyName}</span>
                          <span>{cat.fullName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{cat.id}</span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cat.title === 'Linh mục Quản sở' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          cat.title === 'Tu sĩ Salêdiêng' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                          cat.title === 'Huynh trưởng' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                          cat.title === 'Dự trưởng' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {cat.title}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-medium text-blue-900">
                        {cat.assignedClassName || 'Toàn giáo sở'}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        {cat.patronSaintDay}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-mono text-[11px] text-slate-800">{cat.phone}</div>
                        <div className="text-[10px] text-slate-500">{cat.email}</div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        {cat.serviceYears} năm
                      </td>

                      <td className="py-2.5 px-3">
                        {ev ? (
                          <div className="flex items-center gap-1 text-amber-600 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>{ev.totalAverage.toFixed(2)} / 10</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Chưa đánh giá</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {canEvaluate && cat.title !== 'Linh mục Quản sở' && (
                          <button
                            onClick={() => {
                              setActiveEvalCat(cat);
                              setReasonScore(ev?.reasonScore || 9);
                              setReligionScore(ev?.religionScore || 9);
                              setLovingScore(ev?.lovingKindnessScore || 9);
                              setPreventiveScore(ev?.preventiveMethodScore || 9);
                              setEvalComments(ev?.comments || '');
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 ml-auto"
                          >
                            <Star className="w-3 h-3" />
                            <span>{ev ? 'Cập Nhật Đánh Giá' : 'Đánh Giá GLV'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evaluations View */}
      {activeTab === 'evaluation' && (
        <div className="space-y-3">
          {evaluations.map((ev) => {
            const cat = catechists.find(c => c.id === ev.catechistId);
            return (
              <div key={ev.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {cat?.holyName} {cat?.fullName} — {cat?.title} ({cat?.assignedClassName})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Người đánh giá: <strong>{ev.evaluatorName}</strong> ({ev.evaluatorRole}) • Ngày: {ev.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-amber-600">{ev.totalAverage.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400"> / 10 điểm</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Lý trí:</span>
                    <strong className="text-slate-900">{ev.reasonScore.toFixed(1)} / 10</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Tôn giáo:</span>
                    <strong className="text-slate-900">{ev.religionScore.toFixed(1)} / 10</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Lòng thương mến:</span>
                    <strong className="text-slate-900">{ev.lovingKindnessScore.toFixed(1)} / 10</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Hệ thống dự phòng:</span>
                    <strong className="text-slate-900">{ev.preventiveMethodScore.toFixed(1)} / 10</strong>
                  </div>
                </div>

                <div className="p-2.5 bg-amber-50/50 rounded border border-amber-200 text-slate-800 italic">
                  "{ev.comments}"
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Training Program View matching PDF Pages 1-4 */}
      {activeTab === 'training' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              KẾ HOẠCH ĐÀO TẠO GIÁO LÝ VIÊN CƠ HỮU NIÊN KHÓA 2026 – 2027
            </h2>
            <p className="text-slate-500 text-[11px]">Ban Giáo Lý Giáo Sở Don Bosco Đà Lạt</p>
          </div>

          <div className="space-y-3 text-slate-700">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="text-slate-900 text-xs block mb-1">Mục tiêu đào tạo:</strong>
              <p>Đào tạo những người có khả năng thi hành tác vụ huấn giáo nhân danh Hội Thánh theo 3 chiều kích: hiệp thông với Thiên Chúa, hiệp thông với Hội Thánh và hiệp thông với mọi người.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <strong className="text-slate-900 text-xs block mb-1">Thời gian & Lịch sinh hoạt đào tạo:</strong>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Lớp đào tạo dự trưởng: 19h00 - 20h30 Thứ 3 & Thứ 6 hàng tuần tại Giáo sở</li>
                  <li>GLV Tĩnh tâm & Chầu Thánh Thể: 19h00 Thứ Bảy đầu tháng</li>
                  <li>Họp Giáo lý viên: Sau giờ dạy giáo lý (10h30 Chúa Nhật)</li>
                  <li>Đào tạo Tông đồ đội trưởng: Tối Thứ 7 hàng tuần (19h00 - 20h30) từ 10/10/2026</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <strong className="text-slate-900 text-xs block mb-1">Đội ngũ Huấn luyện viên:</strong>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Linh mục Quản sở Giáo sở Don Bosco Đà Lạt</li>
                  <li>Quý Tu sĩ Dòng Salêdiêng Don Bosco</li>
                  <li>Quý Sơ & Ban Huynh trưởng cơ hữu</li>
                  <li>Đang đào tạo: 12 em dự trưởng, bổ sung thêm 5 em niên khóa mới</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {activeEvalCat && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 text-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Đánh Giá Giáo Lý Viên: {activeEvalCat.holyName} {activeEvalCat.fullName}
            </h3>
            <p className="text-slate-500 mb-3 text-[11px]">
              Đánh giá theo 4 tiêu chí cốt lõi của Hệ thống Giáo dục Dự phòng Don Bosco (thang điểm 1 - 10)
            </p>

            <form onSubmit={handleEvaluationSubmit} className="space-y-3">
              <div>
                <label className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>1. Lý Trí (Soạn bài giảng, giáo án, đúng giờ):</span>
                  <span className="text-blue-900 font-bold font-mono">{reasonScore} đ</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={reasonScore}
                  onChange={(e) => setReasonScore(parseFloat(e.target.value))}
                  className="w-full accent-blue-700"
                />
              </div>

              <div>
                <label className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>2. Tôn Giáo (Gương mẫu đức tin, tham dự thánh lễ, chầu):</span>
                  <span className="text-blue-900 font-bold font-mono">{religionScore} đ</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={religionScore}
                  onChange={(e) => setReligionScore(parseFloat(e.target.value))}
                  className="w-full accent-blue-700"
                />
              </div>

              <div>
                <label className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>3. Lòng Thương Mến (Thân thiện, gần gũi sân chơi, lắng nghe):</span>
                  <span className="text-blue-900 font-bold font-mono">{lovingScore} đ</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={lovingScore}
                  onChange={(e) => setLovingScore(parseFloat(e.target.value))}
                  className="w-full accent-blue-700"
                />
              </div>

              <div>
                <label className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>4. Phương pháp Lectio Divina & Hệ Thống Dự Phòng:</span>
                  <span className="text-blue-900 font-bold font-mono">{preventiveScore} đ</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={preventiveScore}
                  onChange={(e) => setPreventiveScore(parseFloat(e.target.value))}
                  className="w-full accent-blue-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nhận Xét & Lời Khuyên Của Cha Quản Sở / Ban Giáo Lý:</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ghi nhận ưu điểm, những điểm cần phát huy và khích lệ giáo lý viên..."
                  value={evalComments}
                  onChange={(e) => setEvalComments(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setActiveEvalCat(null)}
                  className="px-3 py-1.5 border rounded text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 text-white rounded font-semibold"
                >
                  Lưu Đánh Giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Catechist Modal */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 border border-slate-200 text-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Thêm Giáo Lý Viên Mới</h3>
            <form onSubmit={handleAddCatechistSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tên Thánh:</label>
                  <input
                    type="text"
                    required
                    value={newCatData.holyName}
                    onChange={(e) => setNewCatData({ ...newCatData, holyName: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Họ và Tên:</label>
                  <input
                    type="text"
                    required
                    value={newCatData.fullName}
                    onChange={(e) => setNewCatData({ ...newCatData, fullName: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Chức Vụ:</label>
                  <select
                    value={newCatData.title}
                    onChange={(e) => setNewCatData({ ...newCatData, title: e.target.value as Catechist['title'] })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  >
                    <option value="Giáo lý viên cơ hữu">Giáo lý viên cơ hữu</option>
                    <option value="Huynh trưởng">Huynh trưởng</option>
                    <option value="Dự trưởng">Dự trưởng</option>
                    <option value="Tông đồ Đội trưởng">Tông đồ Đội trưởng</option>
                    <option value="Tu sĩ Salêdiêng">Tu sĩ Salêdiêng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Phụ Trách Lớp:</label>
                  <select
                    value={newCatData.assignedClassId}
                    onChange={(e) => setNewCatData({ ...newCatData, assignedClassId: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Số ĐT:</label>
                  <input
                    type="tel"
                    required
                    value={newCatData.phone}
                    onChange={(e) => setNewCatData({ ...newCatData, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Email:</label>
                  <input
                    type="email"
                    required
                    value={newCatData.email}
                    onChange={(e) => setNewCatData({ ...newCatData, email: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="px-3 py-1 border rounded text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-blue-700 text-white rounded font-semibold"
                >
                  Lưu Hồ Sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
