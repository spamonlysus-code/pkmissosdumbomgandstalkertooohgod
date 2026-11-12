import React, { useState, useEffect } from 'react';
import { ArrowUpDown, Download, Filter, Search, FileSpreadsheet, FileText, X, ChevronRight, Award } from 'lucide-react';
import { api } from '../services/api';

export default function ConsolidatedTable({ onOpenHistory }) {
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('slot_number');
  const [sortOrder, setSortOrder] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadTable = async () => {
    setLoading(true);
    try {
      const data = await api.getTableData({
        sort_by: sortBy,
        sort_order: sortOrder,
        filter_status: statusFilter
      });
      setTableData(data);
    } catch (err) {
      console.error('Failed to load table data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTable();
  }, [sortBy, sortOrder, statusFilter]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredData = tableData.filter((row) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return row.student_name.toLowerCase().includes(query);
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Retrieved':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'Result Pending':
      case 'Partial':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'Login Failed':
      case 'Error':
      case 'Missing User ID':
      case 'Missing Password':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="rounded-3xl liquid-glass overflow-hidden mb-8">
      
      {/* Table Header & Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-black/[0.04] dark:border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Consolidated Performance Matrix
            </h2>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full liquid-glass-sub text-slate-600 dark:text-slate-300">
              {tableData.length} Students
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Synchronized scores for Mathematics and Physics & Chemistry with sorting and exports
          </p>
        </div>

        {/* Filter and Export Actions */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
          
          {/* Quick Search */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 py-1.5 text-xs rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white/50 dark:bg-black/30 backdrop-blur-md text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-36 sm:w-44 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Apple Segmented Filter Capsule */}
          <div className="inline-flex rounded-xl p-0.5 liquid-pill text-xs font-medium">
            {['All', 'Retrieved', 'Pending'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1 rounded-lg text-[11px] transition-all font-semibold ${
                  statusFilter === f
                    ? 'liquid-pill-active'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Export Group */}
          <div className="flex items-center space-x-1 pl-1 border-l border-black/[0.06] dark:border-white/[0.08]">
            <a
              href={api.getExportUrl('xlsx', 'all')}
              className="px-2.5 py-1.5 rounded-xl liquid-glass-sub hover:bg-white/60 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-all active:scale-[0.98]"
              title="Download Excel spreadsheet"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Excel</span>
            </a>
            <a
              href={api.getExportUrl('csv', 'all')}
              className="px-2.5 py-1.5 rounded-xl liquid-glass-sub hover:bg-white/60 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-all active:scale-[0.98]"
              title="Download CSV file"
            >
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              <span className="hidden sm:inline">CSV</span>
            </a>
          </div>

        </div>
      </div>

      {/* Table Data Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/[0.02] dark:bg-white/[0.02] text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider border-b border-black/[0.04] dark:border-white/[0.06]">
            <tr>
              <th
                className="py-3 px-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300 w-12"
                onClick={() => handleSort('slot_number')}
              >
                <div className="flex items-center space-x-1">
                  <span>#</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Student Name</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300"
                onClick={() => handleSort('maths')}
              >
                <div className="flex items-center space-x-1">
                  <span>Mathematics</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300"
                onClick={() => handleSort('phy_chem')}
              >
                <div className="flex items-center space-x-1">
                  <span>Physics + Chemistry</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {filteredData.length > 0 ? (
              filteredData.map((row) => (
                <tr
                  key={row.student_id}
                  className="hover:bg-blue-500/[0.03] dark:hover:bg-white/[0.03] transition-colors group"
                >
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-400 font-bold">
                    #{String(row.slot_number).padStart(2, '0')}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-7 w-7 rounded-xl liquid-glass-sub text-slate-700 dark:text-slate-200 flex items-center justify-center text-[10px] font-mono font-bold shadow-2xs">
                        {getInitials(row.student_name)}
                      </div>
                      <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {row.student_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {row.maths_score === 'Pending' ? (
                      <span className="font-semibold text-amber-600 dark:text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        Pending
                      </span>
                    ) : row.maths_score !== '-' ? (
                      <div className="flex items-baseline space-x-2">
                        <span className="font-extrabold font-mono text-slate-900 dark:text-white tabular-nums text-sm">
                          {row.maths_score}
                        </span>
                        {row.maths_percentage != null && (
                          <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            {row.maths_percentage}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {row.phy_chem_score === 'Pending' ? (
                      <span className="font-semibold text-amber-600 dark:text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        Pending
                      </span>
                    ) : row.phy_chem_score !== '-' ? (
                      <div className="flex items-baseline space-x-2">
                        <span className="font-extrabold font-mono text-slate-900 dark:text-white tabular-nums text-sm">
                          {row.phy_chem_score}
                        </span>
                        {row.phy_chem_percentage != null && (
                          <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            {row.phy_chem_percentage}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onOpenHistory({ id: row.student_id, display_name: row.student_name })}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group/btn px-2.5 py-1 rounded-lg hover:bg-blue-500/10"
                    >
                      <span>History</span>
                      <ChevronRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                  {loading ? 'Retrieving synchronized marks...' : 'No student records match the search filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
