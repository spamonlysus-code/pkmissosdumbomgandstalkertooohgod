import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Calculator, Atom, FileSpreadsheet, History as HistoryIcon, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function HistoryModal({ student, isOpen, onClose }) {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'changes'

  useEffect(() => {
    if (isOpen && student) {
      loadHistory();
    }
  }, [isOpen, student]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getStudentHistory(student.id);
      setHistoryData(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !student) return null;

  const exams = historyData?.examination_history || [];
  const changes = historyData?.marks_changes || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="liquid-glass-elevated rounded-3xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl liquid-glass-sub text-blue-500 shadow-2xs">
              <HistoryIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{student.display_name}</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full liquid-glass-sub text-slate-500">
                  #{student.slot_number || student.id}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Archival examination audit and score transition history
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <a
              href={api.getExportUrl('xlsx', 'student', student.id)}
              className="px-3 py-1.5 rounded-xl liquid-glass-sub hover:bg-white/60 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
              title="Export this student's history to Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
              <span>Export</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Switching Capsule */}
        <div className="px-6 pt-4 pb-2">
          <div className="inline-flex p-1 rounded-2xl liquid-pill">
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'tests'
                  ? 'liquid-pill-active'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span>All Examinations</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/[0.05] dark:bg-white/[0.08] text-slate-600 dark:text-slate-400">
                {exams.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('changes')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'changes'
                  ? 'liquid-pill-active'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span>Result Transitions</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/[0.05] dark:bg-white/[0.08] text-slate-600 dark:text-slate-400">
                {changes.length}
              </span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'tests' ? (
            exams.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-black/[0.04] dark:border-white/[0.06] liquid-glass-sub">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/[0.02] dark:bg-white/[0.02] font-semibold text-[11px] text-slate-400 uppercase tracking-wider border-b border-black/[0.04] dark:border-white/[0.06]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Paper</th>
                      <th className="py-2.5 px-3">Test Title</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                    {exams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-blue-500/[0.03] dark:hover:bg-white/[0.03]">
                        <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {exam.exam_date || '-'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {exam.paper_type === 'MATHEMATICS' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                              <Calculator className="h-3 w-3" /> Maths
                            </span>
                          ) : exam.paper_type === 'PHYSICS_CHEMISTRY' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <Atom className="h-3 w-3" /> Phy+Chem
                            </span>
                          ) : (
                            <span className="text-slate-400">Other</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 max-w-[240px] truncate" title={exam.test_name}>
                          {exam.test_name}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {exam.result_status === 'Pending' ? (
                            <span className="font-semibold text-amber-600 dark:text-amber-400">Pending</span>
                          ) : exam.marks_obtained != null ? (
                            <div className="flex items-baseline space-x-1 font-mono">
                              <span className="font-bold text-slate-900 dark:text-white tabular-nums">{exam.marks_obtained}</span>
                              <span className="text-slate-400">/{exam.max_marks || 100}</span>
                              <span className="text-[10px] text-blue-500 ml-1">({exam.percentage}%)</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono">
                          {exam.duration_minutes ? `${exam.duration_minutes}m` : '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            exam.result_status === 'Pending'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}>
                            {exam.result_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                {loading ? 'Retrieving student records...' : 'No historical test records found for this student.'}
              </div>
            )
          ) : (
            changes.length > 0 ? (
              <div className="space-y-3">
                {changes.map((change) => (
                  <div
                    key={change.id}
                    className="p-3.5 rounded-2xl liquid-glass-sub flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                          {change.test_name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded liquid-glass-sub text-slate-600 dark:text-slate-300">
                          {change.paper_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Detected: {change.detected_at}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 font-mono text-xs">
                      <span className="text-slate-400">{change.previous_status || 'None'}</span>
                      <ArrowRight className="h-3 w-3 text-blue-500" />
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{change.new_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                No score status transitions recorded yet.
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
}
