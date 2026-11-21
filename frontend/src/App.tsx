import React, { useState, useEffect, useMemo } from 'react';
import Tesseract from 'tesseract.js';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ReferenceLine, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, CartesianGrid
} from 'recharts';
import {
  LayoutDashboard, GitCompare, ShieldCheck, Zap, Activity,
  Database, Lightbulb, BookOpen, Plus, Download, RefreshCw,
  Search, ArrowUpRight, CheckCircle2, Info, X, Calendar,
  Bell, ChevronDown, Sparkles, Filter, ExternalLink, Settings,
  HelpCircle, LogOut, Check, Image as ImageIcon, FileText, UploadCloud,
  TrendingUp, ChevronLeft, ChevronRight, Sliders,
  ArrowDown, ArrowUp, BarChart2, Award, Target, Trophy, Layers,
  Pencil, Trash2, PenLine, FileEdit, Tag
} from 'lucide-react';

const API_BASE = '/api';

function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 text-white rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[180px] select-none">
        <div className="font-extrabold text-white border-b border-slate-800 pb-1 text-[11px] uppercase tracking-wider flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-slate-400 font-mono font-normal">Score / Rate</span>
        </div>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="font-bold text-slate-200">{entry.name}:</span>
            </div>
            <span className="font-mono font-extrabold text-white">
              {entry.value !== null && entry.value !== undefined ? (typeof entry.value === 'number' ? entry.value.toFixed(4) : entry.value) : '—'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'compare' | 'visualizer' | 'lexved' | 'lexrag' | 'ailqa' | 'runs' | 'insights' | 'metrics' | 'add_run'>('overview');
  const [overviewData, setOverviewData] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [metricDefs, setMetricDefs] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Controls
  const [timeFilter, setTimeFilter] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Month');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('legal_eval_theme');
  }, []);

  // LexVed state
  const [lexvedModel, setLexvedModel] = useState<string>('bge-m3');
  const [lexvedMode, setLexvedMode] = useState<'both' | 'Primitive' | 'Enhanced'>('both');

  // Metric Modal state
  const [selectedMetricInfo, setSelectedMetricInfo] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resOverview, resRuns, resMetrics, resInsights, resNotes] = await Promise.all([
        fetch(`${API_BASE}/overview`).then(r => r.json()),
        fetch(`${API_BASE}/runs`).then(r => r.json()),
        fetch(`${API_BASE}/metrics`).then(r => r.json()),
        fetch(`${API_BASE}/insights`).then(r => r.json()),
        fetch(`${API_BASE}/notes`).then(r => r.json()).catch(() => []),
      ]);
      setOverviewData(resOverview);
      setRuns(resRuns);
      setMetricDefs(resMetrics);
      setInsights(resInsights);
      setNotes(resNotes || []);
    } catch (err) {
      console.error('Failed to load evaluation data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async (noteData: any) => {
    try {
      if (noteData.id) {
        const res = await fetch(`${API_BASE}/notes/${noteData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteData),
        });
        if (res.ok) {
          const updated = await res.json();
          setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
        }
      } else {
        const res = await fetch(`${API_BASE}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteData),
        });
        if (res.ok) {
          const created = await res.json();
          setNotes(prev => [created, ...prev]);
        }
      }
    } catch (e) {
      console.error('Failed to save note', e);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      const res = await fetch(`${API_BASE}/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (e) {
      console.error('Failed to delete note', e);
    }
  };

  const handleUpdateRunNote = async (runId: string, newNote: string) => {
    try {
      const res = await fetch(`${API_BASE}/runs/${runId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNote }),
      });
      if (res.ok) {
        setRuns(prev => prev.map(r => r.run_id === runId ? { ...r, notes: newNote } : r));
      }
    } catch (e) {
      console.error('Failed to update run note', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metricDict = useMemo(() => {
    const map: Record<string, any> = {};
    for (const m of metricDefs) {
      map[m.metric_id] = m;
    }
    return map;
  }, [metricDefs]);

  const explainMetric = (metricId: string) => {
    const found = metricDict[metricId];
    if (found) {
      setSelectedMetricInfo(found);
    } else {
      setSelectedMetricInfo({
        name: metricId,
        category: 'Evaluation Metric',
        description: 'Empirical benchmark indicator measuring system accuracy and retrieval precision.',
        direction: 'higher'
      });
    }
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedMetrics = metricDefs.filter((m: any) =>
      m.name?.toLowerCase().includes(q) ||
      m.metric_id?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q)
    ).slice(0, 6);

    const systemsList = overviewData?.systems || [
      { id: 1, name: 'LexVed', description: 'NVIDIA Nemotron-3-Ultra-550B with 4 Embedding Backends' },
      { id: 2, name: 'LexRAG', description: 'Official Generation Benchmark Suite' },
      { id: 3, name: 'AILQA', description: 'Dense Precedent Retrieval and QA Benchmark' },
    ];

    const matchedSystems = systemsList.filter((s: any) =>
      s.name?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.config?.llm?.toLowerCase().includes(q)
    );

    const matchedRuns = runs.filter((r: any) =>
      r.run_id?.toLowerCase().includes(q) ||
      r.system_name?.toLowerCase().includes(q) ||
      r.model_name?.toLowerCase().includes(q) ||
      r.retrieval_mode?.toLowerCase().includes(q)
    ).slice(0, 4);

    return {
      metrics: matchedMetrics,
      systems: matchedSystems,
      runs: matchedRuns,
      total: matchedMetrics.length + matchedSystems.length + matchedRuns.length
    };
  }, [searchQuery, metricDefs, overviewData, runs]);

  const handleExportCSV = () => {
    if (!runs || runs.length === 0) return;
    let csv = "Run ID,System,Model,Methodology,Evaluated Metrics,Date\n";
    runs.forEach(r => {
      csv += `"${r.run_id}","${r.system_name}","${r.model_name}","${r.methodology}","${r.metric_count || 32} metrics","${r.date}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `evaluation_runs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportJSON = () => {
    if (!runs || runs.length === 0) return;
    const blob = new Blob([JSON.stringify(runs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `evaluation_runs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8F9FA] text-slate-900 flex font-sans antialiased text-sm">
      {/* ─── DESKTOP SIDEBAR (FIXED PC COCKPIT) ─── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 shadow-xs select-none">
        <div>
          {/* Logo Brand */}
          <div className="h-16 flex items-center px-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0D0D0D] border border-[#FFC700]/50 flex items-center justify-center text-[#FFC700] font-black text-sm shadow-xs">
                L
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900">LegalEval</span>
                <span className="block text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Analytics Suite</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {[
              { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'compare', label: 'System Compare', icon: GitCompare },
              { id: 'visualizer', label: '31 Metrics Explorer', icon: TrendingUp, color: 'text-[#FFC700]' },
              { id: 'lexved', label: 'LexVed Analytics', icon: ShieldCheck, color: 'text-[#334155]' },
              { id: 'lexrag', label: 'LexRAG Analytics', icon: Zap, color: 'text-[#4B5563]' },
              { id: 'ailqa', label: 'AILQA Analytics', icon: Activity, color: 'text-[#FFC700]' },
              { id: 'runs', label: `Evaluation Runs (${runs.length})`, icon: Database },
              { id: 'insights', label: 'Key Findings', icon: Lightbulb },
              { id: 'metrics', label: 'Metric Dictionary', icon: BookOpen },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer ${isActive
                    ? 'bg-[#0D0D0D] text-[#FFC700] border border-[#FFC700]/30 shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FFC700]' : item.color || 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Box */}
        <div className="p-3 space-y-3">
          <div className="bg-[#0D0D0D] rounded-xl p-3.5 text-white shadow-xs border border-[#262C36]">
            <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] font-semibold">
              <span className="text-slate-200">Database Engine</span>
              <span className="w-2 h-2 rounded-full bg-[#FFC700] animate-pulse"></span>
            </div>
            <div className="text-xs font-bold text-white mt-1">10 Verified Runs</div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              276 empirical data points loaded.
            </p>
            <button
              onClick={() => setActiveTab('add_run')}
              className="mt-2.5 w-full py-1.5 bg-[#FFC700] hover:bg-[#E6B400] text-[#0D0D0D] rounded-lg text-xs font-black transition shadow-xs cursor-pointer"
            >
              + Add Run
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 px-1">
            <button onClick={handleExportCSV} className="flex items-center gap-1 hover:text-slate-900 transition" title="Export as CSV">
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV</span>
            </button>
            <button onClick={handleExportJSON} className="flex items-center gap-1 hover:text-slate-900 transition" title="Export as JSON">
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>JSON</span>
            </button>
            <button onClick={loadData} className="flex items-center gap-1 hover:text-slate-900 transition" title="Reload from database">
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Reload</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ─── DESKTOP MAIN WORKSPACE (PC WIDESCREEN VIEWPORT) ─── */}
      <div className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        {/* Sticky Desktop Header */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200/90 px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'compare' && 'Cross-System Comparative Matrix'}
              {activeTab === 'visualizer' && '31 Institutional Metrics Visualizer'}
              {activeTab === 'lexved' && 'LexVed Evaluation Deep-Dive'}
              {activeTab === 'lexrag' && 'LexRAG Generation Suite'}
              {activeTab === 'ailqa' && 'AILQA Benchmark Analysis'}
              {activeTab === 'runs' && 'Evaluation Runs Directory'}
              {activeTab === 'insights' && 'Evidence-Based Findings'}
              {activeTab === 'metrics' && 'Metric Definitions & Registry'}
              {activeTab === 'add_run' && 'Add Evaluation Run'}
            </h1>
            <p className="text-xs text-slate-600 hidden sm:block font-medium">
              Benchmarking 3 Legal AI Platforms: LexVed • LexRAG • AILQA
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search capsule */}
            <div className="relative hidden md:block">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search metrics, models, runs..."
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setIsSearchOpen(false);
                  } else if (e.key === 'Enter') {
                    if (searchResults?.metrics && searchResults.metrics.length > 0) {
                      explainMetric(searchResults.metrics[0].metric_id);
                      setIsSearchOpen(false);
                    } else if (searchResults?.systems && searchResults.systems.length > 0) {
                      setActiveTab(searchResults.systems[0].name.toLowerCase() as any);
                      setIsSearchOpen(false);
                    } else if (searchResults?.runs && searchResults.runs.length > 0) {
                      setActiveTab('runs');
                      setIsSearchOpen(false);
                    } else {
                      setActiveTab('metrics');
                      setIsSearchOpen(false);
                    }
                  }
                }}
                className="bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-slate-200 rounded-full pl-8 pr-8 py-1.5 text-xs text-slate-900 font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 w-60 focus:w-80 transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200 transition"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Autocomplete Dropdown */}
              {isSearchOpen && searchResults && (
                <div className="absolute left-0 mt-2 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Search Results ({searchResults.total})</span>
                    <button
                      onClick={() => setIsSearchOpen(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
                    >
                      Close ✕
                    </button>
                  </div>

                  {searchResults.total === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 font-medium">
                      No matching metrics, systems, or runs for <span className="font-bold text-slate-800">"{searchQuery}"</span>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-3 divide-y divide-slate-100">
                      {searchResults.metrics.length > 0 && (
                        <div className="pt-1">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 mb-1">
                            Metrics ({searchResults.metrics.length})
                          </div>
                          <div className="space-y-1">
                            {searchResults.metrics.map((m: any) => (
                              <button
                                key={m.id || m.metric_id}
                                onClick={() => {
                                  explainMetric(m.metric_id);
                                  setIsSearchOpen(false);
                                }}
                                className="w-full text-left p-2 rounded-xl hover:bg-slate-50 transition flex items-start justify-between group"
                              >
                                <div>
                                  <div className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 flex items-center gap-1.5">
                                    <span>{m.name}</span>
                                    <span className="font-mono text-[10px] text-slate-400 font-normal">({m.metric_id})</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{m.description}</p>
                                </div>
                                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 ml-2">
                                  {m.category}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.systems.length > 0 && (
                        <div className="pt-2">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 mb-1">
                            Systems ({searchResults.systems.length})
                          </div>
                          <div className="space-y-1">
                            {searchResults.systems.map((s: any) => (
                              <button
                                key={s.id || s.name}
                                onClick={() => {
                                  setActiveTab(s.name.toLowerCase() as any);
                                  setIsSearchOpen(false);
                                }}
                                className="w-full text-left p-2 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600">{s.name}</span>
                                  <span className="text-[11px] text-slate-500 line-clamp-1">{s.config?.llm || s.description}</span>
                                </div>
                                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.runs.length > 0 && (
                        <div className="pt-2">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 mb-1">
                            Evaluation Runs ({searchResults.runs.length})
                          </div>
                          <div className="space-y-1">
                            {searchResults.runs.map((r: any) => (
                              <button
                                key={r.id || r.run_id}
                                onClick={() => {
                                  setActiveTab('runs');
                                  setIsSearchOpen(false);
                                }}
                                className="w-full text-left p-2 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                              >
                                <div>
                                  <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-blue-600">{r.run_id}</span>
                                  <span className="text-[11px] text-slate-500 block">{r.system_name} • {r.model_name || 'Standard'}</span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                  {r.retrieval_mode || 'Benchmark'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timeframe pill selector */}
            <div className="bg-slate-100 p-1 rounded-full flex items-center text-xs font-bold text-slate-700">
              {(['Day', 'Week', 'Month', 'Year'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`px-3 py-1 rounded-full transition ${timeFilter === t ? 'bg-slate-900 text-white shadow-xs' : 'hover:text-slate-900'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Date range capsule */}
            <div className="hidden lg:flex items-center gap-1.5 bg-white border border-slate-300 rounded-full px-3 py-1 text-xs text-slate-800 font-semibold shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              <span>Sep - Nov 2024</span>
            </div>

            {/* Action button */}
            <button
              onClick={() => setActiveTab('add_run')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#17181C] hover:bg-[#22242B] border border-[#FFC700]/40 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#FFC700]" />
              <span>Add Run</span>
            </button>
          </div>
        </header>

        {/* Widescreen Responsive Body (Optimized for PC 16:9 & 16:10 Aspect Ratios) */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8 2xl:p-10 space-y-6 w-full max-w-[1920px] mx-auto">
          {activeTab === 'overview' && (
            <SkillsetOverviewView
              data={overviewData}
              runs={runs}
              searchQuery={searchQuery}
              onExplainMetric={explainMetric}
              onNavigate={(tab) => setActiveTab(tab as any)}
            />
          )}
          {activeTab === 'compare' && (
            <SkillsetCompareView
              runs={runs}
              kpiCards={overviewData?.kpi_cards || []}
              metricDefs={metricDefs}
              searchQuery={searchQuery}
              onExplainMetric={explainMetric}
            />
          )}
          {activeTab === 'visualizer' && (
            <SkillsetVisualizerView
              runs={runs}
              metricDefs={metricDefs}
              onExplainMetric={explainMetric}
            />
          )}
          {activeTab === 'lexved' && (
            <SkillsetLexVedView
              runs={runs.filter(r => r.system_name === 'LexVed')}
              model={lexvedModel}
              setModel={setLexvedModel}
              mode={lexvedMode}
              setMode={setLexvedMode}
              searchQuery={searchQuery}
              onExplainMetric={explainMetric}
            />
          )}
          {activeTab === 'lexrag' && (
            <SkillsetLexRAGView
              runs={runs.filter(r => r.system_name === 'LexRAG')}
              searchQuery={searchQuery}
              onExplainMetric={explainMetric}
            />
          )}
          {activeTab === 'ailqa' && (
            <SkillsetAILQAView
              runs={runs.filter(r => r.system_name === 'AILQA')}
              searchQuery={searchQuery}
              onExplainMetric={explainMetric}
            />
          )}
          {activeTab === 'runs' && (
            <SkillsetRunsView
              runs={runs}
              searchQuery={searchQuery}
              onRefresh={loadData}
              onExplainMetric={explainMetric}
              onUpdateRunNote={handleUpdateRunNote}
            />
          )}
          {activeTab === 'insights' && (
            <SkillsetInsightsView
              insights={insights}
              notes={notes}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              onExplainMetric={explainMetric}
            />
          )}
          {activeTab === 'metrics' && (
            <SkillsetMetricsView
              metricDefs={metricDefs}
              searchQuery={searchQuery}
              onSelectMetric={(m) => setSelectedMetricInfo(m)}
            />
          )}
          {activeTab === 'add_run' && (
            <SkillsetAddRunView
              metricDefs={metricDefs}
              onSuccess={() => {
                loadData();
                setActiveTab('runs');
              }}
              onCancel={() => setActiveTab('overview')}
            />
          )}
        </main>
      </div>

      {/* High-Contrast Light Modal */}
      {selectedMetricInfo && (
        <SkillsetMetricModal
          metric={selectedMetricInfo}
          onClose={() => setSelectedMetricInfo(null)}
        />
      )}
    </div>
  );
}

// =========================================================================
// 1. DASHBOARD OVERVIEW — High Contrast Desktop Layout
// =========================================================================
function SkillsetOverviewView({
  data,
  runs,
  searchQuery,
  onExplainMetric,
  onNavigate
}: {
  data: any;
  runs: any[];
  searchQuery?: string;
  onExplainMetric: (id: string) => void;
  onNavigate: (tab: string) => void;
}) {
  if (!data) return null;

  const q = searchQuery?.trim().toLowerCase();
  const isMeteorMatch = q && 'meteor'.includes(q);
  const isRecallMatch = q && ('recall'.includes(q) || 'retrieval'.includes(q));
  const isMrrMatch = q && ('mrr'.includes(q) || 'ranking'.includes(q));
  const isBertMatch = q && ('bertscore'.includes(q) || 'semantic'.includes(q));

  const recallCard = data?.kpi_cards?.find((k: any) => k.metric_id === 'recall_at_10');
  const mrrCard = data?.kpi_cards?.find((k: any) => k.metric_id === 'mrr');
  const bertCard = data?.kpi_cards?.find((k: any) => k.metric_id === 'bertscore_f1');
  const meteorCard = data?.kpi_cards?.find((k: any) => k.metric_id === 'meteor');

  const meteorVal = meteorCard?.leader_val !== undefined
    ? (meteorCard.leader_val > 1 ? (meteorCard.leader_val / 100).toFixed(4) : meteorCard.leader_val.toFixed(4))
    : '0.4438';
  const meteorLeader = meteorCard?.leader || 'AILQA';

  const filteredRuns = runs.filter(r =>
    !q ||
    r.run_id?.toLowerCase().includes(q) ||
    r.system_name?.toLowerCase().includes(q) ||
    r.model_name?.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-5">
      {q && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-blue-900 font-bold">
            <Search className="w-4 h-4 text-blue-600" />
            <span>Active Filter: "{searchQuery}"</span>
            <span className="text-blue-600 font-normal">({filteredRuns.length} runs match)</span>
          </div>
          <button
            onClick={() => onNavigate('metrics')}
            className="text-blue-700 font-bold hover:underline flex items-center gap-1"
          >
            <span>View in Metric Dictionary</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── ROW 1: 4 HIGH-CONTRAST KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Top Recall@10 */}
        <div
          onClick={() => onExplainMetric('recall_at_10')}
          className={`bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-[#334155] transition ${isRecallMatch ? 'ring-2 ring-[#334155]' : ''}`}
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Top Recall@10</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#334155]"></span>
            </div>
            <div className="text-3xl font-extrabold tracking-tight mt-1 text-slate-900">
              {recallCard?.leader_val !== undefined ? `${recallCard.leader_val >= 1 ? (recallCard.leader_val <= 1.0 ? (recallCard.leader_val * 100).toFixed(2) : recallCard.leader_val.toFixed(2)) : (recallCard.leader_val * 100).toFixed(2)}%` : '100.00%'}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-[#334155] font-bold">
            <ArrowUpRight className="w-4 h-4" />
            <span>{recallCard?.leader || 'LexVed'} (100.0% BGE-M3 Enhanced)</span>
          </div>
        </div>

        {/* Card 2: Peak Ranking MRR */}
        <div
          onClick={() => onExplainMetric('mrr')}
          className={`bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-[#4B5563] transition ${isMrrMatch ? 'ring-2 ring-[#4B5563]' : ''}`}
        >
          <div>
            <div className="text-xs font-bold text-slate-700">
              Peak MRR (Ranking Quality)
            </div>
            <div className="text-3xl font-extrabold tracking-tight mt-1 text-slate-900">
              {mrrCard?.leader_val !== undefined ? (typeof mrrCard.leader_val === 'number' ? mrrCard.leader_val.toFixed(4) : mrrCard.leader_val) : '0.8837'}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-[#4B5563] font-bold">
            <ArrowUpRight className="w-4 h-4" />
            <span>{mrrCard?.leader || 'LexRAG'} (Top precedent ranking at 0.8837)</span>
          </div>
        </div>

        {/* Card 3: BERTScore F1 */}
        <div
          onClick={() => onExplainMetric('bertscore_f1')}
          className={`bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-[#334155] transition ${isBertMatch ? 'ring-2 ring-[#334155]' : ''}`}
        >
          <div>
            <div className="text-xs font-bold text-slate-700">
              BERTScore F1 (Semantic Fidelity)
            </div>
            <div className="text-3xl font-extrabold tracking-tight mt-1 text-slate-900">
              {bertCard?.leader_val !== undefined ? (bertCard.leader_val > 1 ? (bertCard.leader_val / 100).toFixed(4) : bertCard.leader_val.toFixed(4)) : '0.8875'}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-[#334155] font-bold">
            <ArrowUpRight className="w-4 h-4" />
            <span>{bertCard?.leader || 'LexVed'} (BAAI/bge-m3 backend)</span>
          </div>
        </div>

        {/* Card 4: METEOR Quality (Dynamic from AILQA updated run!) */}
        <div
          onClick={() => onExplainMetric('meteor')}
          className={`bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-[#FFC700] transition ${isMeteorMatch ? 'ring-2 ring-[#FFC700] ring-offset-2' : ''}`}
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>METEOR Score (Synonymy)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFC700]"></span>
            </div>
            <div className="text-3xl font-extrabold tracking-tight mt-1 text-slate-900">
              {meteorVal}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-[#B38600] font-bold">
            <ArrowUpRight className="w-4 h-4" />
            <span>{meteorLeader} (44.38% - New Benchmark Lead!)</span>
          </div>
        </div>
      </div>

      {/* ─── 31 INSTITUTIONAL METRICS EXPLORER CTA BANNER ─── */}
      <div className="bg-gradient-to-r from-[#17181C] via-[#22242B] to-[#0D0D0D] text-white rounded-2xl p-5 shadow-xs border border-[#26282E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFC700]/20 text-[#FFC700] border border-[#FFC700]/30 uppercase tracking-wider">
              Interactive Visualization
            </span>
            <span className="text-xs text-[#9CA3AF] font-semibold">31 Verified Institutional Metrics</span>
          </div>
          <h3 className="text-base font-extrabold text-white">
            Explore Cross-Pipeline Metric Trajectories with Interactive Line & Area Graphs
          </h3>
          <p className="text-xs text-[#E2E8F0] max-w-2xl leading-relaxed">
            Click into individual metrics across all 8 operational categories to compare LexVed (8 model configurations), LexRAG (31-KPI Audit), and AILQA on responsive line graphs with benchmark mean baselines.
          </p>
        </div>
        <button
          onClick={() => onNavigate('visualizer')}
          className="px-4 py-2.5 bg-[#FFC700] hover:bg-[#FFD54F] text-[#0D0D0D] rounded-xl text-xs font-black transition flex items-center gap-2 shrink-0 shadow-xs hover:shadow-md cursor-pointer"
        >
          <TrendingUp className="w-4 h-4" />
          <span>Open 31 Metrics Explorer</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* ─── ROW 2: CHART + DESKTOP SIDE PANEL (70% / 30%) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Bar Chart (Widescreen Expansive) */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Direct Benchmark Comparison</h2>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">Empirical measurements across shared generation & retrieval metrics</p>
            </div>
            <button
              onClick={() => onNavigate('compare')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition"
            >
              <span>Full Matrix</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    name: 'Recall@10',
                    LexVed: data?.kpi_cards?.find((k: any) => k.metric_id === 'recall_at_10')?.system_values?.['LexVed']?.normalized ?? 1.0000,
                    LexRAG: data?.kpi_cards?.find((k: any) => k.metric_id === 'recall_at_10')?.system_values?.['LexRAG']?.normalized ?? 0.9545,
                    AILQA: data?.kpi_cards?.find((k: any) => k.metric_id === 'recall_at_10')?.system_values?.['AILQA']?.normalized ?? 0.9455,
                  },
                  {
                    name: 'MRR',
                    LexVed: data?.kpi_cards?.find((k: any) => k.metric_id === 'mrr')?.system_values?.['LexVed']?.normalized ?? 0.8475,
                    LexRAG: data?.kpi_cards?.find((k: any) => k.metric_id === 'mrr')?.system_values?.['LexRAG']?.normalized ?? 0.8837,
                    AILQA: data?.kpi_cards?.find((k: any) => k.metric_id === 'mrr')?.system_values?.['AILQA']?.normalized ?? 0.8613,
                  },
                  {
                    name: 'METEOR',
                    LexVed: data?.kpi_cards?.find((k: any) => k.metric_id === 'meteor')?.system_values?.['LexVed']?.normalized ?? 0.3069,
                    LexRAG: data?.kpi_cards?.find((k: any) => k.metric_id === 'meteor')?.system_values?.['LexRAG']?.normalized ?? 0.3383,
                    AILQA: data?.kpi_cards?.find((k: any) => k.metric_id === 'meteor')?.system_values?.['AILQA']?.normalized ?? 0.4438,
                  },
                  {
                    name: 'ROUGE-L',
                    LexVed: data?.kpi_cards?.find((k: any) => k.metric_id === 'rouge_l_f1')?.system_values?.['LexVed']?.normalized ?? 0.3215,
                    LexRAG: data?.kpi_cards?.find((k: any) => k.metric_id === 'rouge_l_f1')?.system_values?.['LexRAG']?.normalized ?? 0.2282,
                    AILQA: data?.kpi_cards?.find((k: any) => k.metric_id === 'rouge_l_f1')?.system_values?.['AILQA']?.normalized ?? 0.3726,
                  },
                  {
                    name: 'BERTScore',
                    LexVed: data?.kpi_cards?.find((k: any) => k.metric_id === 'bertscore_f1')?.system_values?.['LexVed']?.normalized ?? 0.8875,
                    LexRAG: data?.kpi_cards?.find((k: any) => k.metric_id === 'bertscore_f1')?.system_values?.['LexRAG']?.normalized ?? 0.7480,
                    AILQA: data?.kpi_cards?.find((k: any) => k.metric_id === 'bertscore_f1')?.system_values?.['AILQA']?.normalized ?? 0.8250,
                  },
                ]}
                margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tick={{ fill: '#334155', fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} domain={[0, 1.0]} />
                <Tooltip
                  content={<CustomChartTooltip />}
                  cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', fontWeight: 700 }} />
                <Bar dataKey="LexVed" fill="#334155" radius={[4, 4, 0, 0]} />
                <Bar dataKey="LexRAG" fill="#4B5563" radius={[4, 4, 0, 0]} />
                <Bar dataKey="AILQA" fill="#FFC700" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Desktop Side Widget */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-2.5 border-b border-slate-100">
              <span className="text-slate-500">‹</span>
              <span>November 2024 Evaluation Run</span>
              <span className="text-slate-500">›</span>
            </div>

            <div className="grid grid-cols-5 text-center mt-3 text-xs font-bold text-slate-600">
              <span>Mon</span>
              <span>Tue</span>
              <span className="text-slate-900 font-extrabold">Wed</span>
              <span>Thu</span>
              <span>Fri</span>
            </div>
            <div className="grid grid-cols-5 text-center mt-1.5 text-xs font-bold">
              <span className="py-1.5 text-slate-600">17</span>
              <span className="py-1.5 text-slate-600">18</span>
              <span className="py-1.5 bg-[#17181C] text-[#FFC700] rounded-lg shadow-xs">19</span>
              <span className="py-1.5 text-slate-600">20</span>
              <span className="py-1.5 text-slate-600">21</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">Precedent Recall Rate</div>
              <div className="flex items-center gap-1 text-[11px] text-[#4B5563] font-bold mt-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>94.55% Top-10 Coverage</span>
              </div>
            </div>

            <div className="relative w-12 h-12 rounded-full border-4 border-slate-100 flex items-center justify-center font-extrabold text-xs text-slate-900">
              <div className="absolute inset-0 rounded-full border-4 border-[#FFC700] border-t-transparent border-r-transparent -rotate-45"></div>
              <span>95%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 3: THREE COMPACT SYSTEM PROFILES ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            name: 'LexVed',
            badge: '4 Embedding Backends',
            desc: 'Modular legal research platform utilizing NVIDIA Nemotron-3-Ultra-550B with Primitive and Enhanced retrieval pipelines.',
            color: 'border-l-4 border-l-[#334155]',
            runsCount: 8,
            keyMetric: 'BERTScore F1: 0.8875',
            tab: 'lexved'
          },
          {
            name: 'LexRAG',
            badge: 'Generation Suite',
            desc: 'Generation-focused legal RAG evaluated on N-Gram BLEU precision decay, character recall (82.2%), and statutory keywords.',
            color: 'border-l-4 border-l-[#4B5563]',
            runsCount: 1,
            keyMetric: 'METEOR: 0.3843',
            tab: 'lexrag'
          },
          {
            name: 'AILQA',
            badge: 'Dense Precedent QA',
            desc: 'Dense precedent retrieval benchmark demonstrating superior recall coverage (94.55%) and Mean Reciprocal Ranking.',
            color: 'border-l-4 border-l-[#FFC700]',
            runsCount: 1,
            keyMetric: 'Recall@10: 94.55%',
            tab: 'ailqa'
          }
        ].map((sys) => (
          <div
            key={sys.name}
            onClick={() => onNavigate(sys.tab)}
            className={`bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs cursor-pointer hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between ${sys.color}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">{sys.name}</h3>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  {sys.badge}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">{sys.desc}</p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">{sys.keyMetric}</span>
              <span className="text-slate-600 flex items-center gap-0.5 hover:text-slate-900 font-bold">
                Deep Dive <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ─── ROW 4: DATA TABLE ─── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 px-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Recent Evaluation Benchmarks</h2>
            <p className="text-xs text-slate-600 font-medium">Empirical test runs recorded in database</p>
          </div>
          <button
            onClick={() => onNavigate('runs')}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
          >
            <span>View All Runs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {filteredRuns.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-medium">
              No evaluation runs match your search query <span className="font-bold text-slate-800">"{searchQuery}"</span>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-mono text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-5 font-bold">Run ID</th>
                  <th className="py-2.5 px-4 font-bold">System</th>
                  <th className="py-2.5 px-4 font-bold">Configuration / Model</th>
                  <th className="py-2.5 px-4 font-bold">Evaluated Metrics</th>
                  <th className="py-2.5 px-5 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRuns.slice(0, 5).map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-5 font-mono font-bold text-slate-900">{r.run_id}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{r.system_name}</td>
                    <td className="py-2.5 px-4 text-slate-700 font-medium">{r.model_name || 'Standard Benchmark'}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 font-semibold">{r.metric_count || Object.keys(r.metrics || {}).length || 32} metrics</td>
                    <td className="py-2.5 px-5 text-right">
                      <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded-full">
                        Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 2. CROSS-SYSTEM COMPARE
// =========================================================================
function SkillsetCompareView({
  runs,
  kpiCards,
  metricDefs,
  searchQuery,
  onExplainMetric
}: {
  runs: any[];
  kpiCards: any[];
  metricDefs: any[];
  searchQuery?: string;
  onExplainMetric: (id: string) => void;
}) {
  const [catFilter, setCatFilter] = useState<string>('all');
  const categories = ['all', 'Retrieval', 'Generation', 'Faithfulness', 'Legal', 'Performance', 'Resource'];

  const lexvedBest = runs.find(r => r.run_id === 'LEXVED-BGE-M3-ENH') || runs.find(r => r.system_name === 'LexVed');
  const lexragRun = runs.find(r => r.system_name === 'LexRAG');
  const ailqaRun = runs.find(r => r.system_name === 'AILQA');

  const filteredMetrics = metricDefs.filter(m => {
    const matchesCat = catFilter === 'all' || m.category === catFilter;
    const q = searchQuery?.trim().toLowerCase();
    const matchesSearch = !q ||
      m.name?.toLowerCase().includes(q) ||
      m.metric_id?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Category Filter Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Comparative Evaluation Matrix</h2>
          <p className="text-xs text-slate-600 font-medium">Direct numerical comparison across all 43 registered indicators</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {searchQuery && (
            <span className="text-xs font-bold bg-[#FFC700]/15 text-[#FFC700] px-3 py-1 rounded-full border border-[#FFC700]/30">
              Search: "{searchQuery}" ({filteredMetrics.length} of {metricDefs.length})
            </span>
          )}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-full border border-slate-200">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition cursor-pointer ${catFilter === c ? 'bg-[#17181C] text-[#FFC700] shadow-xs' : 'text-slate-700 hover:text-slate-900'
                  }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {filteredMetrics.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">
              No metrics found matching "{searchQuery}" in category "{catFilter}"
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-800 uppercase font-mono text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-5 font-bold">Metric Name</th>
                  <th className="py-2.5 px-3 font-bold">Category</th>
                  <th className="py-2.5 px-3 font-bold">Direction</th>
                  <th className="py-2.5 px-4 font-bold text-slate-900">LexVed (BGE-M3 Enh)</th>
                  <th className="py-2.5 px-4 font-bold text-slate-900">LexRAG (Gen Suite)</th>
                  <th className="py-2.5 px-4 font-bold text-slate-900">AILQA (Benchmark)</th>
                  <th className="py-2.5 px-5 font-bold text-slate-900 text-right">Leader</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMetrics.map((m) => {
                  const kpiMatch = kpiCards.find((k: any) => k.metric_id === m.metric_id);
                  const valLexVed = lexvedBest?.metrics?.[m.metric_id] ?? kpiMatch?.system_values?.['LexVed']?.raw ?? null;
                  const valLexRAG = lexragRun?.metrics?.[m.metric_id] ?? kpiMatch?.system_values?.['LexRAG']?.raw ?? null;
                  const valAILQA = ailqaRun?.metrics?.[m.metric_id] ?? kpiMatch?.system_values?.['AILQA']?.raw ?? null;

                  const fmt = (v: any, unit: string) => {
                    if (v === null || v === undefined) return <span className="text-slate-400 font-mono">—</span>;
                    if (typeof v === 'number') {
                      return <span className="font-mono text-slate-900 font-bold">{v > 1 ? `${v.toFixed(2)}${unit === 'percent' ? '%' : ''}` : v.toFixed(4)}</span>;
                    }
                    return <span className="font-mono text-slate-900 font-bold">{v}</span>;
                  };

                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-5">
                        <button
                          onClick={() => onExplainMetric(m.metric_id)}
                          className="font-bold text-slate-900 hover:text-[#FFC700] text-left flex items-center gap-1.5 group cursor-pointer"
                        >
                          <span>{m.name}</span>
                          <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#FFC700] shrink-0" />
                        </button>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                          {m.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[11px] font-bold ${m.direction === 'higher' ? 'text-[#4B5563]' : m.direction === 'lower' ? 'text-[#334155]' : 'text-[#9CA3AF]'}`}>
                          {m.direction === 'higher' ? '↑ Higher' : m.direction === 'lower' ? '↓ Lower' : '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono">{fmt(valLexVed, m.unit)}</td>
                      <td className="py-2.5 px-4 font-mono">{fmt(valLexRAG, m.unit)}</td>
                      <td className="py-2.5 px-4 font-mono">{fmt(valAILQA, m.unit)}</td>
                      <td className="py-2.5 px-5 text-right">
                        {kpiMatch?.leader ? (
                          <span className="inline-block px-2.5 py-0.5 bg-[#17181C] text-[#FFC700] border border-[#FFC700]/40 rounded-full text-[10px] font-extrabold">
                            {kpiMatch.leader}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 2B. 31 INSTITUTIONAL METRICS VISUALIZER & CROSS-PIPELINE EXPLORER
// =========================================================================

interface InstitutionalMetricInfo {
  id: string; // M1 to M31
  metric_id: string; // backend DB key
  name: string;
  category: string;
  unit: string;
  direction: 'lower' | 'higher' | 'neutral';
  description: string;
  formula: string;
  significance: string;
}

const INSTITUTIONAL_METRICS: InstitutionalMetricInfo[] = [
  {
    id: 'M1',
    metric_id: 'emb_latency',
    name: 'Embedding Latency',
    category: 'Infrastructure Latency',
    unit: 's',
    direction: 'lower',
    description: 'Wall-clock time to generate dense vector embeddings across legal case corpora chunks.',
    formula: 'Total embedding duration (s) / Embedded chunk count',
    significance: 'Critical for real-time case law ingestion and background indexing of high-volume judicial opinions.'
  },
  {
    id: 'M2',
    metric_id: 'index_size',
    name: 'Index Size (Vectors)',
    category: 'Infrastructure Latency',
    unit: 'chunks',
    direction: 'neutral',
    description: 'Total vector embeddings stored in the dense retrieval index.',
    formula: 'Count of embedded chunk records in vector index',
    significance: 'Reflects knowledge corpus depth and indexing granularity across statutory codes and case precedents.'
  },
  {
    id: 'M3',
    metric_id: 'ret_latency',
    name: 'Retrieval Latency',
    category: 'Infrastructure Latency',
    unit: 's',
    direction: 'lower',
    description: 'Time elapsed to perform vector similarity search and return top-k legal candidates.',
    formula: 'Query vector computation + Approximate Nearest Neighbor (ANN) search time',
    significance: 'Determines real-time responsiveness when counsel or judges search legal precedents.'
  },
  {
    id: 'M4',
    metric_id: 'query_context_cos_sim',
    name: 'Cosine Similarity',
    category: 'Retrieval Quality',
    unit: 'score',
    direction: 'higher',
    description: 'Vector dot-product cosine similarity between legal query and retrieved context.',
    formula: 'cos(θ) = (u · v) / (||u|| ||v||)',
    significance: 'Measures semantic proximity between the user query and retrieved court opinions.'
  },
  {
    id: 'M5',
    metric_id: 'recall_at_5',
    name: 'Recall@5',
    category: 'Retrieval Quality',
    unit: '%',
    direction: 'higher',
    description: 'Percentage of gold-standard relevant legal citations contained in top-5 retrieved results.',
    formula: '|Relevant_Citations ∩ Top_5_Retrieved| / |Total_Gold_Citations|',
    significance: 'High Recall@5 ensures lawyers do not miss crucial precedent in immediate results.'
  },
  {
    id: 'M6',
    metric_id: 'rouge_1_f1',
    name: 'ROUGE-1 F1',
    category: 'Lexical & Semantic Precision',
    unit: '%',
    direction: 'higher',
    description: 'Harmonic mean of unigram precision and recall between generated and reference legal text.',
    formula: '2 * (Unigram_Prec * Unigram_Rec) / (Unigram_Prec + Unigram_Rec)',
    significance: 'Measures word-level overlap and core factual vocabulary retention.'
  },
  {
    id: 'M7',
    metric_id: 'rouge_2_f1',
    name: 'ROUGE-2 F1',
    category: 'Lexical & Semantic Precision',
    unit: '%',
    direction: 'higher',
    description: 'Bigram overlap measuring phrase-level fluency and compound legal terms.',
    formula: '2 * (Bigram_Prec * Bigram_Rec) / (Bigram_Prec + Bigram_Rec)',
    significance: 'Crucial for multi-word statutory expressions (e.g., "reasonable doubt", "summary judgment").'
  },
  {
    id: 'M8',
    metric_id: 'rouge_l_f1',
    name: 'ROUGE-L F1',
    category: 'Lexical & Semantic Precision',
    unit: '%',
    direction: 'higher',
    description: 'Longest Common Subsequence (LCS) score capturing sentence structure coherence.',
    formula: 'LCS(Generated, Reference) / Reference_Length',
    significance: 'Preserves the syntactic progression and legal clause ordering of rulings.'
  },
  {
    id: 'M9',
    metric_id: 'context_words',
    name: 'Context Words',
    category: 'Lexical & Semantic Precision',
    unit: 'words',
    direction: 'neutral',
    description: 'Mean number of words passed into the LLM synthesis context window.',
    formula: 'Average word count of concatenated retrieved context blocks',
    significance: 'Balances comprehensive legal context against LLM attention dilution and token cost.'
  },
  {
    id: 'M10',
    metric_id: 'bleu_4',
    name: 'BLEU-4 Score',
    category: 'Lexical & Semantic Precision',
    unit: '%',
    direction: 'higher',
    description: 'Geometric mean of 1-gram to 4-gram precision with brevity penalty.',
    formula: 'BP * exp(sum(w_n * log(p_n))) for n=1..4',
    significance: 'Strict evaluation of verbatim statutory formula and judicial quotation reproduction.'
  },
  {
    id: 'M11',
    metric_id: 'meteor',
    name: 'METEOR Score',
    category: 'Lexical & Semantic Precision',
    unit: '%',
    direction: 'higher',
    description: 'Harmonic mean of precision and recall with stemming, paraphrasing, and synonym matching.',
    formula: 'F_mean * (1 - Penalty)',
    significance: 'Captures synonyms and legal paraphrasing that strict n-gram metrics penalize.'
  },
  {
    id: 'M12',
    metric_id: 'bertscore_f1',
    name: 'BERTScore / MPNet F1',
    category: 'Lexical & Semantic Precision',
    unit: '%',
    direction: 'higher',
    description: 'Token-level semantic similarity using contextual embeddings from pre-trained language models.',
    formula: '2 * (BERT_P * BERT_R) / (BERT_P + BERT_R)',
    significance: 'Deep semantic fidelity even when generated phrasing diverges from reference citations.'
  },
  {
    id: 'M13',
    metric_id: 'factual_deviation',
    name: 'Factual Deviation Dev. (FCD)',
    category: 'Factual Grounding',
    unit: '%',
    direction: 'lower',
    description: 'Percentage of claims generated by the LLM that contradict or lack support in retrieved source texts.',
    formula: '|Hallucinated_Claims| / |Total_Extracted_Claims| * 100',
    significance: 'Lower is strictly required; 0% means absolute zero-hallucination compliance.'
  },
  {
    id: 'M14',
    metric_id: 'faithfulness_judge',
    name: 'Faithfulness',
    category: 'Factual Grounding',
    unit: '%',
    direction: 'higher',
    description: 'LLM-as-a-judge score evaluating whether answer statements are directly grounded in source records.',
    formula: '|Verifiable_Claims_Grounded_in_Context| / |Total_Claims| * 100',
    significance: 'Guarantees the system does not invent case holdings or fabricate statutory amendments.'
  },
  {
    id: 'M15',
    metric_id: 'gt_coverage',
    name: 'Ground Truth Coverage',
    category: 'Factual Grounding',
    unit: '%',
    direction: 'higher',
    description: 'Proportion of essential ground truth legal elements addressed in the synthesized response.',
    formula: '|Covered_Gold_Points| / |Total_Gold_Points| * 100',
    significance: 'Assures exhaustive legal answers without omissions of critical defenses or exceptions.'
  },
  {
    id: 'M16',
    metric_id: 'e2e_latency',
    name: 'End-to-End Latency',
    category: 'System Runtime & Efficiency',
    unit: 's',
    direction: 'lower',
    description: 'Total turnaround time from legal query submission to complete synthesized response delivery.',
    formula: 'Ret_Latency + Prefill_Latency + (Generation_Tokens / Tokens_Per_Sec)',
    significance: 'User-facing turnaround time across interactive legal assistant workflows.'
  },
  {
    id: 'M17',
    metric_id: 'throughput_qps',
    name: 'System Throughput',
    category: 'System Runtime & Efficiency',
    unit: 'QPS',
    direction: 'higher',
    description: 'Number of concurrent queries processed per second under sustained benchmark load.',
    formula: 'Total_Completed_Queries / Elapsed_Benchmark_Time (seconds)',
    significance: 'Determines platform scalability across large enterprise law firms and judicial chambers.'
  },
  {
    id: 'M18',
    metric_id: 'cpu_usage',
    name: 'CPU Utilization',
    category: 'System Runtime & Efficiency',
    unit: '%',
    direction: 'lower',
    description: 'Average host CPU load during sustained vector indexing and embedding inference.',
    formula: 'Mean active CPU core utilization % across evaluation run',
    significance: 'Direct driver of cloud compute infrastructure cost and server overhead.'
  },
  {
    id: 'M19',
    metric_id: 'ram_usage',
    name: 'RAM Utilization',
    category: 'System Runtime & Efficiency',
    unit: 'GB',
    direction: 'lower',
    description: 'Resident set memory footprint allocated by vector store and inference engines.',
    formula: 'Peak Resident Set Size (RSS) during query execution',
    significance: 'Bounds memory hardware tiering required for on-premise court deployments.'
  },
  {
    id: 'M20',
    metric_id: 'citation_accuracy',
    name: 'Citation Accuracy',
    category: 'Legal Compliance & Reasoning',
    unit: '%',
    direction: 'higher',
    description: 'Precision of legal citations (case names, reporters, volumes, page numbers) matching valid law.',
    formula: '|Valid_Verifiable_Citations| / |Total_Generated_Citations| * 100',
    significance: 'Prevents sanctionable fictional citations (e.g. Mata v. Avianca fake citations).'
  },
  {
    id: 'M21',
    metric_id: 'terminology_precision',
    name: 'Terminology Precision',
    category: 'Legal Compliance & Reasoning',
    unit: '%',
    direction: 'higher',
    description: 'Adherence to recognized legal terminology and terms of art within the specific jurisdiction.',
    formula: '|Accurate_Jurisprudential_Terms| / |Total_Domain_Specific_Terms| * 100',
    significance: 'Ensures authoritative legal phrasing acceptable to judges and legal scholars.'
  },
  {
    id: 'M22',
    metric_id: 'precedent_match',
    name: 'Precedent Match',
    category: 'Legal Compliance & Reasoning',
    unit: '%',
    direction: 'higher',
    description: 'Degree to which cited precedent cases align with established jurisdiction-specific common law.',
    formula: '|Correctly_Applied_Precedents| / |Total_Relevant_Precedents| * 100',
    significance: 'Validates that legal reasoning follows doctrine of stare decisis.'
  },
  {
    id: 'M23',
    metric_id: 'reg_alignment',
    name: 'Regulatory Alignment',
    category: 'Legal Compliance & Reasoning',
    unit: '%',
    direction: 'higher',
    description: 'Conformity with prevailing statutory codes, administrative regulations, and ethical guidelines.',
    formula: 'Regulatory compliance score derived from expert bar review criteria',
    significance: 'Guarantees generated advisories comply with regulatory frameworks and professional ethics.'
  },
  {
    id: 'M24',
    metric_id: 'bias_score',
    name: 'Neutrality / Bias Score',
    category: 'Legal Compliance & Reasoning',
    unit: '%',
    direction: 'lower',
    description: 'Measured deviation from judicial neutrality, including demographic, gender, or ideological bias.',
    formula: 'Standardized bias deviation index (0% = perfectly neutral, unbiased)',
    significance: 'Essential for court fairness, equal protection, and impartial justice delivery.'
  },
  {
    id: 'M25',
    metric_id: 'ttft',
    name: 'Time to First Token (TTFT)',
    category: 'LLM Stream & Inference',
    unit: 's',
    direction: 'lower',
    description: 'Latency from prompt arrival at LLM inference engine until first generated output token streams.',
    formula: 'Timestamp(Token_1) - Timestamp(Prompt_Received)',
    significance: 'Determines human perception of instant interactivity in streaming chat interfaces.'
  },
  {
    id: 'M26',
    metric_id: 'prefill_latency',
    name: 'Prefill Latency',
    category: 'LLM Stream & Inference',
    unit: 's',
    direction: 'lower',
    description: 'Time spent computing KV-cache over the prompt and retrieved legal context tokens.',
    formula: 'Context encoding duration prior to autoregressive generation loop',
    significance: 'Directly impacts prompt handling efficiency for large 8k-32k case records.'
  },
  {
    id: 'M27',
    metric_id: 'tokens_per_sec',
    name: 'Generation Throughput',
    category: 'LLM Stream & Inference',
    unit: 'tok/s',
    direction: 'higher',
    description: 'Streaming rate of token output generation during legal opinion drafting.',
    formula: 'Generated_Tokens / Generation_Time (seconds)',
    significance: 'Dictates typing speed and user reading comfort during live opinion synthesis.'
  },
  {
    id: 'M28',
    metric_id: 'recall_at_10',
    name: 'Recall@10',
    category: 'IR Benchmarks',
    unit: '%',
    direction: 'higher',
    description: 'Proportion of ground-truth relevant precedents captured within the top-10 retrieved candidate set.',
    formula: '|Relevant_Docs ∩ Top_10| / |Total_Relevant_Docs| * 100',
    significance: 'Gold standard IR metric evaluating retrieval completeness before LLM reasoning.'
  },
  {
    id: 'M29',
    metric_id: 'mrr',
    name: 'Mean Reciprocal Rank (MRR)',
    category: 'IR Benchmarks',
    unit: 'score',
    direction: 'higher',
    description: 'Average reciprocal rank (1/rank) of the first relevant legal authority retrieved.',
    formula: '(1/|Q|) * sum(1 / rank_i) for i=1..|Q|',
    significance: 'Penalizes pipelines that bury the governing precedent down the ranking order.'
  },
  {
    id: 'M30',
    metric_id: 'ndcg_at_10',
    name: 'nDCG@10',
    category: 'IR Benchmarks',
    unit: 'score',
    direction: 'higher',
    description: 'Normalized Discounted Cumulative Gain over top 10 positions, rewarding high-relevance ranks.',
    formula: 'DCG@10 / IDCG@10, where DCG@p = sum((2^rel_i - 1) / log2(i + 1))',
    significance: 'Comprehensive evaluation of ranking quality giving higher credit to top-placed precedents.'
  },
  {
    id: 'M31',
    metric_id: 'precision_at_5',
    name: 'Precision@5',
    category: 'IR Benchmarks',
    unit: '%',
    direction: 'higher',
    description: 'Ratio of truly relevant precedent items among the top 5 retrieved items.',
    formula: '|Relevant_Docs ∩ Top_5| / 5 * 100',
    significance: 'Minimizes noise and irrelevant reading material presented to legal researchers.'
  }
];

const VISUALIZER_CATEGORIES = [
  { id: 'all', label: 'All 31 Metrics', count: 31 },
  { id: 'Infrastructure Latency', label: 'Infrastructure Latency', count: 3, range: 'M1–M3' },
  { id: 'Retrieval Quality', label: 'Retrieval Quality', count: 2, range: 'M4–M5' },
  { id: 'Lexical & Semantic Precision', label: 'Lexical & Semantic', count: 7, range: 'M6–M12' },
  { id: 'Factual Grounding', label: 'Factual Grounding', count: 3, range: 'M13–M15' },
  { id: 'System Runtime & Efficiency', label: 'Runtime & Efficiency', count: 4, range: 'M16–M19' },
  { id: 'Legal Compliance & Reasoning', label: 'Legal Compliance', count: 5, range: 'M20–M24' },
  { id: 'LLM Stream & Inference', label: 'Inference Stream', count: 3, range: 'M25–M27' },
  { id: 'IR Benchmarks', label: 'IR Benchmarks', count: 4, range: 'M28–M31' },
];

const PIPELINE_ORDER_METADATA: { run_id: string; shortName: string; fullName: string; system: 'LexVed' | 'LexRAG' | 'AILQA'; systemColor: string }[] = [
  { run_id: 'LEXVED-BGE-M3-ENHA', shortName: 'LexVed BGE-M3 (Enh)', fullName: 'LexVed BGE-M3 Enhanced', system: 'LexVed', systemColor: '#334155' },
  { run_id: 'LEXVED-BGE-M3-PRIM', shortName: 'LexVed BGE-M3 (Prim)', fullName: 'LexVed BGE-M3 Primitive', system: 'LexVed', systemColor: '#475569' },
  { run_id: 'LEXVED-MPNET-ENHA', shortName: 'LexVed MPNet (Enh)', fullName: 'LexVed MPNet Enhanced', system: 'LexVed', systemColor: '#1E293B' },
  { run_id: 'LEXVED-MPNET-PRIM', shortName: 'LexVed MPNet (Prim)', fullName: 'LexVed MPNet Primitive', system: 'LexVed', systemColor: '#3B4252' },
  { run_id: 'LEXVED-DISTILBERT-ENHA', shortName: 'LexVed DistilBERT (Enh)', fullName: 'LexVed DistilBERT Enhanced', system: 'LexVed', systemColor: '#0F172A' },
  { run_id: 'LEXVED-DISTILBERT-PRIM', shortName: 'LexVed DistilBERT (Prim)', fullName: 'LexVed DistilBERT Primitive', system: 'LexVed', systemColor: '#4C566A' },
  { run_id: 'LEXVED-MINILM-ENHA', shortName: 'LexVed MiniLM (Enh)', fullName: 'LexVed MiniLM Enhanced', system: 'LexVed', systemColor: '#090D16' },
  { run_id: 'LEXVED-MINILM-PRIM', shortName: 'LexVed MiniLM (Prim)', fullName: 'LexVed MiniLM Primitive', system: 'LexVed', systemColor: '#5E697F' },
  { run_id: 'LEXRAG-31-KPI-AUDIT', shortName: 'LexRAG 31-KPI Audit', fullName: 'LexRAG 31-KPI Institutional Audit', system: 'LexRAG', systemColor: '#4B5563' },
  { run_id: 'LEXRAG-OFFICIAL-GEN-01', shortName: 'LexRAG Gen Suite', fullName: 'LexRAG Official Generation Suite', system: 'LexRAG', systemColor: '#6B7280' },
  { run_id: 'AILQA-M1-M31-INSTITUTIONAL', shortName: 'AILQA Institutional', fullName: 'AILQA M1-M31 Institutional Benchmark', system: 'AILQA', systemColor: '#FFC700' },
  { run_id: 'AILQA-CORK-RETRIEVAL-01', shortName: 'AILQA Dense Retr', fullName: 'AILQA Precedent Dense Retriever', system: 'AILQA', systemColor: '#FFD54F' },
];

function SkillsetVisualizerView({
  runs,
  metricDefs,
  onExplainMetric
}: {
  runs: any[];
  metricDefs: any[];
  onExplainMetric: (id: string) => void;
}) {
  const [selectedMetricId, setSelectedMetricId] = useState<string>('recall_at_10');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [sortMode, setSortMode] = useState<'pipeline' | 'rank'>('pipeline');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Active metric info
  const currentMetric = useMemo(() => {
    return INSTITUTIONAL_METRICS.find(m => m.metric_id === selectedMetricId) || INSTITUTIONAL_METRICS[27]; // M28 default
  }, [selectedMetricId]);

  // Current metric index for previous/next stepping
  const currentIndex = useMemo(() => {
    return INSTITUTIONAL_METRICS.findIndex(m => m.metric_id === currentMetric.metric_id);
  }, [currentMetric]);

  const handlePrevMetric = () => {
    const prevIdx = (currentIndex - 1 + INSTITUTIONAL_METRICS.length) % INSTITUTIONAL_METRICS.length;
    setSelectedMetricId(INSTITUTIONAL_METRICS[prevIdx].metric_id);
  };

  const handleNextMetric = () => {
    const nextIdx = (currentIndex + 1) % INSTITUTIONAL_METRICS.length;
    setSelectedMetricId(INSTITUTIONAL_METRICS[nextIdx].metric_id);
  };

  // Filtered metrics list for selection tray
  const filteredMetrics = useMemo(() => {
    return INSTITUTIONAL_METRICS.filter(m => {
      const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
      const matchesSearch = !searchFilter.trim() ||
        m.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        m.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
        m.category.toLowerCase().includes(searchFilter.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchFilter]);

  // Extract data points across runs for current metric
  const { chartData, leaderPoint, runnerUpPoint, averageValue, unitLabel } = useMemo(() => {
    const points: any[] = [];
    const metricKey = currentMetric.metric_id;
    const unit = currentMetric.unit;
    const isHigherBetter = currentMetric.direction === 'higher';
    const isLowerBetter = currentMetric.direction === 'lower';

    // Map through preferred order metadata
    for (const meta of PIPELINE_ORDER_METADATA) {
      const matchRun = runs.find(r => r.run_id === meta.run_id);
      if (!matchRun || !matchRun.metrics) continue;

      let rawVal = matchRun.metrics[metricKey];
      if (rawVal === undefined || rawVal === null) continue;

      // Normalize percentages
      let displayValue = rawVal;
      if (unit === '%') {
        if (rawVal <= 1.0 && rawVal > 0) {
          displayValue = rawVal * 100;
        } else {
          displayValue = rawVal;
        }
      }

      // Format text
      let formattedText = '';
      if (unit === '%') {
        formattedText = `${displayValue.toFixed(2)}%`;
      } else if (unit === 's') {
        formattedText = displayValue < 1.0 ? `${displayValue.toFixed(4)}s (${(displayValue * 1000).toFixed(1)}ms)` : `${displayValue.toFixed(2)}s`;
      } else if (unit === 'score') {
        formattedText = displayValue.toFixed(4);
      } else if (unit === 'chunks' || unit === 'words') {
        formattedText = `${Math.round(displayValue).toLocaleString()} ${unit}`;
      } else {
        formattedText = `${displayValue.toFixed(2)} ${unit}`;
      }

      points.push({
        id: meta.run_id,
        name: meta.shortName,
        fullName: meta.fullName,
        system: meta.system,
        systemColor: meta.systemColor,
        rawVal,
        displayValue: Number(displayValue.toFixed(4)),
        formattedText,
        hardware: matchRun.metadata_json?.hardware || 'Standard'
      });
    }

    if (points.length === 0) {
      return { chartData: [], leaderPoint: null, runnerUpPoint: null, averageValue: 0, unitLabel: unit };
    }

    // Determine Leader & Runner-up
    let sortedForRank = [...points];
    if (isHigherBetter) {
      sortedForRank.sort((a, b) => b.displayValue - a.displayValue);
    } else if (isLowerBetter) {
      sortedForRank.sort((a, b) => a.displayValue - b.displayValue);
    }

    const leader = sortedForRank[0];
    const runnerUp = sortedForRank.length > 1 ? sortedForRank[1] : null;

    // Calculate cross-pipeline average
    const avg = points.reduce((acc, p) => acc + p.displayValue, 0) / points.length;

    // Enrich points with rank and delta vs avg
    const enriched = points.map(p => {
      const isWinner = leader && p.id === leader.id;
      const rankIndex = sortedForRank.findIndex(s => s.id === p.id) + 1;
      const deltaVsAvg = avg !== 0 ? ((p.displayValue - avg) / avg) * 100 : 0;
      return {
        ...p,
        isWinner,
        rank: rankIndex,
        deltaVsAvg
      };
    });

    // If sortMode === 'rank', order chart data by performance
    let finalChartData = [...enriched];
    if (sortMode === 'rank') {
      if (isHigherBetter) {
        finalChartData.sort((a, b) => b.displayValue - a.displayValue);
      } else if (isLowerBetter) {
        finalChartData.sort((a, b) => a.displayValue - b.displayValue);
      }
    }

    return {
      chartData: finalChartData,
      leaderPoint: leader ? { ...leader, isWinner: true, rank: 1 } : null,
      runnerUpPoint: runnerUp,
      averageValue: avg,
      unitLabel: unit
    };
  }, [currentMetric, runs, sortMode]);

  // Quick leader lookup map for all 31 metrics to show in selector ribbon
  const quickMetricLeaders = useMemo(() => {
    const map: Record<string, { system: string; display: string }> = {};
    for (const m of INSTITUTIONAL_METRICS) {
      let bestVal: number | null = null;
      let bestSys = '';
      for (const r of runs) {
        let v = r.metrics?.[m.metric_id];
        if (v === undefined || v === null) continue;
        let norm = v;
        if (m.unit === '%' && v <= 1.0 && v > 0) norm = v * 100;
        if (bestVal === null) {
          bestVal = norm;
          bestSys = r.system_name;
        } else if (m.direction === 'higher' && norm > bestVal) {
          bestVal = norm;
          bestSys = r.system_name;
        } else if (m.direction === 'lower' && norm < bestVal) {
          bestVal = norm;
          bestSys = r.system_name;
        }
      }
      if (bestVal !== null) {
        const text = m.unit === '%' ? `${bestVal.toFixed(1)}%` : m.unit === 's' ? `${bestVal.toFixed(2)}s` : bestVal.toFixed(2);
        map[m.metric_id] = { system: bestSys, display: text };
      }
    }
    return map;
  }, [runs]);

  return (
    <div className="space-y-6 text-left">
      {/* ─── PAGE BANNER & HIGH-LEVEL INTRO ─── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#FFC700]/15 text-[#FFC700] border border-[#FFC700]/30 tracking-wide uppercase">
                Institutional Benchmark Suite
              </span>
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FFC700] animate-pulse"></span>
                31 Metrics · 11 Evaluated Pipelines
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              31 Institutional Metrics Visualizer & Trend Explorer
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Explore continuous cross-pipeline trajectories across all 31 verified metrics from legal retrieval, factual grounding, and semantic precision to inference latency and GPU runtime. Click any metric to inspect performance curves.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrevMetric}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 shadow-2xs cursor-pointer"
              title="Previous Metric"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <div className="px-3 py-2 bg-[#17181C] border border-[#FFC700]/40 text-[#FFC700] font-mono text-xs font-black rounded-xl shadow-xs">
              {currentMetric.id} / M31
            </div>
            <button
              onClick={handleNextMetric}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 shadow-2xs cursor-pointer"
              title="Next Metric"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Operational Category Filter Tabs */}
        <div className="mt-4 pt-1 flex flex-wrap items-center gap-1.5">
          {VISUALIZER_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${selectedCategory === cat.id
                ? 'bg-[#17181C] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedCategory === cat.id ? 'bg-white/20' : 'bg-slate-200 text-slate-600'
                }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── 31 METRIC SELECTOR CARDS / PILLS TRAY ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#FFC700]" />
            Select Metric to Graph ({filteredMetrics.length} displayed):
          </span>
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search 31 metrics (e.g. M28, Recall)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#FFC700]"
            />
          </div>
        </div>

        {/* Scrollable / Responsive Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 max-h-56 overflow-y-auto p-1 rounded-xl bg-slate-50 border border-slate-200">
          {filteredMetrics.map((m) => {
            const isSelected = m.metric_id === currentMetric.metric_id;
            const leaderInfo = quickMetricLeaders[m.metric_id];
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMetricId(m.metric_id)}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${isSelected
                  ? 'bg-[#17181C] text-[#FFC700] border-[#FFC700] shadow-md ring-2 ring-[#FFC700]/40 scale-[1.02]'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-[#FFC700]/60 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded ${isSelected ? 'bg-[#FFC700]/20 text-[#FFC700]' : 'bg-slate-100 text-slate-700'
                    }`}>
                    {m.id}
                  </span>
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-[#E2E8F0]' : 'text-slate-500'
                    }`}>
                    {m.unit}
                  </span>
                </div>
                <div className="text-xs font-black truncate leading-snug">{m.name}</div>
                {leaderInfo && (
                  <div className={`mt-2 text-[10px] font-mono flex items-center justify-between border-t pt-1 ${isSelected ? 'border-[#FFC700]/30 text-[#FFC700]' : 'border-slate-100 text-slate-600'
                    }`}>
                    <span className="truncate">{leaderInfo.system}</span>
                    <span className="font-extrabold">{leaderInfo.display}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── ACTIVE METRIC HERO DISPLAY & GRAPH PANEL ─── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Metric Header & Visualization Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-black bg-[#17181C] text-[#FFC700] border border-[#FFC700]/40 shadow-2xs">
                {currentMetric.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {currentMetric.category}
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 border ${currentMetric.direction === 'higher'
                ? 'bg-[#4B5563]/15 text-[#4B5563] border-[#4B5563]/30'
                : currentMetric.direction === 'lower'
                  ? 'bg-[#17181C]/15 text-[#0D0D0D] border-[#26282E]/30'
                  : 'bg-[#9CA3AF]/15 text-slate-700 border-[#9CA3AF]/30'
                }`}>
                {currentMetric.direction === 'higher' && <ArrowUp className="w-3.5 h-3.5" />}
                {currentMetric.direction === 'lower' && <ArrowDown className="w-3.5 h-3.5" />}
                {currentMetric.direction === 'higher' ? 'Higher is Better' : currentMetric.direction === 'lower' ? 'Lower is Better' : 'Neutral Baseline'}
              </span>
              <span className="text-xs text-slate-600 font-mono">
                Unit: <strong className="text-slate-700">{currentMetric.unit}</strong>
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {currentMetric.name}
              <button
                onClick={() => onExplainMetric(currentMetric.metric_id)}
                className="text-slate-400 hover:text-[#FFC700] transition cursor-pointer"
                title="View Full Metric Documentation"
              >
                <Info className="w-4 h-4" />
              </button>
            </h3>
          </div>

          {/* Chart View & Sorting Toggles */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Chart Type Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${chartType === 'line'
                  ? 'bg-[#17181C] text-[#FFC700] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Line Graph</span>
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${chartType === 'bar'
                  ? 'bg-[#17181C] text-[#FFC700] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Bar Chart</span>
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${chartType === 'area'
                  ? 'bg-[#17181C] text-[#FFC700] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Area Curve</span>
              </button>
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setSortMode('pipeline')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${sortMode === 'pipeline'
                  ? 'bg-[#17181C] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="Group by Architecture (LexVed, LexRAG, AILQA)"
              >
                Architecture Order
              </button>
              <button
                onClick={() => setSortMode('rank')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${sortMode === 'rank'
                  ? 'bg-[#17181C] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="Sort by Best Performance Rank"
              >
                Performance Rank
              </button>
            </div>
          </div>
        </div>

        {/* System Legend & Mean Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-600 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-800">System Color Scheme:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#334155]"></span>
              <span className="text-slate-700 font-medium">LexVed Configurations (8)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#4B5563]"></span>
              <span className="text-slate-700 font-medium">LexRAG Audit & Gen (2)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#FFC700]"></span>
              <span className="text-slate-700 font-medium">AILQA Institutional (2)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 border-t-2 border-dashed border-[#9CA3AF]"></span>
            <span>Cross-Pipeline Average: <strong className="font-mono text-slate-900">{averageValue.toFixed(2)} {currentMetric.unit}</strong></span>
          </div>
        </div>

        {/* ─── PRIMARY RECHARTS VISUALIZATION ─── */}
        <div className="h-96 w-full pt-2">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
              No empirical data points recorded for {currentMetric.name} ({currentMetric.id}).
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 65, bottom: 55 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="" />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    height={70}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `${val}${currentMetric.unit === '%' ? '%' : ''}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-[#0D0D0D] border border-[#26282E] text-white rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[210px] select-none text-left">
                            <div className="flex items-center justify-between gap-2 border-b border-[#26282E] pb-1.5">
                              <span className="font-black text-white text-xs">{item.name}</span>
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                style={{ backgroundColor: `${item.systemColor}30`, color: item.systemColor }}
                              >
                                {item.system}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300">{item.fullName}</div>
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#26282E]">
                              <span className="text-[#9CA3AF] font-medium">Metric Score:</span>
                              <span className="font-mono font-black text-white text-sm">{item.formattedText}</span>
                            </div>
                            {item.deltaVsAvg !== undefined && (
                              <div className="flex items-center justify-between text-[11px] pt-0.5">
                                <span className="text-[#9CA3AF]">vs Benchmark Mean:</span>
                                <span className={`font-mono font-bold ${item.deltaVsAvg >= 0 ? 'text-[#FFC700]' : 'text-slate-400'}`}>
                                  {item.deltaVsAvg >= 0 ? `+${item.deltaVsAvg.toFixed(2)}%` : `${item.deltaVsAvg.toFixed(2)}%`}
                                </span>
                              </div>
                            )}
                            {item.isWinner && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FFC700] pt-1.5 border-t border-[#26282E]">
                                <span>👑 #1 Top Performer ({currentMetric.id})</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={averageValue}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    label={{
                      value: `Mean: ${averageValue.toFixed(2)}${currentMetric.unit === '%' ? '%' : ''}`,
                      position: 'insideTopRight',
                      fill: '#64748b',
                      fontSize: 11,
                      fontWeight: 600
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="displayValue"
                    stroke="#FFC700"
                    strokeWidth={3}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!cx || !cy) return null;
                      const isWinner = payload?.isWinner;
                      const color = payload?.systemColor || '#FFC700';
                      return (
                        <g key={`dot-${payload?.id}`}>
                          {isWinner && (
                            <circle cx={cx} cy={cy} r={10} fill="none" stroke="#FFC700" strokeWidth={2.5} className="animate-pulse" />
                          )}
                          <circle cx={cx} cy={cy} r={isWinner ? 5.5 : 4.5} fill={color} stroke="#ffffff" strokeWidth={2} />
                        </g>
                      );
                    }}
                    activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </LineChart>
              ) : chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 65, bottom: 55 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="" />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
                    height={70}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `${val}${currentMetric.unit === '%' ? '%' : ''}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-[#0D0D0D] border border-[#26282E] text-white rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[210px] select-none text-left">
                            <div className="flex items-center justify-between gap-2 border-b border-[#26282E] pb-1.5">
                              <span className="font-black text-white text-xs">{item.name}</span>
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                style={{ backgroundColor: `${item.systemColor}30`, color: item.systemColor }}
                              >
                                {item.system}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300">{item.fullName}</div>
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#26282E]">
                              <span className="text-[#9CA3AF] font-medium">Metric Score:</span>
                              <span className="font-mono font-black text-white text-sm">{item.formattedText}</span>
                            </div>
                            {item.isWinner && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FFC700] pt-1.5 border-t border-[#26282E]">
                                <span>👑 #1 Top Performer ({currentMetric.id})</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={averageValue}
                    stroke="#9CA3AF"
                    strokeDasharray="4 4"
                    label={{
                      value: `Mean: ${averageValue.toFixed(2)}${currentMetric.unit === '%' ? '%' : ''}`,
                      position: 'insideTopRight',
                      fill: '#9CA3AF',
                      fontSize: 11,
                      fontWeight: 600
                    }}
                  />
                  <Bar dataKey="displayValue" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.systemColor || '#FFC700'} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 65, bottom: 55 }}>
                  <defs>
                    <linearGradient id="colorVisualizerArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFC700" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FFC700" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="" />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
                    height={70}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `${val}${currentMetric.unit === '%' ? '%' : ''}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-[#0D0D0D] border border-[#26282E] text-white rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[210px] select-none text-left">
                            <div className="flex items-center justify-between gap-2 border-b border-[#26282E] pb-1.5">
                              <span className="font-black text-white text-xs">{item.name}</span>
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                style={{ backgroundColor: `${item.systemColor}30`, color: item.systemColor }}
                              >
                                {item.system}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300">{item.fullName}</div>
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#26282E]">
                              <span className="text-[#9CA3AF] font-medium">Metric Score:</span>
                              <span className="font-mono font-black text-white text-sm">{item.formattedText}</span>
                            </div>
                            {item.isWinner && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FFC700] pt-1.5 border-t border-[#26282E]">
                                <span>👑 #1 Top Performer ({currentMetric.id})</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={averageValue}
                    stroke="#9CA3AF"
                    strokeDasharray="4 4"
                    label={{
                      value: `Mean: ${averageValue.toFixed(2)}${currentMetric.unit === '%' ? '%' : ''}`,
                      position: 'insideTopRight',
                      fill: '#9CA3AF',
                      fontSize: 11,
                      fontWeight: 600
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="displayValue"
                    stroke="#FFC700"
                    strokeWidth={2.5}
                    fill="url(#colorVisualizerArea)"
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!cx || !cy) return null;
                      const color = payload?.systemColor || '#FFC700';
                      return (
                        <circle key={`dot-area-${payload?.id}`} cx={cx} cy={cy} r={4.5} fill={color} stroke="#ffffff" strokeWidth={2} />
                      );
                    }}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* ─── 3-COLUMN EXECUTIVE INTERPRETATION ROW ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          {/* Winner Spotlight Card */}
          <div className="bg-gradient-to-br from-[#FFC700]/15 via-[#FFC700]/5 to-transparent border border-[#FFC700]/40 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFC700]/20 text-[#FFC700] border border-[#FFC700]/40 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-[#FFC700]" />
                  #1 Benchmark Leader
                </span>
                <span className="text-[10px] font-mono text-[#9CA3AF]">
                  {currentMetric.id} Winner
                </span>
              </div>
              {leaderPoint ? (
                <>
                  <div className="text-base font-black text-slate-900 mt-1">
                    {leaderPoint.fullName}
                  </div>
                  <div className="text-2xl font-black font-mono mt-1" style={{ color: leaderPoint.systemColor }}>
                    {leaderPoint.formattedText}
                  </div>
                  {runnerUpPoint && (
                    <div className="text-xs text-slate-600 mt-2 font-medium">
                      Outperforms #2 runner-up (<strong>{runnerUpPoint.name}</strong>: {runnerUpPoint.formattedText}) by{' '}
                      <span className="font-bold text-[#4B5563]">
                        {Math.abs(leaderPoint.displayValue - runnerUpPoint.displayValue).toFixed(2)} {currentMetric.unit}
                      </span>.
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-[#9CA3AF] mt-2">
                  No verified winner calculated for this baseline.
                </div>
              )}
            </div>
            <div className="mt-4 pt-2 border-t border-[#FFC700]/20 text-[11px] font-semibold text-[#FFC700] flex items-center justify-between">
              <span>System: {leaderPoint?.system || '—'}</span>
              <span>Hardware: {leaderPoint?.hardware || 'Standard'}</span>
            </div>
          </div>

          {/* Legal AI Domain Significance */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-[#FFC700] font-extrabold text-xs">
                <Target className="w-3.5 h-3.5" />
                <span>Legal Domain Significance</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {currentMetric.significance}
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-200 text-[11px] text-[#9CA3AF] flex items-center justify-between">
              <span>Goal: <strong className="text-slate-800">{currentMetric.direction === 'higher' ? 'Maximize' : currentMetric.direction === 'lower' ? 'Minimize' : 'Benchmark Reference'}</strong></span>
              <span>Category: <strong className="text-slate-800">{currentMetric.category}</strong></span>
            </div>
          </div>

          {/* Mathematical Formula & Technical Definition */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-slate-800 font-extrabold text-xs">
                <BookOpen className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <span>Calculation & Formula</span>
              </div>
              <p className="text-xs text-slate-600 mb-2">
                {currentMetric.description}
              </p>
              <div className="bg-white border border-slate-200 rounded-lg p-2 font-mono text-[11px] text-slate-800 break-words">
                {currentMetric.formula}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => onExplainMetric(currentMetric.metric_id)}
                className="text-xs font-bold text-[#FFC700] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Metric Registry Doc</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── RANKED PIPELINE BREAKDOWN TABLE ─── */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#FFC700]" />
              <span>Full Cross-Pipeline Performance Leaderboard ({chartData.length} Evaluated Configurations)</span>
            </h4>
            <span className="text-xs text-[#9CA3AF]">
              Sorted by {sortMode === 'rank' ? 'Performance Rank' : 'Architecture Sequence'}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Pipeline / Configuration</th>
                  <th className="px-4 py-3">System</th>
                  <th className="px-4 py-3 text-right">Score ({currentMetric.unit})</th>
                  <th className="px-4 py-3 text-center">Relative Meter</th>
                  <th className="px-4 py-3 text-right">vs Benchmark Mean</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {chartData.map((row: any) => {
                  const isLeader = row.isWinner;
                  const maxDisplay = Math.max(...chartData.map((c: any) => c.displayValue));
                  const relativePct = maxDisplay > 0 ? (row.displayValue / maxDisplay) * 100 : 0;
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50 transition ${isLeader ? 'bg-[#FFC700]/10 font-bold' : ''
                        }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">
                        {isLeader ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#FFC700] text-[#0D0D0D] font-black text-[10px]">
                            #1 👑
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            #{row.rank}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.systemColor }} />
                          <span className="font-bold">{row.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase"
                          style={{
                            backgroundColor: `${row.systemColor}18`,
                            color: row.systemColor,
                            border: `1px solid ${row.systemColor}40`
                          }}
                        >
                          {row.system}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                        {row.formattedText}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-32 bg-slate-100 rounded-full h-2 mx-auto overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(Math.max(relativePct, 3), 100)}%`,
                              backgroundColor: row.systemColor
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                        <span className={row.deltaVsAvg >= 0 ? 'text-[#4B5563]' : 'text-[#9CA3AF]'}>
                          {row.deltaVsAvg >= 0 ? `+${row.deltaVsAvg.toFixed(2)}%` : `${row.deltaVsAvg.toFixed(2)}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 3. LEXVED DEEP-DIVE
// =========================================================================
function SkillsetLexVedView({
  runs,
  model,
  setModel,
  mode,
  setMode,
  searchQuery,
  onExplainMetric
}: {
  runs: any[];
  model: string;
  setModel: (m: string) => void;
  mode: 'both' | 'Primitive' | 'Enhanced';
  setMode: (m: 'both' | 'Primitive' | 'Enhanced') => void;
  searchQuery?: string;
  onExplainMetric: (id: string) => void;
}) {
  const models = [
    { id: 'bge-m3', name: 'BAAI/bge-m3', desc: 'State-of-the-art multilingual embedding model with high recall' },
    { id: 'mpnet', name: 'multi-qa-mpnet-base-cos-v1', desc: '768-dim Sentence-Transformers optimized for QA similarity' },
    { id: 'distilbert', name: 'multi-qa-distilbert-cos-v1', desc: 'Lightweight distilled transformer for balanced retrieval' },
    { id: 'minilm', name: 'multi-qa-MiniLM-L6-cos-v1', desc: 'Ultra-fast 384-dim compact embedding with low latency' }
  ];

  const primRun = runs.find(r => (r.run_id.toLowerCase().includes(model) || r.model_name?.toLowerCase().includes(model)) && (r.run_id.toLowerCase().includes('prim') || r.metadata_json?.retrieval_mode === 'Primitive'));
  const enhRun = runs.find(r => (r.run_id.toLowerCase().includes(model) || r.model_name?.toLowerCase().includes(model)) && (r.run_id.toLowerCase().includes('enh') || r.metadata_json?.retrieval_mode === 'Enhanced'));

  const primM = primRun?.metrics || {};
  const enhM = enhRun?.metrics || {};

  const dynamicBarData = [
    { metric: 'Recall@5', Primitive: primM['recall_at_5'] ?? 0, Enhanced: enhM['recall_at_5'] ?? 0 },
    { metric: 'Recall@10', Primitive: primM['recall_at_10'] ?? 0, Enhanced: enhM['recall_at_10'] ?? 0 },
    { metric: 'MRR', Primitive: primM['mrr'] ?? 0, Enhanced: enhM['mrr'] ?? 0 },
    { metric: 'nDCG@10', Primitive: primM['ndcg_at_10'] ?? 0, Enhanced: enhM['ndcg_at_10'] ?? 0 },
    { metric: 'ROUGE-L', Primitive: primM['rouge_l_f1'] ?? 0, Enhanced: enhM['rouge_l_f1'] ?? 0 },
  ];

  const embLat = enhM['emb_latency'] ?? primM['emb_latency'] ?? 0;
  const idxSize = enhM['index_size'] ?? primM['index_size'] ?? 0;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">LexVed Architecture & Embedding Backends</h2>
            <p className="text-xs text-slate-600 font-medium">Base LLM: nvidia/nemotron-3-ultra-550b-a55b • 4 Embedding Backends</p>
          </div>
          <div className="bg-slate-100 p-1 rounded-full flex items-center text-xs font-bold">
            {(['both', 'Primitive', 'Enhanced'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-full transition ${mode === m ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                  }`}
              >
                {m === 'both' ? 'Compare Both' : m}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {models.map(m => {
            const isSelected = model === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`p-3 rounded-xl border text-left transition ${isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
              >
                <div className={`text-xs font-extrabold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{m.name}</div>
                <div className={`text-[11px] mt-0.5 font-medium leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>{m.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Primitive vs Enhanced Retrieval Impact</h3>
              <p className="text-xs text-slate-600 font-medium">Notice the consistent retrieval gain in Recall & nDCG under Enhanced mode</p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-slate-100 rounded-full text-slate-800">
              {models.find(m => m.id === model)?.name}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="metric" stroke="#64748b" tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tick={{ fill: '#334155', fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} domain={[0, 1.0]} />
                <Tooltip
                  content={<CustomChartTooltip />}
                  cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', fontWeight: 700 }} />
                <Bar dataKey="Primitive" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Enhanced" fill="#334155" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Indexing & System Overhead</h3>
            <p className="text-xs text-slate-600 font-medium">FAISS index build duration and vector count</p>

            <div className="mt-3 space-y-2.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-600 uppercase">Embedding Latency</div>
                <div className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">
                  {embLat > 0 ? `${embLat.toFixed(2)} s` : '—'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-600 uppercase">Vector Index Count</div>
                <div className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">
                  {idxSize > 0 ? `${idxSize.toLocaleString()} vectors` : '—'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-600 uppercase">Judge Parse Failure</div>
                <div className="text-xl font-extrabold font-mono text-emerald-700 mt-0.5">
                  0.0% (Zero Errors)
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
            💡 <strong>Dynamic Trade-off:</strong> MiniLM provides ultra-fast indexing (29.4s) while BGE-M3 maximizes Recall@10 at 90.0%.
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 4. LEXRAG DEEP-DIVE — 31-KPI Institutional Audit & Generation Benchmark
// =========================================================================
function SkillsetLexRAGView({ runs, searchQuery, onExplainMetric }: { runs: any[], searchQuery?: string, onExplainMetric: (id: string) => void }) {
  const [activeSubView, setActiveSubView] = useState<'31_audit' | 'granular_gen'>('31_audit');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Exact 31-KPI Institutional Audit Benchmark from /data/nithinh/legalai/LexRAG_Comparison/outputs/lexrag_31_kpi_institutional_audit.csv
  const allLexragAuditMetrics = [
    // 1. Infrastructure Latency (M1 - M3)
    { code: 'M1', name: 'Embedding Latency', val: 0.0809, unit: 's', category: 'Infrastructure Latency', id: 'emb_latency', desc: 'Corpus embedding build latency (0.0809s vs LexVed 0.0450s).', opt: 'lower', isLeader: false },
    { code: 'M2', name: 'Index Size (Vectors)', val: 5271, unit: 'chunks', category: 'Infrastructure Latency', id: 'index_size', desc: 'Total vectorized knowledge index (5,271 vs LexVed 19,793 chunks).', opt: 'neutral', isLeader: false },
    { code: 'M3', name: 'Retrieval Latency', val: 0.0320, unit: 's', category: 'Infrastructure Latency', id: 'ret_latency', desc: 'Precedent candidate retrieval duration (32.0 ms vs LexVed 125.0 ms).', opt: 'lower', isLeader: false },

    // 2. Retrieval Quality (M4 - M5)
    { code: 'M4', name: 'Cosine Similarity', val: 0.4742, unit: 'Score', category: 'Retrieval Quality', id: 'query_context_cos_sim', desc: 'Vector cosine similarity of query against retrieved chunks (0.4742 vs LexVed 0.7850).', opt: 'higher', isLeader: false },
    { code: 'M5', name: 'Recall@5', val: 94.5500, unit: '%', category: 'Retrieval Quality', id: 'recall_at_5', desc: 'Precedent chunks captured within top 5 candidates. System Leader!', opt: 'higher', isLeader: true },

    // 3. Lexical & Semantic (M6 - M12)
    { code: 'M6', name: 'ROUGE-1 F1', val: 33.4100, unit: '%', category: 'Lexical & Semantic', id: 'rouge_1_f1', desc: 'Unigram statutory overlap F1 (33.41% vs LexVed 28.50%).', opt: 'higher', isLeader: false },
    { code: 'M7', name: 'ROUGE-2 F1', val: 17.3000, unit: '%', category: 'Lexical & Semantic', id: 'rouge_2_f1', desc: 'Bigram phrase overlap F1 (17.30% vs LexVed 16.20%).', opt: 'higher', isLeader: false },
    { code: 'M8', name: 'ROUGE-L F1', val: 22.8200, unit: '%', category: 'Lexical & Semantic', id: 'rouge_l_f1', desc: 'Longest common subsequence structural F1 (22.82% vs LexVed 22.40%).', opt: 'higher', isLeader: false },
    { code: 'M9', name: 'Context Words', val: 582, unit: 'Words', category: 'Lexical & Semantic', id: 'context_words', desc: 'Compact legal prompt context budget (582 words vs LexVed 1,450).', opt: 'neutral', isLeader: false },
    { code: 'M10', name: 'BLEU Score (BLEU-4)', val: 8.0700, unit: '%', category: 'Lexical & Semantic', id: 'bleu_4', desc: '4-gram precision matching score (8.07% vs LexVed 12.80%).', opt: 'higher', isLeader: false },
    { code: 'M11', name: 'METEOR Score', val: 33.8300, unit: '%', category: 'Lexical & Semantic', id: 'meteor', desc: 'Synonym-aware translation metric (33.83% vs LexVed 34.50%).', opt: 'higher', isLeader: false },
    { code: 'M12', name: 'BERTScore F1', val: 74.8000, unit: '%', category: 'Lexical & Semantic', id: 'bertscore_f1', desc: 'Contextual semantic embedding similarity F1 (74.80% vs LexVed 74.20%).', opt: 'higher', isLeader: false },

    // 4. Factual Grounding (M13 - M15)
    { code: 'M13', name: 'Factual Deviation (FCD)', val: 14.7500, unit: '%', category: 'Factual Grounding', id: 'factual_deviation', desc: 'Rate of detected factual discrepancy (14.75% vs LexVed 12.00%).', opt: 'lower', isLeader: false },
    { code: 'M14', name: 'Faithfulness', val: 85.2500, unit: '%', category: 'Factual Grounding', id: 'faithfulness_judge', desc: 'LLM-as-a-judge verified factual ground consistency (85.25% vs LexVed 88.00%).', opt: 'higher', isLeader: false },
    { code: 'M15', name: 'Ground Truth Coverage', val: 60.3600, unit: '%', category: 'Factual Grounding', id: 'gt_coverage', desc: 'Essential propositions covered from verified gold legal answers.', opt: 'higher', isLeader: false },

    // 5. System Runtime (M16 - M19)
    { code: 'M16', name: 'End-to-End Latency', val: 10.3000, unit: 's', category: 'System Runtime', id: 'e2e_latency', desc: 'Total wall-clock response generation latency (10.30s vs LexVed 9.40s).', opt: 'lower', isLeader: false },
    { code: 'M17', name: 'System Throughput (QPS)', val: 0.0979, unit: 'QPS', category: 'System Runtime', id: 'throughput_qps', desc: 'Sustained throughput queries per second.', opt: 'higher', isLeader: false },
    { code: 'M18', name: 'CPU Utilization', val: 5.1000, unit: '%', category: 'System Runtime', id: 'cpu_usage', desc: 'Ultra-low CPU utilization (5.1% vs LexVed 24.5%). System Leader!', opt: 'lower', isLeader: true },
    { code: 'M19', name: 'RAM Utilization', val: 12.3000, unit: '%', category: 'System Runtime', id: 'ram_usage', desc: 'Minimal peak memory consumption (12.3% vs LexVed 52.0%). System Leader!', opt: 'lower', isLeader: true },

    // 6. Legal Compliance (M20 - M24)
    { code: 'M20', name: 'Citation Accuracy', val: 86.7400, unit: '%', category: 'Legal Compliance', id: 'citation_accuracy', desc: 'Verified statutory citation accuracy (86.74% vs LexVed 84.00%).', opt: 'higher', isLeader: false },
    { code: 'M21', name: 'Terminology Precision', val: 84.1800, unit: '%', category: 'Legal Compliance', id: 'terminology_precision', desc: 'Accuracy in using formal statutory terms (84.18% vs LexVed 91.50%).', opt: 'higher', isLeader: false },
    { code: 'M22', name: 'Precedent Match', val: 94.5500, unit: '%', category: 'Legal Compliance', id: 'precedent_match', desc: 'Matching authoritative precedents (94.55% vs LexVed 80.00%). System Leader!', opt: 'higher', isLeader: true },
    { code: 'M23', name: 'Regulatory Alignment', val: 95.0000, unit: '%', category: 'Legal Compliance', id: 'reg_alignment', desc: 'Compliance with mandatory statutory regulations (95.00%).', opt: 'higher', isLeader: true },
    { code: 'M24', name: 'Neutrality / Bias Index', val: 98.5000, unit: '%', category: 'Legal Compliance', id: 'bias_score', desc: 'Objective judicial reasoning neutrality index (98.50%). System Leader!', opt: 'higher', isLeader: true },

    // 7. Inference Stream (M25 - M27)
    { code: 'M25', name: 'Prefill Latency', val: 0.0873, unit: 's', category: 'Inference Stream', id: 'prefill_latency', desc: 'Ultra-fast context ingestion latency (87.3 ms vs LexVed 180.0 ms). System Leader!', opt: 'lower', isLeader: true },
    { code: 'M26', name: 'Time to First Token (TTFT)', val: 0.1164, unit: 's', category: 'Inference Stream', id: 'ttft', desc: 'Instant streaming token emission (116.4 ms vs LexVed 240.0 ms). System Leader!', opt: 'lower', isLeader: true },
    { code: 'M27', name: 'Generation Throughput', val: 37.0400, unit: 'tok/s', category: 'Inference Stream', id: 'tokens_per_sec', desc: 'Token generation rate in streaming mode (37.04 vs LexVed 45.00 tok/s).', opt: 'higher', isLeader: false },

    // 8. IR Benchmark (M28 - M31)
    { code: 'M28', name: 'Recall@10', val: 95.4500, unit: '%', category: 'IR Benchmark', id: 'recall_at_10', desc: 'Peak precedent retrieval coverage across all platforms. System Benchmark Leader!', opt: 'higher', isLeader: true },
    { code: 'M29', name: 'Mean Reciprocal Rank (MRR)', val: 0.8837, unit: 'Score', category: 'IR Benchmark', id: 'mrr', desc: 'Top reciprocal rank for authoritative precedents (0.8837). System Benchmark Leader!', opt: 'higher', isLeader: true },
    { code: 'M30', name: 'nDCG@10', val: 0.9008, unit: 'Score', category: 'IR Benchmark', id: 'ndcg_at_10', desc: 'Discounted cumulative gain ranking quality (0.9008). System Benchmark Leader!', opt: 'higher', isLeader: true },
    { code: 'M31', name: 'Precision@5', val: 64.7300, unit: '%', category: 'IR Benchmark', id: 'precision_at_5', desc: 'Proportion of top-5 retrieved items that are relevant (64.73% vs LexVed 20.00%). System Leader!', opt: 'higher', isLeader: true },
  ];

  // Granular Generation Suite
  const granularGenMetrics = [
    { name: 'ROUGE-L F1', val: 0.2306, id: 'rouge_l_f1', desc: 'Structural sequence matching F1' },
    { name: 'BERTScore Precision', val: 0.7140, id: 'bert_precision', desc: 'Contextual token precision' },
    { name: 'BERTScore Recall', val: 0.7844, id: 'bert_recall', desc: 'Contextual token recall' },
    { name: 'BERTScore F1', val: 0.7472, id: 'bertscore_f1', desc: 'Semantic harmonic mean' },
    { name: 'BLEU-1', val: 0.2854, id: 'bleu_1', desc: 'Unigram precision' },
    { name: 'BLEU-2', val: 0.2526, id: 'bleu_2', desc: 'Bigram precision' },
    { name: 'BLEU-3', val: 0.2233, id: 'bleu_3', desc: 'Trigram precision' },
    { name: 'BLEU-4', val: 0.1852, id: 'bleu_4', desc: '4-gram precision' },
    { name: 'Keyword Accuracy', val: 0.7329, id: 'keyword_accuracy', desc: 'Statutory keyword alignment' },
    { name: 'Character Precision', val: 0.2854, id: 'char_precision', desc: 'Character-level exact match' },
    { name: 'Character Recall', val: 0.8218, id: 'char_recall', desc: 'Character-level recall' },
    { name: 'Character F1', val: 0.4120, id: 'char_f1', desc: 'Character harmonic mean' },
    { name: 'METEOR Score', val: 0.3843, id: 'meteor', desc: 'Synonym-aware translation fluency' },
  ];

  const categories = ['All', 'Infrastructure Latency', 'Retrieval Quality', 'Lexical & Semantic', 'Factual Grounding', 'System Runtime', 'Legal Compliance', 'Inference Stream', 'IR Benchmark'];

  const q = searchQuery?.trim().toLowerCase();
  const filteredAuditMetrics = allLexragAuditMetrics.filter(m => {
    const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;
    const matchesSearch = !q ||
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.code.toLowerCase().includes(q) ||
      m.desc.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const filteredGenMetrics = granularGenMetrics.filter(m => !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q));

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900">LexRAG — 31-KPI Institutional Audit & Benchmark</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Audited Benchmark
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Saved to: /data/nithinh/legalai/LexRAG_Comparison/outputs/lexrag_31_kpi_institutional_audit.csv
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {searchQuery && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
              Filtering: "{searchQuery}"
            </span>
          )}
          <div className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-extrabold flex items-center gap-1 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recall@10 Leader: 95.45%</span>
          </div>
          <div className="px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-extrabold shadow-xs">
            MRR Leader: 0.8837
          </div>
        </div>
      </div>

      {/* Subview Selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveSubView('31_audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeSubView === '31_audit'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            31-KPI Institutional Audit (M1–M31)
          </button>
          <button
            onClick={() => setActiveSubView('granular_gen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeSubView === 'granular_gen'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Granular Generation Suite (13 metrics)
          </button>
        </div>

        {activeSubView === '31_audit' && (
          <div className="text-xs font-bold text-slate-500">
            Showing {filteredAuditMetrics.length} of {allLexragAuditMetrics.length} KPIs
          </div>
        )}
      </div>

      {/* View 1: Full 31-KPI Institutional Audit */}
      {activeSubView === '31_audit' ? (
        <div className="space-y-3">
          {/* Operational Category Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition cursor-pointer ${selectedCategory === cat
                  ? 'bg-[#4B5563] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredAuditMetrics.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-xs text-slate-500 font-medium">
              No LexRAG KPIs match "{searchQuery}" in category "{selectedCategory}"
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAuditMetrics.map(m => (
                <div
                  key={m.code}
                  onClick={() => onExplainMetric(m.id)}
                  className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs cursor-pointer hover:border-[#4B5563] transition flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-extrabold px-1.5 py-0.5 rounded bg-[#4B5563]/15 text-[#4B5563]">
                          {m.code}
                        </span>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-[#4B5563] transition">
                          {m.name}
                        </span>
                      </div>
                      {m.isLeader && (
                        <span className="text-[10px] bg-[#4B5563] text-white px-2 py-0.5 rounded-full font-extrabold shrink-0">
                          System Lead
                        </span>
                      )}
                    </div>
                    <div className="text-3xl font-extrabold font-mono text-slate-900 mt-2">
                      {typeof m.val === 'number' ? (m.val % 1 === 0 ? m.val.toFixed(0) : m.val >= 10 ? m.val.toFixed(2) : m.val.toFixed(4)) : m.val}
                      <span className="text-xs text-slate-500 font-sans ml-1.5 font-bold">{m.unit}</span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                      {m.category} • {m.opt === 'higher' ? 'Higher is better' : (m.opt === 'lower' ? 'Lower is better' : 'Scale Neutral')}
                    </div>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">{m.desc}</p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>View calculation</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* View 2: Granular Generation Suite */
        <div className="space-y-3">
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/60 text-xs text-emerald-900 font-medium leading-relaxed">
            🔍 <strong>Granular Token & Character Inspection:</strong> LexRAG evaluates fine-grained n-gram precision (BLEU 1–4) and character-level boundaries (82.18% Character Recall) along with statutory keyword matching accuracy (73.29%).
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredGenMetrics.map(m => (
              <div
                key={m.name}
                onClick={() => onExplainMetric(m.id)}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs cursor-pointer hover:border-slate-300 transition group"
              >
                <div className="text-xs font-bold text-slate-700 group-hover:text-emerald-600 transition">{m.name}</div>
                <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1">{m.val.toFixed(4)}</div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 5. AILQA DEEP-DIVE — Full 31 Institutional Metrics (M1 - M31)
// =========================================================================
function SkillsetAILQAView({ runs, searchQuery, onExplainMetric }: { runs: any[], searchQuery?: string, onExplainMetric: (id: string) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Exact 31 Institutional Evaluation Metrics exported to /data/nithinh/legalai/AILQA_Comparison/outputs/ailqa_m1_m31_institutional_benchmark.csv
  const allInstitutionalMetrics = [
    // 1. Infrastructure Latency (M1 - M3)
    { code: 'M1', name: 'Embedding Latency', val: 0.0184, unit: 's', category: 'Infrastructure Latency', id: 'emb_latency', desc: 'Vector embedding build time for queries and document chunks.', opt: 'lower', isLeader: true },
    { code: 'M2', name: 'Index Size (Vectors/Chunks)', val: 5271.0, unit: 'chunks', category: 'Infrastructure Latency', id: 'index_size', desc: 'Total vectorized precedent chunks indexed in FAISS store.', opt: 'neutral', isLeader: false },
    { code: 'M3', name: 'Retrieval Latency', val: 0.0035, unit: 's', category: 'Infrastructure Latency', id: 'ret_latency', desc: 'Ultra-low candidate retrieval latency (3.5 ms wall-clock time).', opt: 'lower', isLeader: true },

    // 2. Retrieval Quality (M4 - M5)
    { code: 'M4', name: 'Cosine Similarity', val: 0.5683, unit: 'score', category: 'Retrieval Quality', id: 'query_context_cos_sim', desc: 'Cosine similarity between query embedding and retrieved context.', opt: 'higher', isLeader: false },
    { code: 'M5', name: 'Recall@5', val: 0.0000, unit: '%', category: 'Retrieval Quality', id: 'recall_at_5', desc: 'Relevant precedent candidates retrieved in the top 5 positions.', opt: 'higher', isLeader: false },

    // 3. Lexical & Semantic Precision (M6 - M12)
    { code: 'M6', name: 'ROUGE-1 F1', val: 50.3000, unit: '%', category: 'Lexical & Semantic Precision', id: 'rouge_1_f1', desc: 'Unigram overlap F1 with statutory ground truth text.', opt: 'higher', isLeader: true },
    { code: 'M7', name: 'ROUGE-2 F1', val: 31.2600, unit: '%', category: 'Lexical & Semantic Precision', id: 'rouge_2_f1', desc: 'Bigram phrase overlap F1 measuring preserved legal terminology.', opt: 'higher', isLeader: true },
    { code: 'M8', name: 'ROUGE-L F1', val: 37.2600, unit: '%', category: 'Lexical & Semantic Precision', id: 'rouge_l_f1', desc: 'Longest common subsequence F1 structural coherence (0.3726 eq).', opt: 'higher', isLeader: true },
    { code: 'M9', name: 'Context Words', val: 2364.0, unit: 'words', category: 'Lexical & Semantic Precision', id: 'context_words', desc: 'Total words in prompt context budget provided to generator.', opt: 'neutral', isLeader: false },
    { code: 'M10', name: 'BLEU-4 Score', val: 20.7300, unit: '%', category: 'Lexical & Semantic Precision', id: 'bleu_4', desc: '4-gram precision matching score (0.2073 equivalent).', opt: 'higher', isLeader: true },
    { code: 'M11', name: 'METEOR Score', val: 44.3800, unit: '%', category: 'Lexical & Semantic Precision', id: 'meteor', desc: 'Explicit ordering, stemming, and synonymy-aware translation metric (0.4438 eq). System Leader!', opt: 'higher', isLeader: true },
    { code: 'M12', name: 'BERTScore / MPNet F1', val: 82.5000, unit: '%', category: 'Lexical & Semantic Precision', id: 'bertscore_f1', desc: 'Contextual semantic embedding similarity F1 (0.8250 eq).', opt: 'higher', isLeader: false },

    // 4. Factual Grounding (M13 - M15)
    { code: 'M13', name: 'Factual Consistency Dev. (FCD)', val: 0.8400, unit: '%', category: 'Factual Grounding', id: 'factual_deviation', desc: 'Factual deviation rate detected by judge (near-zero hallucination).', opt: 'lower', isLeader: true },
    { code: 'M14', name: 'Faithfulness', val: 99.1600, unit: '%', category: 'Factual Grounding', id: 'faithfulness_judge', desc: 'LLM-as-a-judge verified fidelity to verified retrieved legal context. System Leader!', opt: 'higher', isLeader: true },
    { code: 'M15', name: 'Ground Truth Coverage', val: 88.6900, unit: '%', category: 'Factual Grounding', id: 'gt_coverage', desc: 'Percentage of essential ground truth facts addressed in the legal answer.', opt: 'higher', isLeader: true },

    // 5. System Runtime & Efficiency (M16 - M19)
    { code: 'M16', name: 'End-to-End Latency', val: 2.4535, unit: 's', category: 'System Runtime & Efficiency', id: 'e2e_latency', desc: 'Wall-clock response time from query submission to completed answer.', opt: 'lower', isLeader: true },
    { code: 'M17', name: 'System Throughput', val: 0.4076, unit: 'QPS', category: 'System Runtime & Efficiency', id: 'throughput_qps', desc: 'Sustained queries per second in concurrent server benchmark.', opt: 'higher', isLeader: true },
    { code: 'M18', name: 'CPU Utilization', val: 22.7700, unit: '%', category: 'System Runtime & Efficiency', id: 'cpu_usage', desc: 'Average processor utilization during inference pipeline.', opt: 'lower', isLeader: true },
    { code: 'M19', name: 'RAM Utilization', val: 1.6760, unit: 'GB', category: 'System Runtime & Efficiency', id: 'ram_usage', desc: 'Peak resident memory footprint during generation.', opt: 'lower', isLeader: true },

    // 6. Legal Compliance & Reasoning (M20 - M24)
    { code: 'M20', name: 'Citation Accuracy', val: 90.3800, unit: '%', category: 'Legal Compliance & Reasoning', id: 'citation_accuracy', desc: 'Accuracy of case citations, statutes, and judicial references.', opt: 'higher', isLeader: true },
    { code: 'M21', name: 'Terminology Precision', val: 86.8900, unit: '%', category: 'Legal Compliance & Reasoning', id: 'terminology_precision', desc: 'Precision in utilizing specialized legal and statutory vocabulary.', opt: 'higher', isLeader: false },
    { code: 'M22', name: 'Precedent Match', val: 71.3600, unit: '%', category: 'Legal Compliance & Reasoning', id: 'precedent_match', desc: 'Rate of binding precedents accurately matched to query issues.', opt: 'higher', isLeader: false },
    { code: 'M23', name: 'Regulatory Alignment', val: 95.0000, unit: '%', category: 'Legal Compliance & Reasoning', id: 'reg_alignment', desc: 'Degree of compliance with mandatory regulatory frameworks.', opt: 'higher', isLeader: true },
    { code: 'M24', name: 'Bias Score', val: 3.5000, unit: '%', category: 'Legal Compliance & Reasoning', id: 'bias_score', desc: 'Audit score for prejudicial or skewed legal interpretations (lower is better).', opt: 'lower', isLeader: true },

    // 7. LLM Stream & Inference (M25 - M27)
    { code: 'M25', name: 'Time to First Token (TTFT)', val: 0.4500, unit: 's', category: 'LLM Stream & Inference', id: 'ttft', desc: 'Latency until initial token emission (450 ms streaming response).', opt: 'lower', isLeader: true },
    { code: 'M26', name: 'Prefill Latency', val: 0.2800, unit: 's', category: 'LLM Stream & Inference', id: 'prefill_latency', desc: 'Time spent encoding context and setting up KV cache.', opt: 'lower', isLeader: true },
    { code: 'M27', name: 'Generation Throughput', val: 55.6400, unit: 'tok/s', category: 'LLM Stream & Inference', id: 'tokens_per_sec', desc: 'Streaming generation throughput in tokens per second.', opt: 'higher', isLeader: true },

    // 8. IR Benchmarks (M28 - M31)
    { code: 'M28', name: 'Recall@10', val: 94.5500, unit: '%', category: 'IR Benchmarks', id: 'recall_at_10', desc: 'Dense precedent retrieval coverage (94.55% on Precedent suite; 0.00% on pure gen run).', opt: 'higher', isLeader: true },
    { code: 'M29', name: 'Mean Reciprocal Rank (MRR)', val: 0.8613, unit: 'score', category: 'IR Benchmarks', id: 'mrr', desc: 'Reciprocal rank of first authoritative precedent chunk.', opt: 'higher', isLeader: true },
    { code: 'M30', name: 'nDCG@10', val: 0.8600, unit: 'score', category: 'IR Benchmarks', id: 'ndcg_at_10', desc: 'Normalized discounted cumulative gain ranking metric.', opt: 'higher', isLeader: true },
    { code: 'M31', name: 'Precision@5', val: 0.0000, unit: '%', category: 'IR Benchmarks', id: 'precision_at_5', desc: 'Proportion of top-5 retrieved items that are relevant.', opt: 'higher', isLeader: false },
  ];

  const categories = ['All', 'Infrastructure Latency', 'Retrieval Quality', 'Lexical & Semantic Precision', 'Factual Grounding', 'System Runtime & Efficiency', 'Legal Compliance & Reasoning', 'LLM Stream & Inference', 'IR Benchmarks'];

  const q = searchQuery?.trim().toLowerCase();
  const filteredMetrics = allInstitutionalMetrics.filter(m => {
    const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;
    const matchesSearch = !q ||
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.code.toLowerCase().includes(q) ||
      m.desc.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900">AILQA — All 31 Institutional Metrics (M1 - M31)</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFC700]/15 text-[#FFC700] border border-[#FFC700]/30">
              Official Benchmark
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Exported to /data/nithinh/legalai/AILQA_Comparison/outputs/ailqa_m1_m31_institutional_benchmark.csv
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {searchQuery && (
            <span className="px-3 py-1 bg-[#FFC700]/15 text-[#FFC700] border border-[#FFC700]/30 rounded-full text-xs font-bold">
              Filtering: "{searchQuery}"
            </span>
          )}
          <div className="px-3 py-1 bg-[#FFC700] text-[#0D0D0D] rounded-full text-xs font-extrabold flex items-center gap-1 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>METEOR Leader: 44.38%</span>
          </div>
          <div className="px-3 py-1 bg-[#17181C] text-[#FFC700] border border-[#FFC700]/40 rounded-full text-xs font-extrabold shadow-xs">
            Faithfulness: 99.16%
          </div>
        </div>
      </div>

      {/* Operational Category Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition cursor-pointer ${selectedCategory === cat
              ? 'bg-[#FFC700] text-[#0D0D0D] shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredMetrics.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-xs text-slate-500 font-medium">
          No AILQA metrics match "{searchQuery}" in category "{selectedCategory}"
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMetrics.map(m => (
            <div
              key={m.code}
              onClick={() => onExplainMetric(m.id)}
              className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs cursor-pointer hover:border-[#FFC700] transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                      {m.code}
                    </span>
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#FFC700] transition">
                      {m.name}
                    </span>
                  </div>
                  {m.isLeader && (
                    <span className="text-[10px] bg-[#FFC700] text-[#0D0D0D] px-2 py-0.5 rounded-full font-extrabold shrink-0">
                      System Lead
                    </span>
                  )}
                </div>
                <div className="text-3xl font-extrabold font-mono text-slate-900 mt-2">
                  {typeof m.val === 'number' ? (m.val % 1 === 0 ? m.val.toFixed(0) : m.val >= 10 ? m.val.toFixed(2) : m.val.toFixed(4)) : m.val}
                  <span className="text-xs text-slate-500 font-sans ml-1.5 font-bold">{m.unit}</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mt-1">
                  {m.category} • {m.opt === 'higher' ? 'Higher is better' : (m.opt === 'lower' ? 'Lower is better' : 'Scale Neutral')}
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">{m.desc}</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>View metric definition</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#FFC700] transition" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 6. RUNS DIRECTORY
// =========================================================================
function SkillsetRunsView({
  runs,
  searchQuery,
  onRefresh,
  onExplainMetric,
  onUpdateRunNote
}: {
  runs: any[];
  searchQuery?: string;
  onRefresh: () => void;
  onExplainMetric: (id: string) => void;
  onUpdateRunNote?: (runId: string, newNote: string) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [editingRun, setEditingRun] = useState<any | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const effectiveSearch = (searchQuery || search).toLowerCase();
  const filtered = runs.filter(r =>
    r.run_id.toLowerCase().includes(effectiveSearch) ||
    r.system_name?.toLowerCase().includes(effectiveSearch) ||
    r.model_name?.toLowerCase().includes(effectiveSearch) ||
    r.retrieval_mode?.toLowerCase().includes(effectiveSearch) ||
    (r.notes && r.notes.toLowerCase().includes(effectiveSearch))
  );

  const handleOpenEditNote = (run: any) => {
    setEditingRun(run);
    setNoteText(run.notes || '');
  };

  const handleSaveRunNote = async () => {
    if (!editingRun || !onUpdateRunNote) return;
    setIsSaving(true);
    try {
      await onUpdateRunNote(editingRun.run_id, noteText);
      setEditingRun(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search runs by ID, model, notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 rounded-full pl-8 pr-3.5 py-1.5 text-xs text-slate-900 font-medium placeholder-slate-500 focus:outline-none"
          />
        </div>
        <span className="text-xs font-bold text-slate-700">Showing {filtered.length} runs</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 uppercase font-mono text-[10px] border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-5 font-bold">Run ID</th>
              <th className="py-2.5 px-4 font-bold">System</th>
              <th className="py-2.5 px-4 font-bold">Model / Pipeline</th>
              <th className="py-2.5 px-4 font-bold">Metrics</th>
              <th className="py-2.5 px-4 font-bold">Evaluation Notes</th>
              <th className="py-2.5 px-5 font-bold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition">
                <td className="py-2.5 px-5 font-mono font-bold text-slate-900">{r.run_id}</td>
                <td className="py-2.5 px-4 font-bold text-slate-900">{r.system_name}</td>
                <td className="py-2.5 px-4 text-slate-700 font-medium">{r.model_name || 'Standard'}</td>
                <td className="py-2.5 px-4 font-mono text-slate-700 font-semibold">{r.metric_count} metrics</td>
                <td className="py-2.5 px-4 max-w-xs">
                  {r.notes ? (
                    <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => handleOpenEditNote(r)} title="Click to edit run note">
                      <p className="text-[11px] text-slate-600 truncate font-medium">{r.notes}</p>
                      <Pencil className="w-3 h-3 text-slate-400 group-hover:text-[#FFC700] shrink-0" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenEditNote(r)}
                      className="text-[10px] text-slate-500 hover:text-[#FFC700] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Note</span>
                    </button>
                  )}
                </td>
                <td className="py-2.5 px-5 text-right">
                  <span className="inline-block px-2.5 py-0.5 bg-[#0D0D0D] text-[#FFC700] text-[10px] font-bold rounded-full border border-[#FFC700]/30">
                    Completed
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Run Note Modal */}
      {editingRun && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Run Evaluation Note</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{editingRun.run_id} ({editingRun.system_name})</p>
              </div>
              <button
                onClick={() => setEditingRun(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Institutional Observation / Run Methodology:
              </label>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={4}
                placeholder="Enter notes on dataset size, evaluation hardware, or specialized prompt templates used..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#FFC700]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingRun(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRunNote}
                disabled={isSaving}
                className="px-4 py-2 bg-[#FFC700] hover:bg-[#E6B400] text-[#0D0D0D] font-black rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? 'Saving...' : 'Save Run Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 7. KEY FINDINGS / INSIGHTS
// =========================================================================
function SkillsetInsightsView({
  insights,
  notes = [],
  onSaveNote,
  onDeleteNote,
  onExplainMetric
}: {
  insights: any[];
  notes?: any[];
  onSaveNote?: (note: any) => Promise<void>;
  onDeleteNote?: (id: number) => Promise<void>;
  onExplainMetric: (id: string) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'empirical' | 'notes'>('all');
  const [selectedSystem, setSelectedSystem] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  // Note Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Legal Reasoning',
    system: 'All Systems',
    author: 'Senior Legal AI Analyst',
    tags: '',
    content: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenAdd = () => {
    setEditingNote(null);
    setFormData({
      title: '',
      category: 'Legal Reasoning',
      system: 'All Systems',
      author: 'Senior Legal AI Analyst',
      tags: '',
      content: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (note: any) => {
    setEditingNote(note);
    setFormData({
      title: note.title || '',
      category: note.category || 'Legal Reasoning',
      system: note.system || 'All Systems',
      author: note.author || 'Senior Legal AI Analyst',
      tags: Array.isArray(note.tags) ? note.tags.join(', ') : (note.tags || ''),
      content: note.content || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim() || !onSaveNote) return;
    setIsSaving(true);
    try {
      const tagList = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      await onSaveNote({
        ...(editingNote ? { id: editingNote.id } : {}),
        title: formData.title.trim(),
        category: formData.category,
        system: formData.system,
        author: formData.author.trim() || 'Senior Legal AI Analyst',
        tags: tagList,
        content: formData.content.trim(),
      });
      setIsModalOpen(false);
      setEditingNote(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (noteId: number) => {
    if (window.confirm('Are you sure you want to delete this research finding/note?')) {
      if (onDeleteNote) {
        await onDeleteNote(noteId);
      }
    }
  };

  // Filter logic
  const q = search.toLowerCase().trim();
  const filteredInsights = insights.filter(ins => {
    const matchesSys = selectedSystem === 'All' || ins.system === selectedSystem;
    const matchesQ = !q || ins.title?.toLowerCase().includes(q) || ins.content?.toLowerCase().includes(q) || ins.category?.toLowerCase().includes(q);
    return matchesSys && matchesQ;
  });

  const filteredNotes = notes.filter(n => {
    const matchesSys = selectedSystem === 'All' || n.system === selectedSystem || n.system === 'All Systems';
    const matchesQ = !q || n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q) || n.category?.toLowerCase().includes(q) || (Array.isArray(n.tags) && n.tags.some((t: string) => t.toLowerCase().includes(q)));
    return matchesSys && matchesQ;
  });

  const totalItems = activeFilter === 'all'
    ? filteredInsights.length + filteredNotes.length
    : activeFilter === 'empirical'
    ? filteredInsights.length
    : filteredNotes.length;

  return (
    <div className="space-y-5">
      {/* ─── HERO HEADER BANNER WITH WRITE NOTE ACTION ─── */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFC700]/15 text-[#B38600] border border-[#FFC700]/30 uppercase tracking-wider">
              Research & Findings Hub
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              {filteredInsights.length} Empirical • {filteredNotes.length} Custom Notes
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900 mt-1 tracking-tight">
            Key Empirical Findings & Institutional Notes
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed font-medium">
            Review algorithmic trade-offs computed directly from benchmark matrices, or write and annotate institutional research notes on legal reasoning, precedents, and latency.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-[#FFC700] hover:bg-[#E6B400] text-[#0D0D0D] rounded-xl text-xs font-black transition flex items-center gap-2 shrink-0 shadow-xs hover:shadow-md cursor-pointer"
        >
          <PenLine className="w-4 h-4" />
          <span>Write Finding / Note</span>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ─── INTERACTIVE FILTER CONTROLS ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Source Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `All Findings (${filteredInsights.length + filteredNotes.length})` },
            { id: 'empirical', label: `Empirical Algorithmic (${filteredInsights.length})` },
            { id: 'notes', label: `Researcher Notes (${filteredNotes.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-[#0D0D0D] text-[#FFC700] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Platform & Text Search Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedSystem}
            onChange={e => setSelectedSystem(e.target.value)}
            className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none"
          >
            <option value="All">All Platforms</option>
            <option value="LexVed">LexVed</option>
            <option value="LexRAG">LexRAG</option>
            <option value="AILQA">AILQA</option>
          </select>

          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search findings & notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#FFC700]"
            />
          </div>
        </div>
      </div>

      {/* ─── FINDINGS & NOTES GRID ─── */}
      {totalItems === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <Lightbulb className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-extrabold text-slate-900">No findings or notes match your filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting your search query or platform filter, or write a new custom research note above.
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FFC700] hover:bg-[#E6B400] text-[#0D0D0D] font-black rounded-xl text-xs transition shadow-xs cursor-pointer"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>Write First Custom Note</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 1. Custom Researcher Notes */}
          {(activeFilter === 'all' || activeFilter === 'notes') &&
            filteredNotes.map(n => (
              <div
                key={`note-${n.id}`}
                className="bg-white rounded-2xl p-5 border border-slate-200 border-l-4 border-l-[#FFC700] shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFC700]/15 text-[#B38600] border border-[#FFC700]/30 uppercase tracking-wider">
                        {n.category || 'Research Note'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {n.system || 'All Systems'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0D0D0D] text-[#FFC700] border border-[#FFC700]/30 flex items-center gap-1">
                        <span>📌</span> Note
                      </span>
                      <button
                        onClick={() => handleOpenEdit(n)}
                        className="p-1 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                        title="Edit Note"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 mt-1.5 leading-snug">
                    {n.title}
                  </h3>
                  <p className="text-xs text-slate-700 mt-2 leading-relaxed font-medium whitespace-pre-wrap">
                    {n.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-[11px] text-slate-500 font-medium">
                    By <strong className="text-slate-700">{n.author || 'Senior Legal Analyst'}</strong> • {new Date(n.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>

                  {Array.isArray(n.tags) && n.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {n.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

          {/* 2. Automated Empirical Benchmark Findings */}
          {(activeFilter === 'all' || activeFilter === 'empirical') &&
            filteredInsights.map((ins, i) => (
              <div
                key={`ins-${i}`}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                      {ins.category}
                    </span>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold"
                      style={{
                        backgroundColor: ins.system === 'LexVed' ? '#33415518' : ins.system === 'LexRAG' ? '#4B556318' : '#FFC70018',
                        color: ins.system === 'LexVed' ? '#334155' : ins.system === 'LexRAG' ? '#4B5563' : '#B38600',
                        border: `1px solid ${ins.system === 'LexVed' ? '#33415540' : ins.system === 'LexRAG' ? '#4B556340' : '#FFC70040'}`
                      }}
                    >
                      {ins.system}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1 leading-snug">
                    {ins.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                    {ins.content}
                  </p>
                </div>

                {ins.metrics && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metrics:</span>
                      {ins.metrics.map((m: string) => (
                        <button
                          key={m}
                          onClick={() => onExplainMetric(m)}
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 hover:bg-[#FFC700] hover:text-[#0D0D0D] transition cursor-pointer"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">⚡ Empirical</span>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* ─── ADD / EDIT RESEARCH NOTE MODAL DIALOG ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#0D0D0D] border border-[#FFC700]/50 flex items-center justify-center text-[#FFC700]">
                  <PenLine className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingNote ? 'Edit Research Finding / Note' : 'Write New Finding / Note'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Record key takeaways, judicial caveats, or latency trade-offs</p>
                </div>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setEditingNote(null); }}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Finding / Note Title <span className="text-[#FFC700]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Precedent Recall Gap in Complex Appellate Queries"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#FFC700]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operational Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none"
                  >
                    <option value="Legal Reasoning">Legal Reasoning & Precedents</option>
                    <option value="Factual Grounding">Factual Grounding & Hallucinations</option>
                    <option value="Retrieval Ranking">Retrieval Ranking & MRR</option>
                    <option value="System Optimization">System Optimization & Latency</option>
                    <option value="Generation Fluency">Generation Quality & Fluency</option>
                    <option value="Executive Finding">Executive Takeaway</option>
                    <option value="Methodology & Caveats">Methodology & Limitations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Platform / System
                  </label>
                  <select
                    value={formData.system}
                    onChange={e => setFormData({ ...formData, system: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none"
                  >
                    <option value="All Systems">All Platforms (Comparative)</option>
                    <option value="AILQA">AILQA</option>
                    <option value="LexVed">LexVed</option>
                    <option value="LexRAG">LexRAG</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Author / Lead Auditor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Legal AI Analyst"
                    value={formData.author}
                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-[#FFC700]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Precedents, Recall@10, Benchmark"
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-[#FFC700]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Findings & Analysis <span className="text-[#FFC700]">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Record your legal observations, analysis of trade-offs, potential hallucination risks, or benchmark recommendations..."
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#FFC700]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingNote(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#FFC700] hover:bg-[#E6B400] text-[#0D0D0D] font-black rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving ? 'Saving...' : editingNote ? 'Update Finding' : 'Save Finding / Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 8. METRIC DICTIONARY
// =========================================================================
function SkillsetMetricsView({ metricDefs, searchQuery, onSelectMetric }: { metricDefs: any[], searchQuery?: string, onSelectMetric: (m: any) => void }) {
  const q = searchQuery?.trim().toLowerCase();
  const filtered = metricDefs.filter(m =>
    !q ||
    m.name?.toLowerCase().includes(q) ||
    m.metric_id?.toLowerCase().includes(q) ||
    m.category?.toLowerCase().includes(q) ||
    m.description?.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Legal Evaluation Metric Dictionary</h2>
          <p className="text-xs text-slate-600 font-medium">Formal mathematical definitions, directional interpretations, and legal significance</p>
        </div>
        <div className="flex items-center gap-2">
          {searchQuery && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
              Filtering: "{searchQuery}"
            </span>
          )}
          <span className="text-xs font-bold text-slate-700">
            Showing {filtered.length} of {metricDefs.length} metrics
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-xs text-slate-500 font-medium">
          No metrics match your search query "{searchQuery}"
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => (
            <div
              key={m.id}
              onClick={() => onSelectMetric(m)}
              className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs cursor-pointer hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                  <span>{m.metric_id}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full text-slate-800">{m.category}</span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 mt-1.5">{m.name}</h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed font-medium">{m.description}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
                <span className={m.direction === 'higher' ? 'text-emerald-700' : 'text-blue-700'}>
                  {m.direction === 'higher' ? '↑ Higher is better' : '↓ Lower is better'}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 9. ADD EVALUATION RUN VIEW — With Direct CSV Importer
// =========================================================================
function SkillsetAddRunView({ metricDefs, onSuccess, onCancel }: { metricDefs: any[], onSuccess: () => void, onCancel: () => void }) {
  const [entryMode, setEntryMode] = useState<'csv' | 'image' | 'manual'>('csv');
  const [systemId, setSystemId] = useState<number>(1);
  const [runId, setRunId] = useState<string>(`RUN-${Date.now().toString().slice(-4)}`);
  const [modelName, setModelName] = useState<string>('');
  const [methodology, setMethodology] = useState<string>('Standard Benchmark');
  const [notes, setNotes] = useState<string>('');
  const [metricValues, setMetricValues] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showAllMetrics, setShowAllMetrics] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [uploadStatus, setUploadStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  // Image OCR state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrRawText, setOcrRawText] = useState<string>('');

  const quickMetrics = ['recall_at_10', 'mrr', 'ndcg_at_10', 'meteor', 'rouge_l_f1', 'bertscore_f1'];
  const categories = ['all', 'Retrieval', 'Generation', 'Faithfulness', 'Legal', 'Performance', 'Resource'];

  const downloadSampleCSV = () => {
    const csvContent = "metric,value\nrecall_at_10,0.9250\nmrr,0.8400\nndcg_at_10,0.8500\nmeteor,0.3780\nrouge_l_f1,0.3450\nbertscore_f1,0.8820\nret_latency,1.8500\nfaithfulness,0.9100\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample_evaluation_benchmark.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDirectCSVUpload = async (file: File) => {
    if (!file) return;
    setUploadStatus({ type: 'loading', message: `Parsing and ingesting ${file.name}...` });

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (modelName) formData.append('model_name', modelName);
      if (runId) formData.append('run_id', runId);
      if (systemId) formData.append('system_id', systemId.toString());
      if (methodology) formData.append('methodology', methodology);
      if (notes) formData.append('notes', notes);

      const res = await fetch(`${API_BASE}/runs/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadStatus({
          type: 'success',
          message: `✅ Successfully imported run "${data.run_code}" with ${data.metrics_count} metrics! Updating dashboard...`
        });
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setUploadStatus({
          type: 'error',
          message: `Upload failed: ${data.detail || 'Could not parse CSV'}`
        });
      }
    } catch (err: any) {
      setUploadStatus({
        type: 'error',
        message: `Network error: ${err.message || 'Failed to upload CSV'}`
      });
    }
  };

  const handleImageOCR = async (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setOcrLoading(true);
    setOcrProgress(0);
    setUploadStatus({ type: 'loading', message: `Initializing OCR engine for ${file.name}...` });

    try {
      const result = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round((m.progress || 0) * 100));
            }
          }
        }
      );

      const text = result.data.text || '';
      setOcrRawText(text);

      const lower = text.toLowerCase();
      if (lower.includes('lexved')) setSystemId(1);
      else if (lower.includes('lexrag')) setSystemId(2);
      else if (lower.includes('ailqa')) setSystemId(3);

      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const aliasMap: Record<string, string> = {
        'recall10': 'recall_at_10',
        'recalgio': 'recall_at_10',
        'recall': 'recall_at_10',
        'mrr': 'mrr',
        'mrrgi0': 'mrr',
        'mrr10': 'mrr',
        'ndcg': 'ndcg_at_10',
        'ndcg10': 'ndcg_at_10',
        'ndcs10': 'ndcg_at_10',
        'rougel': 'rouge_l_f1',
        'rouge1': 'rouge_l_f1',
        'rouge': 'rouge_l_f1',
        'bertscore': 'bertscore_f1',
        'bertf1': 'bertscore_f1',
        'bertprecision': 'bert_precision',
        'bertrecall': 'bert_recall',
        'bleu1': 'bleu_1',
        'bleu2': 'bleu_2',
        'bleu3': 'bleu_3',
        'bleu4': 'bleu_4',
        'bleud': 'bleu_4',
        'keywordaccuracy': 'keyword_accuracy',
        'charprecision': 'char_precision',
        'charrecall': 'char_recall',
        'charf1': 'char_f1',
        'meteor': 'meteor',
        'semanticmpnet': 'semantic_mpnet',
        'semantic': 'semantic_mpnet',
        'faithfulness': 'faithfulness',
        'latency': 'ret_latency'
      };

      metricDefs.forEach((m: any) => {
        aliasMap[clean(m.metric_id)] = m.metric_id;
        aliasMap[clean(m.name)] = m.metric_id;
      });

      const extracted: Record<string, number> = {};
      const lines = text.split('\n');

      for (const line of lines) {
        const matches = Array.from(line.matchAll(/([0-9]+(?:\.[0-9]+)?%?)/g));
        if (!matches.length) continue;
        for (const match of matches) {
          const numRaw = match[0].replace('%', '');
          let val = parseFloat(numRaw);
          if (isNaN(val)) continue;

          if (val > 1000 && val < 10000) {
            val = val / 10000;
          }

          const prefix = clean(line.substring(0, match.index || 0));
          for (const [alias, mId] of Object.entries(aliasMap)) {
            if (prefix.includes(alias) && extracted[mId] === undefined) {
              extracted[mId] = val;
              break;
            }
          }
        }
      }

      setMetricValues(prev => ({ ...prev, ...extracted }));
      const foundCount = Object.keys(extracted).length;
      if (foundCount > 0) {
        setUploadStatus({
          type: 'success',
          message: `✅ OCR detected ${foundCount} metrics from image! Review values below and save.`
        });
      } else {
        setUploadStatus({
          type: 'error',
          message: `OCR processed the image, but could not automatically match metric labels. You can inspect the text or enter values manually.`
        });
      }
    } catch (err: any) {
      console.error('OCR failed', err);
      setUploadStatus({
        type: 'error',
        message: `OCR failed: ${err.message || 'Could not process image'}`
      });
    } finally {
      setOcrLoading(false);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (entryMode !== 'image') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleImageOCR(blob);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [entryMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_id: systemId,
          run_id: runId,
          model_name: modelName || 'Custom Evaluation Pipeline',
          methodology,
          notes,
          test_case_count: null,
          metrics: metricValues
        })
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to save evaluation run: ${err.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error creating evaluation run');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl p-6 border border-slate-200 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Add Evaluation Benchmark Run</h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Ingest test runs into SQLite — dashboard leaderboards & trade-offs update dynamically
          </p>
        </div>

        {/* Tab switch between CSV, Image OCR, and Manual */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setEntryMode('csv')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${entryMode === 'csv' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CSV Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('image')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${entryMode === 'image' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Screenshot OCR</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('manual')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${entryMode === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {/* ─── DIRECT CSV UPLOAD ZONE ─── */}
      {entryMode === 'csv' && (
        <div className="mt-5 space-y-4">
          <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl p-8 text-center bg-slate-50/60 hover:bg-slate-50 transition cursor-pointer relative">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleDirectCSVUpload(file);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Download className="w-6 h-6 rotate-180" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Drop your evaluation CSV file here, or browse
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1 max-w-md mx-auto">
              Directly updates leaderboards, comparison matrices, and trade-off curves upon upload.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-bold text-slate-700">
                Key-Value Format (metric, score)
              </span>
              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-bold text-slate-700">
                Wide Table Format (run_id, model, metrics...)
              </span>
            </div>
          </div>

          {/* Upload Status Banner */}
          {uploadStatus.type !== 'idle' && (
            <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 ${uploadStatus.type === 'loading' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              uploadStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                'bg-red-50 text-red-700 border-red-200'
              }`}>
              {uploadStatus.type === 'loading' && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
              <span>{uploadStatus.message}</span>
            </div>
          )}

          {/* Metadata overrides for CSV */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>Run Metadata Options (Optional)</span>
              <button
                type="button"
                onClick={downloadSampleCSV}
                className="text-blue-600 hover:text-blue-800 text-[11px] font-bold underline"
              >
                Download Sample CSV
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Target System</label>
                <select
                  value={systemId}
                  onChange={e => setSystemId(parseInt(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-bold"
                >
                  <option value={1}>LexVed</option>
                  <option value={2}>LexRAG</option>
                  <option value={3}>AILQA</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Model Name</label>
                <input
                  type="text"
                  placeholder="Auto-detected if in CSV"
                  value={modelName}
                  onChange={e => setModelName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Methodology</label>
                <select
                  value={methodology}
                  onChange={e => setMethodology(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-bold"
                >
                  <option value="Enhanced">Enhanced</option>
                  <option value="Primitive">Primitive</option>
                  <option value="Dense Precedent">Dense Precedent</option>
                  <option value="Standard Benchmark">Standard Benchmark</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SCREENSHOT / IMAGE OCR ZONE ─── */}
      {entryMode === 'image' && (
        <div className="mt-5 space-y-4">
          <div className="border-2 border-dashed border-indigo-300 hover:border-indigo-400 rounded-2xl p-7 text-center bg-indigo-50/40 hover:bg-indigo-50/70 transition cursor-pointer relative">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageOCR(file);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Drop screenshot of benchmark results here, or press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono shadow-2xs">Ctrl+V</kbd> to paste
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1 max-w-md mx-auto">
              Our embedded AI OCR extracts metrics directly from table images, terminal logs, or paper screenshots.
            </p>
            <div className="mt-3.5 flex items-center justify-center gap-2 text-[11px] text-slate-600 font-semibold">
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">PNG</span>
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">JPG</span>
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">WebP</span>
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">Clipboard Paste</span>
            </div>
          </div>

          {/* OCR Progress or Status */}
          {ocrLoading && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  Recognizing and extracting legal metrics from image...
                </span>
                <span>{ocrProgress}%</span>
              </div>
              <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-150"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            </div>
          )}

          {uploadStatus.type !== 'idle' && !ocrLoading && (
            <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 ${uploadStatus.type === 'loading' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              uploadStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                'bg-red-50 text-red-700 border-red-200'
              }`}>
              <span>{uploadStatus.message}</span>
            </div>
          )}

          {/* Extracted Verification View */}
          {imagePreview && !ocrLoading && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                {/* Image Thumbnail */}
                <div className="space-y-2">
                  <div className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                    <span>Uploaded Screenshot</span>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setMetricValues({});
                      }}
                      className="text-red-600 hover:text-red-800 text-[10px] font-bold"
                    >
                      Clear Image
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-56 flex items-center justify-center p-1">
                    <img src={imagePreview} alt="Evaluation Benchmark" className="max-h-52 object-contain w-full rounded" />
                  </div>
                </div>

                {/* Detected Metrics Form */}
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">Extracted Metrics (Review & Edit)</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Verify values detected by OCR before saving to database</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {Object.keys(metricValues).length} Metrics Found
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 max-h-52 overflow-y-auto p-1">
                    {Object.keys(metricValues).length === 0 ? (
                      <div className="col-span-2 text-center text-xs text-slate-500 py-6">
                        No metrics were automatically matched. You can type them below or check the image clarity.
                      </div>
                    ) : (
                      Object.entries(metricValues).map(([mid, val]) => {
                        const def = metricDefs.find(m => m.metric_id === mid);
                        return (
                          <div key={mid} className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                              <span className="truncate">{def?.name || mid}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...metricValues };
                                  delete updated[mid];
                                  setMetricValues(updated);
                                }}
                                className="text-slate-400 hover:text-red-600 text-xs px-1"
                              >
                                ✕
                              </button>
                            </div>
                            <input
                              type="number"
                              step="0.0001"
                              value={val}
                              onChange={e => setMetricValues(prev => ({ ...prev, [mid]: parseFloat(e.target.value) || 0 }))}
                              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded p-1 font-mono text-xs font-bold text-slate-900"
                            />
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Run Metadata */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Target System</label>
                      <select
                        value={systemId}
                        onChange={e => setSystemId(parseInt(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded p-1.5 font-bold text-xs"
                      >
                        <option value={1}>LexVed</option>
                        <option value={2}>LexRAG</option>
                        <option value={3}>AILQA</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Model Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Nemotron-BGE"
                        value={modelName}
                        onChange={e => setModelName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Run Code</label>
                      <input
                        type="text"
                        value={runId}
                        onChange={e => setRunId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={submitting || Object.keys(metricValues).length === 0}
                      className="px-5 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition text-xs shadow-xs"
                    >
                      {submitting ? 'Saving to Database...' : 'Confirm & Ingest Run'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ─── MANUAL ENTRY FORM ─── */}
      {entryMode === 'manual' && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Target Evaluation System</label>
              <select
                value={systemId}
                onChange={e => setSystemId(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-bold"
              >
                <option value={1}>LexVed (Nemotron-3-Ultra-550B)</option>
                <option value={2}>LexRAG (Generation Benchmark Suite)</option>
                <option value={3}>AILQA (Dense Precedent QA)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Unique Run ID / Code</label>
              <input
                type="text"
                value={runId}
                onChange={e => setRunId(e.target.value)}
                required
                placeholder="e.g. LEXVED-CUSTOM-RUN-01"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-900 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Model / Embedding Pipeline</label>
              <input
                type="text"
                placeholder="e.g. BAAI/bge-m3 or Cohere-embed-v3"
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Retrieval Methodology</label>
              <select
                value={methodology}
                onChange={e => setMethodology(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-bold"
              >
                <option value="Enhanced">Enhanced (Multi-query + Reranking)</option>
                <option value="Primitive">Primitive (Single query FAISS)</option>
                <option value="Dense Precedent">Dense Precedent Retrieval</option>
                <option value="Standard Benchmark">Standard Benchmark</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Run Notes & Execution Details</label>
            <input
              type="text"
              placeholder="e.g. Tested on legal precedent corpus with chunk size 512"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900"
            />
          </div>

          {/* Metric Input Section */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="block text-slate-900 font-extrabold text-sm">Empirical Metric Values</span>
                <span className="text-slate-500 text-[11px] font-medium">
                  Entered metrics dynamically update leaderboards, trade-off curves, and comparison matrices
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAllMetrics(!showAllMetrics)}
                className="text-blue-600 hover:text-blue-800 font-bold text-xs"
              >
                {showAllMetrics ? 'Show Quick Metrics Only' : 'Show All 43 Registered Metrics'}
              </button>
            </div>

            {!showAllMetrics ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {quickMetrics.map(mid => {
                  const def = metricDefs.find(m => m.metric_id === mid);
                  return (
                    <div key={mid} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mb-1">
                        <span>{def?.name || mid}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({mid})</span>
                      </div>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="0.0000"
                        value={metricValues[mid] ?? ''}
                        onChange={e => setMetricValues(prev => ({ ...prev, [mid]: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-full">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize transition ${activeCategory === cat ? 'bg-slate-900 text-white' : 'text-slate-700 hover:text-slate-900'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
                  {metricDefs
                    .filter(m => activeCategory === 'all' || m.category === activeCategory)
                    .map(m => (
                      <div key={m.metric_id} className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[11px] font-bold text-slate-800 line-clamp-1">{m.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mb-1">{m.metric_id}</div>
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="0.0000"
                          value={metricValues[m.metric_id] ?? ''}
                          onChange={e => setMetricValues(prev => ({ ...prev, [m.metric_id]: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition shadow-xs"
            >
              {submitting ? 'Saving to Database...' : 'Save Evaluation Run'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// =========================================================================
// 10. HIGH-CONTRAST METRIC MODAL
// =========================================================================
function SkillsetMetricModal({ metric, onClose }: { metric: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl relative text-left border border-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-500 hover:text-slate-900 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FFC700]/15 text-[#FFC700] border border-[#FFC700]/30">
          {metric.category || 'Metric'}
        </span>

        <h2 className="text-xl font-extrabold text-slate-900 mt-2">{metric.name}</h2>

        <div className="mt-4 space-y-3.5 text-xs text-slate-700">
          <div>
            <h4 className="font-extrabold text-slate-900 mb-0.5">What it Measures</h4>
            <p className="leading-relaxed text-slate-600 font-medium">{metric.description}</p>
          </div>

          {metric.calculation && (
            <div>
              <h4 className="font-extrabold text-slate-900 mb-0.5">Mathematical Formula</h4>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-[11px] text-slate-900 font-semibold break-words">
                {metric.calculation}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-extrabold text-slate-900 mb-0.5">How to Interpret</h4>
            <p className="leading-relaxed text-slate-600 font-medium">{metric.interpretation || 'Higher indicates superior alignment.'}</p>
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#17181C] hover:bg-[#22242B] text-[#FFC700] border border-[#FFC700]/40 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
