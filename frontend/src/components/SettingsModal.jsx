import React, { useState, useEffect } from 'react';
import { X, Lock, Shield, CheckCircle2, AlertCircle, Save, Database, Upload, Download, RefreshCw, KeyRound } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsModal({ isOpen, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [testingId, setTestingId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadSettingsData();
    }
  }, [isOpen]);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      const studentsData = await api.getStudents();
      setStudents(studentsData);
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleStudentFieldChange = (index, field, value) => {
    const updated = [...students];
    updated[index][field] = value;
    setStudents(updated);
  };

  const saveStudent = async (student) => {
    try {
      await api.updateStudent(student.id, {
        display_name: student.display_name,
        user_id: student.user_id
      });
      setStatusMsg({ type: 'success', text: `Saved settings for ${student.display_name}` });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000);
      onSaved();
    } catch (err) {
      setStatusMsg({ type: 'error', text: `Failed to save ${student.display_name}: ${err.message}` });
    }
  };

  const handleTestLogin = async (student) => {
    setTestingId(student.id);
    setStatusMsg({ type: 'info', text: `Testing portal login for ${student.display_name}...` });
    try {
      const res = await api.testStudentLogin(student.id, {
        user_id: student.user_id
      });
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Login verified for ${student.display_name}!` });
      } else {
        setStatusMsg({ type: 'error', text: `Login failed: ${res.message}` });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: `Test error: ${err.message}` });
    } finally {
      setTestingId(null);
    }
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.restoreBackup(file);
      setStatusMsg({ type: 'success', text: 'Database successfully restored from backup!' });
      loadSettingsData();
      onSaved();
    } catch (err) {
      setStatusMsg({ type: 'error', text: `Restore failed: ${err.message}` });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="liquid-glass-elevated rounded-3xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl liquid-glass-sub text-blue-500 shadow-2xs">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Roster Configuration & Settings
              </h2>
              <p className="text-xs text-slate-400">
                Authorized student accounts & database snapshot management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation Capsule */}
        <div className="px-6 pt-4 pb-2">
          <div className="inline-flex p-1 rounded-2xl liquid-pill">
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'students'
                  ? 'liquid-pill-active'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              10 Student Accounts
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'backup'
                  ? 'liquid-pill-active'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Data & Backup
            </button>
          </div>
        </div>

        {/* Fixed Password Notice Banner */}
        <div className="mx-6 mt-2 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Portal Password: Fixed in code (<code className="font-mono bg-blue-500/20 px-1 py-0.5 rounded">abc@123</code>)</span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Automated login enabled • No manual password required
          </span>
        </div>

        {/* Status Toast inside Modal */}
        {statusMsg.text && (
          <div className={`mx-6 mt-3 p-3 rounded-2xl text-xs font-medium flex items-center space-x-2 border ${
            statusMsg.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
              : statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
          }`}>
            {statusMsg.type === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 max-h-[55vh] overflow-y-auto space-y-3">
          
          {/* TAB 1: 10 Student Accounts */}
          {activeTab === 'students' && (
            <div className="space-y-3">
              {students.map((student, idx) => (
                <div
                  key={student.id}
                  className="p-4 rounded-2xl liquid-glass-sub space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="h-6 w-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold flex items-center justify-center">
                        #{student.slot_number || idx + 1}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {student.display_name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTestLogin(student)}
                        disabled={testingId === student.id}
                        className="px-3 py-1 rounded-xl text-[11px] font-semibold text-slate-600 dark:text-slate-300 liquid-glass-sub hover:bg-white/60 dark:hover:bg-white/[0.08] transition-colors"
                      >
                        {testingId === student.id ? 'Testing...' : 'Test Login'}
                      </button>
                      <button
                        onClick={() => saveStudent(student)}
                        className="px-3 py-1 rounded-xl text-[11px] font-semibold text-white apple-button-primary shadow-glow-sm transition-all"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={student.display_name || ''}
                        onChange={(e) => handleStudentFieldChange(idx, 'display_name', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-black/40 backdrop-blur-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Portal User ID / Username
                      </label>
                      <input
                        type="text"
                        value={student.user_id || ''}
                        onChange={(e) => handleStudentFieldChange(idx, 'user_id', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-black/40 backdrop-blur-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: Data & Backup */}
          {activeTab === 'backup' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl liquid-glass-sub flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 mb-2">
                    <Download className="h-5 w-5" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Download Database Backup</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Export a full snapshot of all student scores, examination history, and configuration.
                  </p>
                </div>
                <a
                  href={api.getBackupUrl()}
                  className="mt-4 px-3.5 py-2 rounded-xl apple-button-primary text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-glow-sm transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Backup (.db)</span>
                </a>
              </div>

              <div className="p-5 rounded-2xl liquid-glass-sub flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 mb-2">
                    <Upload className="h-5 w-5" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Restore Database</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Restore previously exported database files to seamlessly recover student history.
                  </p>
                </div>
                <label className="mt-4 px-3.5 py-2 rounded-xl liquid-glass-sub hover:bg-white/60 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                  <Upload className="h-4 w-4" />
                  <span>Select Backup File</span>
                  <input type="file" accept=".db,.sqlite3" onChange={handleRestoreFile} className="hidden" />
                </label>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
