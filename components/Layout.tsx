
import React from 'react';

export const Header: React.FC = () => (
  <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
    <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">E</div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Essay Grader AI</h1>
      </div>
      <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
        <a href="#" className="hover:text-indigo-600">Trang chủ</a>
        <a href="#" className="hover:text-indigo-600">Hướng dẫn</a>
        <a href="#" className="hover:text-indigo-600">Cài đặt</a>
      </div>
    </div>
  </header>
);

export const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = ["Đáp án", "Học sinh", "Chấm bài", "Kết quả"];
  
  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto mb-10 px-4">
      {steps.map((label, idx) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300
              ${idx < currentStep ? 'bg-emerald-500 border-emerald-500 text-white' : 
                idx === currentStep ? 'border-indigo-600 text-indigo-600 ring-4 ring-indigo-50' : 
                'border-slate-300 text-slate-400'}`}>
              {idx < currentStep ? '✓' : idx + 1}
            </div>
            <span className={`text-xs font-medium ${idx === currentStep ? 'text-indigo-600' : 'text-slate-500'}`}>{label}</span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 -mt-6 transition-colors duration-300 ${idx < currentStep ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
