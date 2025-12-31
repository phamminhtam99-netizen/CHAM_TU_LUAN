
import React, { useState } from 'react';
import { Header, StepIndicator } from './components/Layout';
import { AppStep, FileData, StudentSubmission } from './types';
import { fileToBase64, downloadCSV } from './utils/fileUtils';
import { gradeStudentPaper } from './services/geminiService';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.ANSWER_KEY);
  const [answerKeyFiles, setAnswerKeyFiles] = useState<FileData[]>([]);
  const [students, setStudents] = useState<StudentSubmission[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Handlers ---
  const handleAnswerKeyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const base64Files = await Promise.all(files.map(fileToBase64));
    setAnswerKeyFiles(prev => [...prev, ...base64Files]);
  };

  const handleCreateNewStudent = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const base64Files = await Promise.all(files.map(fileToBase64));
    
    const newStudent: StudentSubmission = {
      id: Math.random().toString(36).substr(2, 9),
      studentName: `Học sinh ${students.length + 1}`,
      files: base64Files,
      status: 'pending'
    };
    setStudents(prev => [...prev, newStudent]);
    e.target.value = '';
  };

  const handleAddFilesToStudent = async (studentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const base64Files = await Promise.all(files.map(fileToBase64));
    
    setStudents(prev => prev.map(s => 
      s.id === studentId 
        ? { ...s, files: [...s.files, ...base64Files] } 
        : s
    ));
    e.target.value = '';
  };

  const removeFileFromStudent = (studentId: string, fileIndex: number) => {
    setStudents(prev => prev.map(s => 
      s.id === studentId 
        ? { ...s, files: s.files.filter((_, i) => i !== fileIndex) } 
        : s
    ));
  };

  const startGrading = async () => {
    setStep(AppStep.GRADING);
    setIsProcessing(true);

    // Chấm từng bài một để tránh quá tải API và dễ quản lý lỗi
    for (const student of students) {
      if (student.status === 'completed') continue;
      
      try {
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status: 'processing' } : s));
        const result = await gradeStudentPaper(answerKeyFiles, student.files);
        setStudents(prev => prev.map(s => s.id === student.id ? { 
          ...s, 
          status: 'completed', 
          result,
          studentName: result.studentName 
        } : s));
      } catch (err: any) {
        console.error(`Lỗi khi chấm bài cho ${student.studentName}:`, err);
        setStudents(prev => prev.map(s => s.id === student.id ? { 
          ...s, 
          status: 'error', 
          error: err.message || 'Lỗi chấm bài'
        } : s));
      }
    }

    setIsProcessing(false);
    setStep(AppStep.RESULTS);
  };

  const handleExportCSV = () => {
    const completedStudents = students.filter(s => s.result);
    if (completedStudents.length === 0) return;

    // Thu thập tất cả các tên câu hỏi có mặt trong tất cả kết quả
    const allQuestionNames = new Set<string>();
    completedStudents.forEach(s => {
      s.result?.questionScores.forEach(qs => allQuestionNames.add(qs.questionNumber));
    });
    const sortedQuestions = Array.from(allQuestionNames).sort();

    const exportData = completedStudents.map((s, index) => {
      const base: any = {
        "STT": index + 1,
        "Tên học sinh": s.result?.studentName,
        "Tổng điểm": s.result?.totalScore,
        "Điểm tối đa": s.result?.maxTotalScore,
        "Nhận xét chung": s.result?.generalFeedback,
      };

      sortedQuestions.forEach(qName => {
        const scoreObj = s.result?.questionScores.find(qs => qs.questionNumber === qName);
        base[`${qName} (Điểm)`] = scoreObj ? scoreObj.score : "";
        base[`${qName} (Nhận xét)`] = scoreObj ? scoreObj.feedback : "";
      });

      return base;
    });

    downloadCSV(exportData, 'ket_qua_chi_tiet.csv');
  };

  const handleExportBriefCSV = () => {
    const completedStudents = students.filter(s => s.result);
    if (completedStudents.length === 0) return;

    const allQuestionNames = new Set<string>();
    completedStudents.forEach(s => {
      s.result?.questionScores.forEach(qs => allQuestionNames.add(qs.questionNumber));
    });
    const sortedQuestions = Array.from(allQuestionNames).sort();

    const exportData = completedStudents.map((s, index) => {
      const base: any = {
        "STT": index + 1,
        "Tên học sinh": s.result?.studentName,
        "Tổng điểm": s.result?.totalScore,
      };

      sortedQuestions.forEach(qName => {
        const scoreObj = s.result?.questionScores.find(qs => qs.questionNumber === qName);
        base[qName] = scoreObj ? scoreObj.score : "";
      });

      return base;
    });

    downloadCSV(exportData, 'ket_qua_van_tat.csv');
  };

  const reset = () => {
    setStep(AppStep.ANSWER_KEY);
    setAnswerKeyFiles([]);
    setStudents([]);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen pb-20">
      <Header />
      
      <main className="max-w-4xl mx-auto pt-10 px-4">
        <StepIndicator currentStep={step} />

        {/* STEP 0: ANSWER KEY */}
        {step === AppStep.ANSWER_KEY && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-bold mb-2">Tải lên đáp án</h2>
            <p className="text-slate-500 mb-8">Hệ thống cần đáp án để so sánh và chấm điểm. Bạn có thể tải lên nhiều ảnh hoặc tệp PDF.</p>
            
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                multiple 
                accept="image/*,application/pdf" 
                onChange={handleAnswerKeyUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-indigo-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <p className="font-semibold">Nhấn để chọn tệp đáp án</p>
              <p className="text-xs text-slate-400 mt-1">Hỗ trợ Ảnh JPG, PNG hoặc PDF</p>
            </div>

            {answerKeyFiles.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Danh sách tệp đáp án ({answerKeyFiles.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {answerKeyFiles.map((f, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 h-32 bg-slate-100 shadow-sm">
                      {f.mimeType.startsWith('image/') ? (
                        <img src={`data:${f.mimeType};base64,${f.data}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-white">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mb-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          <span className="text-[10px] line-clamp-2 text-slate-500">{f.name}</span>
                        </div>
                      )}
                      <button 
                        onClick={() => setAnswerKeyFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10 flex justify-end">
              <button 
                disabled={answerKeyFiles.length === 0}
                onClick={() => setStep(AppStep.STUDENT_SUBMISSIONS)}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
              >
                Tiếp tục: Tải bài học sinh
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: STUDENT SUBMISSIONS */}
        {step === AppStep.STUDENT_SUBMISSIONS && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-bold mb-2">Tải lên bài làm học sinh</h2>
            <p className="text-slate-500 mb-8">Bạn có thể tải nhiều trang cho mỗi học sinh. Sử dụng "Thêm trang" nếu bài làm có nhiều tờ.</p>
            
            <div className="space-y-6 mb-10">
              {students.map((student) => (
                <div key={student.id} className="p-6 rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition-all hover:border-indigo-200">
                  <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <div>
                        <input 
                          className="bg-transparent border-b border-slate-300 focus:border-indigo-600 outline-none font-bold text-slate-700 w-48 transition-colors"
                          value={student.studentName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, studentName: val } : s));
                          }}
                        />
                        <p className="text-xs text-slate-400 mt-1">{student.files.length} tệp bài làm</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative overflow-hidden group">
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*,application/pdf" 
                          onChange={(e) => handleAddFilesToStudent(student.id, e)}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <button className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 text-xs font-bold rounded-lg group-hover:bg-indigo-50 transition-colors flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          Thêm trang
                        </button>
                      </div>
                      <button 
                        onClick={() => setStudents(prev => prev.filter(s => s.id !== student.id))}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa học sinh"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {student.files.map((f, fIdx) => (
                      <div key={fIdx} className="relative group aspect-[3/4] rounded-md overflow-hidden border border-slate-200 bg-white">
                        {f.mimeType.startsWith('image/') ? (
                          <img src={`data:${f.mimeType};base64,${f.data}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50 text-red-400">
                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          </div>
                        )}
                        <button 
                          onClick={() => removeFileFromStudent(student.id, fIdx)}
                          className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[8px] text-white text-center py-0.5 backdrop-blur-sm">
                          Trang {fIdx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 hover:border-indigo-300 transition-all cursor-pointer relative group">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,application/pdf" 
                  onChange={handleCreateNewStudent}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2 text-indigo-600 font-bold group-hover:scale-105 transition-transform">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border border-indigo-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                  <span>Thêm học sinh mới</span>
                  <span className="text-xs font-normal text-slate-400">Chọn ảnh bài làm học sinh</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button 
                onClick={() => setStep(AppStep.ANSWER_KEY)}
                className="px-6 py-2 border border-slate-300 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-all"
              >
                Quay lại
              </button>
              <button 
                disabled={students.length === 0 || students.some(s => s.files.length === 0)}
                onClick={startGrading}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
              >
                Bắt đầu chấm bài ({students.length} học sinh)
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: GRADING IN PROGRESS */}
        {step === AppStep.GRADING && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="mb-8 flex justify-center">
               <div className="relative">
                  <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-indigo-600 font-bold">
                    {Math.round((students.filter(s => s.status === 'completed').length / students.length) * 100)}%
                  </div>
               </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Đang chấm bài...</h2>
            <p className="text-slate-500 mb-10 italic">AI đang phân tích chữ viết tay và đối chiếu với đáp án. Vui lòng chờ trong giây lát.</p>

            <div className="max-w-md mx-auto space-y-4 text-left">
              {students.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <span className="text-sm font-medium">{s.studentName}</span>
                  <div className="flex items-center gap-2">
                    {s.status === 'processing' && (
                      <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping"></span>
                    )}
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      s.status === 'completed' ? 'text-emerald-500' : 
                      s.status === 'error' ? 'text-red-500' : 
                      'text-slate-400'
                    }`}>
                      {s.status === 'completed' ? 'Hoàn thành' : 
                       s.status === 'error' ? 'Lỗi' : 
                       s.status === 'processing' ? 'Đang xử lý' : 'Chờ đợi'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: RESULTS */}
        {step === AppStep.RESULTS && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Kết quả chấm bài</h2>
                <p className="text-slate-500">Đã chấm xong {students.filter(s => s.status === 'completed').length} bài.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={handleExportBriefCSV}
                  className="px-5 py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 flex items-center gap-2 border border-indigo-200 transition-all active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a1 1 0 0 1 1 1v1h3V8a1 1 0 0 1 2 0v5h3V4a1 1 0 0 1 2 0v9h3a1 1 0 0 1 1 1"/></svg>
                  Xuất vắn tắt
                </button>
                <button 
                  onClick={handleExportCSV}
                  className="px-5 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2 transition-all active:scale-95 shadow-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Xuất chi tiết (CSV)
                </button>
                <button 
                  onClick={reset}
                  className="px-5 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Làm mới
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">STT</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Học sinh</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng điểm</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Chi tiết câu hỏi</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student, index) => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-400">{index + 1}</td>
                        <td className="px-6 py-4 font-bold text-slate-700">{student.result?.studentName || student.studentName}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-indigo-50 text-indigo-700">
                            {student.result ? `${student.result.totalScore} / ${student.result.maxTotalScore}` : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {student.result?.questionScores.map((qs, i) => (
                              <div key={i} className="group relative">
                                 <div className="text-[10px] px-2 py-1 rounded bg-slate-100 font-medium cursor-help hover:bg-indigo-100 transition-colors">
                                   {qs.questionNumber}: {qs.score}đ
                                 </div>
                                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl z-20 pointer-events-none backdrop-blur-sm bg-opacity-90">
                                   <div className="font-bold mb-1">{qs.questionNumber} ({qs.score}/{qs.maxScore}đ)</div>
                                   {qs.feedback}
                                 </div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            className="text-indigo-600 text-sm font-bold hover:underline disabled:text-slate-300"
                            disabled={!student.result}
                            onClick={() => alert(student.result?.generalFeedback || 'Không có nhận xét')}
                          >
                            Nhận xét chung
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur border-t border-slate-200 py-3 text-center text-xs text-slate-400">
        Phát triển bởi Essay Grader AI Team &bull; 2024
      </footer>
    </div>
  );
};

export default App;
