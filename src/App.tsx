import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Network,
  Tag,
  CheckCircle2,
  ListFilter,
  Search,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Info,
  Sliders,
  Type,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  BookMarked,
  Filter,
  Save,
  Layers,
  ArrowRight,
  List,
  AlignLeft,
  ArrowLeft
} from 'lucide-react';

interface SutraMeta {
  id: string;
  order: number;
  juan: string;
  wordCount: number;
  title: string;
  tags: string[];
  coreTags: string[];
  unsortedTags: string[];
  userNotes?: string;
  hasNote: boolean;
  hasTable: boolean;
  isAnnotated: boolean;
  prevId?: string;
  nextId?: string;
}

interface SutraDetail extends SutraMeta {
  rawText: string;
  studyNotes?: string;
  tableContent?: string;
  canUndoTags?: boolean;
  canUndoNote?: boolean;
}

interface TagStat {
  name: string;
  count: number;
  coreCount: number;
  sutras: string[];
  pali?: string;
  samyukta?: string;
}

interface GraphNode {
  id: string;
  name: string;
  category: string;
  value: number;
  coreCount: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
  value: number;
  label?: string;
}

export default function App() {
  const [tab, setTab] = useState<'sutras' | 'tags' | 'graph' | 'workbench' | 'about'>('sutras');
  const [sutras, setSutras] = useState<SutraMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSutraId, setSelectedSutraId] = useState<string>('T99-0001');
  const [sutraDetail, setSutraDetail] = useState<SutraDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Mobile layout state: 'list' for directory, 'detail' for reading scripture
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  // Filters for Sutra list
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJuan, setSelectedJuan] = useState<string>('all');
  const [filterAnnotated, setFilterAnnotated] = useState<'all' | 'annotated' | 'todo'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Reading settings
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [fontSerif, setFontSerif] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Tags list
  const [tags, setTags] = useState<TagStat[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [tagCategoryFilter, setTagCategoryFilter] = useState<'all' | 'core' | 'frequent'>('all');

  // Graph state
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(null);
  const [relationTypeFilter, setRelationTypeFilter] = useState<string>('all');

  // Tagging progress
  const [taggingProgress, setTaggingProgress] = useState<{
    total: number;
    annotated: number;
    todoCount: number;
    nextBatch: string[];
    nextBatchDetails: SutraDetail[];
  } | null>(null);

  // Tag editor modal / drawer
  const [editingTags, setEditingTags] = useState(false);
  const [editUnsorted, setEditUnsorted] = useState('');
  const [editSorted, setEditSorted] = useState('');
  const [editCore, setEditCore] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Study note editor modal
  const [editingNote, setEditingNote] = useState(false);
  const [editStudyNoteContent, setEditStudyNoteContent] = useState('');
  const [noteSaveSuccess, setNoteSaveSuccess] = useState(false);

  // Undo notification toast
  const [undoToast, setUndoToast] = useState<string | null>(null);

  // Documentation
  const [docContent, setDocContent] = useState<string>('');
  const [activeDocTab, setActiveDocTab] = useState<'about' | 'changelog' | 'relation_types' | 'rules' | 'agents'>('about');

  // Fetch initial sutras
  useEffect(() => {
    fetch('/api/sutras')
      .then((res) => res.json())
      .then((data) => {
        setSutras(data.sutras || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load sutras', err);
        setLoading(false);
      });
  }, []);

  // Fetch detail when selectedSutraId changes
  useEffect(() => {
    if (!selectedSutraId) return;
    setDetailLoading(true);
    fetch(`/api/sutras/${selectedSutraId}`)
      .then((res) => res.json())
      .then((data) => {
        setSutraDetail(data.sutra);
        setDetailLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load detail', err);
        setDetailLoading(false);
      });
  }, [selectedSutraId]);

  // Fetch tags
  useEffect(() => {
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(console.error);
  }, []);

  // Fetch graph
  useEffect(() => {
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data) => setGraphData(data))
      .catch(console.error);
  }, []);

  // Fetch tagging progress
  useEffect(() => {
    fetch('/api/tagging-progress')
      .then((res) => res.json())
      .then((data) => setTaggingProgress(data))
      .catch(console.error);
  }, []);

  // Fetch docs when activeDocTab changes
  useEffect(() => {
    let docKey = 'about';
    if (activeDocTab === 'changelog') docKey = 'changelog';
    else if (activeDocTab === 'relation_types') docKey = '关系类型';
    else if (activeDocTab === 'rules') docKey = '标注规范';
    else if (activeDocTab === 'agents') docKey = 'agents';

    fetch(`/api/docs/${encodeURIComponent(docKey)}`)
      .then((res) => res.json())
      .then((data) => setDocContent(data.content || ''))
      .catch(() => setDocContent('暂无文档内容'));
  }, [activeDocTab]);

  // Unique juans for filtering
  const juanList = useMemo(() => {
    const set = new Set<string>();
    for (const s of sutras) {
      if (s.juan) set.add(s.juan);
    }
    return Array.from(set).sort((a, b) => {
      const na = parseInt(a.replace(/[^\d]/g, '') || '0', 10);
      const nb = parseInt(b.replace(/[^\d]/g, '') || '0', 10);
      return na - nb;
    });
  }, [sutras]);

  // Filtered sutras
  const filteredSutras = useMemo(() => {
    return sutras.filter((s) => {
      if (selectedJuan !== 'all' && s.juan !== selectedJuan) return false;
      if (filterAnnotated === 'annotated' && !s.isAnnotated) return false;
      if (filterAnnotated === 'todo' && s.isAnnotated) return false;
      if (selectedTagFilter) {
        const allTags = [...s.tags, ...s.coreTags, ...s.unsortedTags];
        if (!allTags.includes(selectedTagFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = s.id.toLowerCase().includes(q);
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchTag = [...s.tags, ...s.coreTags, ...s.unsortedTags].some((t) => t.toLowerCase().includes(q));
        if (!matchId && !matchTitle && !matchTag) return false;
      }
      return true;
    });
  }, [sutras, selectedJuan, filterAnnotated, selectedTagFilter, searchQuery]);

  // Select sutra and switch to reader view on mobile
  const handleSelectSutra = (id: string) => {
    setSelectedSutraId(id);
    setMobileView('detail');
  };

  const refreshGlobalStats = async () => {
    try {
      const [l, t, p, g] = await Promise.all([
        fetch('/api/sutras').then((r) => r.json()),
        fetch('/api/tags').then((r) => r.json()),
        fetch('/api/tagging-progress').then((r) => r.json()),
        fetch('/api/graph').then((r) => r.json()),
      ]);
      if (l.sutras) setSutras(l.sutras);
      if (t.tags) setTags(t.tags);
      if (p) setTaggingProgress(p);
      if (g) setGraphData(g);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle open tag editor
  const handleOpenEdit = () => {
    if (!sutraDetail) return;
    setEditUnsorted(sutraDetail.unsortedTags.join('\n'));
    setEditSorted(sutraDetail.tags.join('\n'));
    setEditCore(sutraDetail.coreTags.join('\n'));
    setEditNotes(sutraDetail.userNotes || '');
    setEditingTags(true);
    setSaveSuccess(false);
  };

  const handleSaveTags = async () => {
    if (!sutraDetail) return;
    try {
      const res = await fetch('/api/save-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sutraId: sutraDetail.id,
          unsortedTags: editUnsorted.split('\n').map((s) => s.trim()).filter(Boolean),
          tags: editSorted.split('\n').map((s) => s.trim()).filter(Boolean),
          coreTags: editCore.split('\n').map((s) => s.trim()).filter(Boolean),
          notes: editNotes.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSaveSuccess(true);
        if (data.sutra) {
          setSutraDetail(data.sutra);
        } else {
          const d = await fetch(`/api/sutras/${sutraDetail.id}`).then((r) => r.json());
          setSutraDetail(d.sutra);
        }
        await refreshGlobalStats();
        setTimeout(() => setEditingTags(false), 600);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUndoTags = async () => {
    if (!sutraDetail) return;
    try {
      const res = await fetch('/api/undo-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sutraId: sutraDetail.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sutra) {
          setSutraDetail(data.sutra);
          setEditUnsorted(data.sutra.unsortedTags.join('\n'));
          setEditSorted(data.sutra.tags.join('\n'));
          setEditCore(data.sutra.coreTags.join('\n'));
          setEditNotes(data.sutra.userNotes || '');
        }
        await refreshGlobalStats();
        setUndoToast(`已撤销 ${sutraDetail.id} 的标签修改`);
        setTimeout(() => setUndoToast(null), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle open study note editor
  const handleOpenEditNote = () => {
    if (!sutraDetail) return;
    setEditStudyNoteContent(sutraDetail.studyNotes || '');
    setEditingNote(true);
    setNoteSaveSuccess(false);
  };

  const handleSaveNote = async () => {
    if (!sutraDetail) return;
    try {
      const res = await fetch('/api/save-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sutraId: sutraDetail.id,
          studyNotes: editStudyNoteContent,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNoteSaveSuccess(true);
        if (data.sutra) {
          setSutraDetail(data.sutra);
        }
        const l = await fetch('/api/sutras').then((r) => r.json());
        if (l.sutras) setSutras(l.sutras);
        setTimeout(() => setEditingNote(false), 600);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUndoNote = async () => {
    if (!sutraDetail) return;
    try {
      const res = await fetch('/api/undo-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sutraId: sutraDetail.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sutra) {
          setSutraDetail(data.sutra);
          setEditStudyNoteContent(data.sutra.studyNotes || '');
        }
        const l = await fetch('/api/sutras').then((r) => r.json());
        if (l.sutras) setSutras(l.sutras);
        setUndoToast(`已撤销 ${sutraDetail.id} 的学习笔记修改`);
        setTimeout(() => setUndoToast(null), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fontSizeClasses = {
    sm: 'text-sm sm:text-base leading-relaxed',
    base: 'text-base sm:text-lg leading-relaxed sm:leading-loose',
    lg: 'text-lg sm:text-xl leading-loose',
    xl: 'text-xl sm:text-2xl leading-loose',
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-stone-950 text-stone-100' : 'bg-[#fcfaf6] text-stone-800'}`}>
      {/* Top Header - Responsive & Non-wrapping */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-md bg-amber-50/90 dark:bg-stone-900/90 border-amber-200/60 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          {/* Main Brand & Action Row */}
          <div className="h-14 flex items-center justify-between gap-2">
            {/* Logo & Site Name */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-amber-800 dark:bg-amber-700 text-amber-50 flex items-center justify-center font-serif-sc font-bold shadow-xs">
                阿
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif-sc font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 tracking-wide whitespace-nowrap">
                  阿含名相图谱
                </span>
                <span className="hidden md:inline text-xs px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900 dark:bg-stone-800 dark:text-amber-300 font-medium border border-amber-300/40 dark:border-stone-700 whitespace-nowrap">
                  大正藏 T99 (1355经，覆盖1–1362经)
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <button
                onClick={() => setTab('sutras')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'sutras'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-amber-100/60 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>经文研读</span>
              </button>

              <button
                onClick={() => setTab('tags')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'tags'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-amber-100/60 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span>名相检索</span>
                {tags.length > 0 && (
                  <span className="text-xs px-1.5 py-0.2 rounded-full bg-amber-200/60 text-amber-900 dark:bg-stone-800 dark:text-amber-300">
                    {tags.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setTab('graph')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'graph'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-amber-100/60 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <Network className="w-4 h-4" />
                <span>关系图谱</span>
              </button>

              <button
                onClick={() => setTab('workbench')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'workbench'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-amber-100/60 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>打标工作台</span>
                {taggingProgress && (
                  <span className="text-xs px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {taggingProgress.annotated}
                  </span>
                )}
              </button>

              <button
                onClick={() => setTab('about')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'about'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-amber-100/60 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>关于</span>
              </button>
            </nav>

            {/* Right Tools (Theme & Mobile List/Detail Switcher) */}
            <div className="flex items-center gap-1.5">
              {/* On mobile, if in sutras tab and viewing detail, show a Quick "Back to Directory" button */}
              {tab === 'sutras' && mobileView === 'detail' && (
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-amber-700 text-white font-medium shadow-xs"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>经文目录</span>
                </button>
              )}

              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg hover:bg-amber-100/60 dark:hover:bg-stone-800 transition"
                title="切换深色/浅色模式"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile Scrollable Sub-Nav Bar (No wrapping, horizontally swipeable) */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 border-t border-amber-200/40 dark:border-stone-800">
            <button
              onClick={() => {
                setTab('sutras');
                setMobileView('list');
              }}
              className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                tab === 'sutras'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-amber-100/60 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>经文研读</span>
            </button>

            <button
              onClick={() => setTab('tags')}
              className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                tab === 'tags'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-amber-100/60 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>名相检索 ({tags.length})</span>
            </button>

            <button
              onClick={() => setTab('graph')}
              className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                tab === 'graph'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-amber-100/60 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>关系图谱</span>
            </button>

            <button
              onClick={() => setTab('workbench')}
              className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                tab === 'workbench'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-amber-100/60 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>打标工作台</span>
            </button>

            <button
              onClick={() => setTab('about')}
              className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                tab === 'about'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-amber-100/60 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>关于</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* VIEW 1: SUTRAS READER */}
        {tab === 'sutras' && (
          <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-3.5rem)] overflow-hidden">
            {/* Left Drawer / Sutra Selector List (Full width on mobile list view, sidebar on md+) */}
            <aside
              className={`${
                mobileView === 'list' ? 'flex' : 'hidden'
              } md:flex w-full md:w-80 lg:w-96 border-r border-amber-200/50 dark:border-stone-800 bg-amber-50/30 dark:bg-stone-900/40 flex-col h-full shrink-0`}
            >
              {/* Search & Filter Bar */}
              <div className="p-3 border-b border-amber-200/50 dark:border-stone-800 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="按经号、标题或名相搜索..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-amber-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-xs text-stone-400 hover:text-stone-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {/* Juan Filter */}
                  <select
                    value={selectedJuan}
                    onChange={(e) => setSelectedJuan(e.target.value)}
                    className="flex-1 px-2 py-1 rounded-md border border-amber-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                  >
                    <option value="all">全部卷次 (50卷)</option>
                    {juanList.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={filterAnnotated}
                    onChange={(e: any) => setFilterAnnotated(e.target.value)}
                    className="px-2 py-1 rounded-md border border-amber-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                  >
                    <option value="all">全部经文</option>
                    <option value="annotated">已标注 (100条)</option>
                    <option value="todo">待标注</option>
                  </select>
                </div>

                {/* Tag Filter badge */}
                {selectedTagFilter && (
                  <div className="flex items-center justify-between text-xs px-2 py-1 bg-amber-100/70 text-amber-900 dark:bg-stone-800 dark:text-amber-200 rounded">
                    <span>名相筛选: <strong>{selectedTagFilter}</strong></span>
                    <button onClick={() => setSelectedTagFilter(null)} className="font-bold hover:text-amber-700">
                      ✕
                    </button>
                  </div>
                )}

                <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between pt-0.5">
                  <span>共 {filteredSutras.length} 条经文</span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400">
                    大正藏 T99 (1355经，覆盖1–1362经)
                  </span>
                </div>
              </div>

              {/* Sutras List scroll */}
              <div className="flex-1 overflow-y-auto divide-y divide-amber-100/80 dark:divide-stone-800/80">
                {loading ? (
                  <div className="p-8 text-center text-stone-400 text-sm">加载经文目录中...</div>
                ) : filteredSutras.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-sm">无匹配经文</div>
                ) : (
                  filteredSutras.map((s) => {
                    const isSelected = s.id === selectedSutraId;
                    // Filter non-core regular tags to avoid duplication
                    const regularTags = s.tags.filter((t) => !s.coreTags.includes(t));

                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSelectSutra(s.id)}
                        className={`w-full text-left p-3 transition-colors flex flex-col gap-1 ${
                          isSelected
                            ? 'bg-amber-100/70 dark:bg-stone-800/90 border-l-4 border-amber-700 dark:border-amber-500'
                            : 'hover:bg-amber-50 dark:hover:bg-stone-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-amber-800 dark:text-amber-400">
                            {s.id}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-stone-400">{s.juan}</span>
                            <span className="text-[11px] text-stone-400">{s.wordCount}字</span>
                            {s.isAnnotated ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" title="已标注" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-600" title="待标注" />
                            )}
                          </div>
                        </div>

                        <div className="font-serif-sc font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                          {s.title}
                        </div>

                        {/* Clean, Non-duplicated Tags preview */}
                        {(s.coreTags.length > 0 || regularTags.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {/* Core tags */}
                            {s.coreTags.slice(0, 3).map((t) => (
                              <span
                                key={`core-${t}`}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/80 dark:bg-amber-900/50 text-amber-950 dark:text-amber-200 font-semibold"
                              >
                                {t}
                              </span>
                            ))}
                            {/* Regular tags */}
                            {regularTags.slice(0, 2).map((t) => (
                              <span
                                key={`reg-${t}`}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Right Main Sutra Reader (Hidden on mobile when in list view) */}
            <section
              className={`${
                mobileView === 'detail' ? 'flex' : 'hidden'
              } md:flex flex-1 flex-col h-full overflow-hidden bg-[#faf8f4] dark:bg-stone-950`}
            >
              {/* Reader Sticky Header / Toolbar */}
              <div className="px-3 sm:px-6 py-2 border-b border-amber-200/60 dark:border-stone-800 flex items-center justify-between bg-amber-50/60 dark:bg-stone-900/60 gap-2">
                <div className="flex items-center gap-2">
                  {/* Mobile Back Button to return to Directory */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-amber-900 dark:text-amber-300 font-semibold shadow-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>目录</span>
                  </button>

                  {/* Prev / Next buttons */}
                  <button
                    disabled={!sutraDetail?.prevId}
                    onClick={() => sutraDetail?.prevId && setSelectedSutraId(sutraDetail.prevId)}
                    className="flex items-center gap-0.5 text-xs px-2 py-1 rounded border border-amber-200/70 dark:border-stone-700 bg-white dark:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-50"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> 上一经
                  </button>
                  <button
                    disabled={!sutraDetail?.nextId}
                    onClick={() => sutraDetail?.nextId && setSelectedSutraId(sutraDetail.nextId)}
                    className="flex items-center gap-0.5 text-xs px-2 py-1 rounded border border-amber-200/70 dark:border-stone-700 bg-white dark:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-50"
                  >
                    下一经 <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-xs text-stone-500 font-mono hidden sm:inline ml-1">
                    {sutraDetail?.id} · {sutraDetail?.juan}
                  </span>
                </div>

                {/* Typography & Edit Actions */}
                <div className="flex items-center gap-1.5">
                  {/* Font family toggle */}
                  <button
                    onClick={() => setFontSerif(!fontSerif)}
                    className={`text-xs px-2 py-1 rounded border ${
                      fontSerif
                        ? 'bg-amber-100/90 border-amber-300 text-amber-900 font-serif-sc font-bold dark:bg-stone-800 dark:text-amber-300'
                        : 'bg-white border-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                    title="切换经文宋体/黑体"
                  >
                    {fontSerif ? '宋体' : '黑体'}
                  </button>

                  {/* Font size selectors */}
                  <div className="flex items-center rounded border border-amber-200/70 dark:border-stone-700 bg-white dark:bg-stone-800 p-0.5 text-xs">
                    {(['sm', 'base', 'lg', 'xl'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setFontSize(size)}
                        className={`px-1.5 py-0.5 rounded ${
                          fontSize === size ? 'bg-amber-800 text-white font-bold' : 'text-stone-500 hover:text-stone-900 dark:text-stone-300'
                        }`}
                      >
                        {size === 'sm' ? '小' : size === 'base' ? '中' : size === 'lg' ? '大' : '特大'}
                      </button>
                    ))}
                  </div>

                  {/* Edit Tags Button */}
                  <button
                    onClick={handleOpenEdit}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white font-medium shadow-xs transition"
                  >
                    <Sliders className="w-3 h-3" />
                    <span className="hidden sm:inline">编辑标签</span>
                  </button>
                </div>
              </div>

              {/* Reader Scrollable Content - Classic Buddhist scripture layout */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-10 lg:px-16 py-6 sm:py-8 max-w-4xl mx-auto w-full">
                {detailLoading || !sutraDetail ? (
                  <div className="py-20 text-center text-stone-400">正在载入经文正文...</div>
                ) : (
                  <article className="space-y-6 sm:space-y-8">
                    {/* Header info */}
                    <div className="border-b border-amber-200/60 dark:border-stone-800 pb-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-stone-800 dark:text-amber-300 font-semibold">
                          {sutraDetail.id}
                        </span>
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                          {sutraDetail.juan} · 大正新脩大藏经 第02册 No. 99
                        </span>
                        <span className="text-xs text-stone-400 font-mono">
                          ({sutraDetail.wordCount}字)
                        </span>
                      </div>
                      <h2 className="font-serif-sc text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-50 tracking-tight">
                        {sutraDetail.title}
                      </h2>
                    </div>

                    {undoToast && (
                      <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-stone-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center justify-between shadow-xs">
                        <span className="flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" />
                          {undoToast}
                        </span>
                        <button onClick={() => setUndoToast(null)} className="text-stone-400 hover:text-stone-600">
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Section 1: Tags Banner (Deduplicated) */}
                    <div className="rounded-xl border border-amber-200/70 dark:border-stone-800 bg-amber-50/50 dark:bg-stone-900/50 p-3.5 sm:p-4 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
                            <Tag className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                            <span>标签（个人标注）</span>
                          </div>
                          {sutraDetail.isAnnotated ? (
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-3 h-3" /> 已标注
                            </span>
                          ) : (
                            <span className="text-[11px] text-stone-400">尚未标注</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {sutraDetail.canUndoTags && (
                            <button
                              onClick={handleUndoTags}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-amber-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 transition font-medium"
                              title="撤销上一次标签修改"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>撤销修改</span>
                            </button>
                          )}
                          <button
                            onClick={handleOpenEdit}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-amber-700/90 hover:bg-amber-800 text-white font-medium transition shadow-2xs"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>{sutraDetail.isAnnotated ? '编辑标签' : '+ 新增标签'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Display tags without duplicate names */}
                      {sutraDetail.tags.length > 0 || sutraDetail.coreTags.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-stone-500 mr-1">标签：</span>
                            {/* Core Tags (bold) */}
                            {sutraDetail.coreTags.map((t) => (
                              <button
                                key={`core-${t}`}
                                onClick={() => {
                                  setSelectedTagFilter(t);
                                  setTab('sutras');
                                  setMobileView('list');
                                }}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-amber-800 text-white font-semibold shadow-xs hover:bg-amber-900 transition"
                                title="核心名相（标A/B/C）"
                              >
                                <Sparkles className="w-3 h-3 text-amber-200" />
                                {t}
                              </button>
                            ))}

                            {/* Sorted / regular tags (exclude core tags) */}
                            {sutraDetail.tags
                              .filter((t) => !sutraDetail.coreTags.includes(t))
                              .map((t) => (
                                <button
                                  key={`sorted-${t}`}
                                  onClick={() => {
                                    setSelectedTagFilter(t);
                                    setTab('sutras');
                                    setMobileView('list');
                                  }}
                                  className="inline-flex items-center text-xs px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-amber-200 dark:border-stone-700 hover:border-amber-400 transition"
                                >
                                  {t}
                                </button>
                              ))}
                          </div>

                          {/* Unsorted tags line (exclude both tags and coreTags) */}
                          {sutraDetail.unsortedTags.filter((t) => !sutraDetail.tags.includes(t) && !sutraDetail.coreTags.includes(t)).length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-amber-200/40 dark:border-stone-800">
                              <span className="text-xs text-stone-400 mr-1">未整理：</span>
                              {sutraDetail.unsortedTags
                                .filter((t) => !sutraDetail.tags.includes(t) && !sutraDetail.coreTags.includes(t))
                                .map((t) => (
                                  <span
                                    key={`unsorted-${t}`}
                                    className="text-xs text-stone-500 dark:text-stone-400 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800/60"
                                  >
                                    {t}
                                  </span>
                                ))}
                            </div>
                          )}

                          {/* Notes if any */}
                          {sutraDetail.userNotes && (
                            <div className="text-xs text-stone-600 dark:text-stone-300 italic pt-1">
                              备注：{sutraDetail.userNotes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-stone-400 italic">_尚未标注。可点击右上角「编辑标签」进行录入。_</div>
                      )}
                    </div>

                    {/* Section 2: CBETA Scripture Text (Classical, Elegant Reading Layout) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-stone-800 pb-2">
                        <h3 className="font-serif-sc font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                          <BookMarked className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                          <span>经文原文 (CBETA)</span>
                        </h3>
                        <span className="text-xs text-stone-400 font-sans">
                          求那跋陀罗 译本 · 标点本
                        </span>
                      </div>

                      {/* Scripture Body with Indented paragraphs and verse rendering */}
                      <div
                        className={`space-y-5 text-stone-800 dark:text-stone-100 ${
                          fontSerif ? 'font-serif-sc tracking-wide' : 'font-sans'
                        } ${fontSizeClasses[fontSize]}`}
                      >
                        {sutraDetail.rawText.split('\n\n').map((para, idx) => {
                          if (!para.trim()) return null;
                          // Check if paragraph contains verse lines (lines with spaces or short lines)
                          const lines = para.split('\n');
                          const isVerse = lines.some((l) => l.includes('  ') || l.includes('　'));

                          if (isVerse) {
                            return (
                              <div
                                key={idx}
                                className="my-3 py-2 px-4 rounded-lg bg-amber-50/60 dark:bg-stone-900/60 border-l-2 border-amber-600 space-y-1 font-serif-sc text-stone-800 dark:text-stone-200"
                              >
                                {lines.map((l, lidx) => (
                                  <div key={lidx} className="whitespace-pre-wrap leading-relaxed">
                                    {l}
                                  </div>
                                ))}
                              </div>
                            );
                          }

                          return (
                            <p key={idx} className="indent-8 leading-relaxed whitespace-pre-line text-justify">
                              {para.trim()}
                            </p>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 3: Study Notes (Always visible with Edit/Add & Undo) */}
                    <div className="space-y-3 pt-6 border-t border-amber-200/50 dark:border-stone-800">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="font-serif-sc font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                          <span>学习笔记与脉络</span>
                        </h3>

                        <div className="flex items-center gap-1.5">
                          {sutraDetail.canUndoNote && (
                            <button
                              onClick={handleUndoNote}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-amber-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 transition font-medium"
                              title="撤销上一次学习笔记修改"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>撤销笔记修改</span>
                            </button>
                          )}
                          <button
                            onClick={handleOpenEditNote}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white font-medium transition shadow-2xs"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{sutraDetail.studyNotes ? '编辑笔记' : '+ 新增笔记'}</span>
                          </button>
                        </div>
                      </div>

                      {sutraDetail.studyNotes ? (
                        <div className="p-4 sm:p-5 rounded-xl bg-amber-50/50 dark:bg-stone-900 border border-amber-200/50 dark:border-stone-800 text-sm">
                          <MarkdownContent content={sutraDetail.studyNotes} />
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-amber-50/20 dark:bg-stone-900/40 border border-dashed border-amber-200/70 dark:border-stone-800 text-xs text-stone-400 italic">
                          _尚未撰写学习笔记。点击右上方「+ 新增笔记」可记录本经要旨、次第与个人研读体会。_
                        </div>
                      )}
                    </div>

                    {/* Section 4: Table Content (if present) */}
                    {sutraDetail.tableContent && (
                      <div className="space-y-3 pt-6 border-t border-amber-200/50 dark:border-stone-800">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h3 className="font-serif-sc font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                            <span>整理表</span>
                          </h3>
                          <span className="text-xs text-stone-400">此表由我根据原文整理</span>
                        </div>
                        <div className="p-4 sm:p-5 rounded-xl bg-stone-50/80 dark:bg-stone-900 border border-amber-200/50 dark:border-stone-800 text-sm">
                          <MarkdownContent content={sutraDetail.tableContent} />
                        </div>
                      </div>
                    )}

                    {/* Footer Nav & Attribution */}
                    <div className="pt-8 pb-12 border-t border-amber-200/40 dark:border-stone-800 text-xs text-stone-400 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          disabled={!sutraDetail?.prevId}
                          onClick={() => {
                            if (sutraDetail?.prevId) {
                              setSelectedSutraId(sutraDetail.prevId);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed font-medium shadow-xs"
                        >
                          <ChevronLeft className="w-4 h-4" /> 上一经 ({sutraDetail.prevId})
                        </button>
                        <button
                          disabled={!sutraDetail?.nextId}
                          onClick={() => {
                            if (sutraDetail?.nextId) {
                              setSelectedSutraId(sutraDetail.nextId);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed font-medium shadow-xs"
                        >
                          下一经 ({sutraDetail.nextId}) <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-center text-[11px] text-stone-400">
                        经文来源：CBETA 电子佛典集成（中华电子佛典协会），大正藏 T99《杂阿含经》，刘宋 求那跋陀罗译。授权 CC BY-NC-SA 4.0。
                      </p>
                    </div>
                  </article>
                )}
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: TAGS DIRECTORY */}
        {tab === 'tags' && (
          <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 overflow-y-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-serif-sc text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                  名相与标签索引
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
                  从已标注的经文中汇总的名相、概念、人物与地点列表，点击可穿透检索相关经文
                </p>
              </div>

              {/* Tag Search & Filter */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="搜索名相（五蕴、无常、苦）..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-amber-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center rounded-lg border border-amber-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-0.5 text-xs">
                  <button
                    onClick={() => setTagCategoryFilter('all')}
                    className={`px-2.5 py-1 rounded ${tagCategoryFilter === 'all' ? 'bg-amber-800 text-white font-medium' : 'text-stone-600 dark:text-stone-300'}`}
                  >
                    全部 ({tags.length})
                  </button>
                  <button
                    onClick={() => setTagCategoryFilter('core')}
                    className={`px-2.5 py-1 rounded ${tagCategoryFilter === 'core' ? 'bg-amber-800 text-white font-medium' : 'text-stone-600 dark:text-stone-300'}`}
                  >
                    核心名相
                  </button>
                  <button
                    onClick={() => setTagCategoryFilter('frequent')}
                    className={`px-2.5 py-1 rounded ${tagCategoryFilter === 'frequent' ? 'bg-amber-800 text-white font-medium' : 'text-stone-600 dark:text-stone-300'}`}
                  >
                    高频 (≥3)
                  </button>
                </div>
              </div>
            </div>

            {/* Tag Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {tags
                .filter((t) => {
                  if (tagSearch.trim() && !t.name.toLowerCase().includes(tagSearch.toLowerCase().trim())) return false;
                  if (tagCategoryFilter === 'core' && t.coreCount === 0) return false;
                  if (tagCategoryFilter === 'frequent' && t.count < 3) return false;
                  return true;
                })
                .map((t) => {
                  const isCore = t.coreCount > 0;
                  return (
                    <div
                      key={t.name}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCore
                          ? 'border-amber-300/80 bg-amber-50/60 dark:bg-stone-900/60 dark:border-amber-900/50 hover:shadow-md'
                          : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <button
                            onClick={() => {
                              setSelectedTagFilter(t.name);
                              setTab('sutras');
                              setMobileView('list');
                            }}
                            className="font-serif-sc font-bold text-base text-stone-900 dark:text-stone-100 hover:text-amber-700 text-left transition"
                          >
                            {t.name}
                          </button>
                          {t.pali && (
                            <div className="text-[11px] italic text-stone-500 dark:text-stone-400 mt-0.5">
                              {t.pali} {t.samyukta ? `· ${t.samyukta}` : ''}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {isCore && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-800 text-white font-semibold">
                              核心 ×{t.coreCount}
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono">
                            {t.count}
                          </span>
                        </div>
                      </div>

                      {/* Associated sutras pills */}
                      <div className="mt-3 pt-2 border-t border-amber-100 dark:border-stone-800 flex flex-wrap items-center gap-1 text-[11px]">
                        <span className="text-stone-400 text-[10px]">关联经文:</span>
                        {t.sutras.slice(0, 5).map((sid) => (
                          <button
                            key={sid}
                            onClick={() => {
                              setSelectedSutraId(sid);
                              setTab('sutras');
                              setMobileView('detail');
                            }}
                            className="font-mono px-1 rounded bg-amber-100/60 dark:bg-stone-800 text-amber-900 dark:text-amber-300 hover:underline"
                          >
                            {sid.replace('T99-', '')}
                          </button>
                        ))}
                        {t.sutras.length > 5 && (
                          <button
                            onClick={() => {
                              setSelectedTagFilter(t.name);
                              setTab('sutras');
                              setMobileView('list');
                            }}
                            className="text-stone-400 hover:text-amber-700"
                          >
                            +{t.sutras.length - 5}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* VIEW 3: RELATIONAL GRAPH */}
        {tab === 'graph' && (
          <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-amber-200/50 dark:border-stone-800 bg-amber-50/30 dark:bg-stone-900/40 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif-sc font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Network className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  <span>阿含名相关系图谱</span>
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  基于六大关系法则（开合、缘起序、修证、异译同实）与核心名相共现网络
                </p>
              </div>

              {/* Relation type filters */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-500">关系:</span>
                <select
                  value={relationTypeFilter}
                  onChange={(e) => setRelationTypeFilter(e.target.value)}
                  className="px-2.5 py-1 rounded border border-amber-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs"
                >
                  <option value="all">全部关系 ({graphData.links.length})</option>
                  <option value="开合">开合（总摄别）</option>
                  <option value="缘起序">缘起序（次第依待）</option>
                  <option value="修证">修证（观法/所断/所证）</option>
                  <option value="异译同实">异译同实</option>
                  <option value="共现">同经共现</option>
                </select>
              </div>
            </div>

            {/* Interactive Graph Canvas */}
            <div className="flex-1 relative bg-[#fdfbf7] dark:bg-stone-950 flex">
              <GraphCanvas
                data={graphData}
                filterType={relationTypeFilter}
                onSelectNode={(node) => setSelectedGraphNode(node)}
                selectedNode={selectedGraphNode}
              />

              {/* Node Inspector Drawer */}
              {selectedGraphNode && (
                <div className="absolute right-3 top-3 w-72 sm:w-80 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-xl border border-amber-200 dark:border-stone-800 p-4 shadow-xl space-y-3 z-10">
                  <div className="flex items-center justify-between border-b border-amber-100 dark:border-stone-800 pb-2">
                    <span className="font-serif-sc font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                      {selectedGraphNode.name}
                    </span>
                    <button onClick={() => setSelectedGraphNode(null)} className="text-xs text-stone-400 hover:text-stone-600">
                      ✕
                    </button>
                  </div>

                  <div className="text-xs space-y-1.5 text-stone-600 dark:text-stone-300">
                    <div>分类：<strong>{selectedGraphNode.category}</strong></div>
                    <div>权重与度数：<strong>{selectedGraphNode.value}</strong></div>
                    {selectedGraphNode.coreCount > 0 && (
                      <div className="text-amber-700 dark:text-amber-400 font-semibold">
                        ★ 标记为核心概念 {selectedGraphNode.coreCount} 次
                      </div>
                    )}
                  </div>

                  {/* Connected Relations */}
                  <div className="space-y-1.5 pt-2 border-t border-amber-100 dark:border-stone-800">
                    <div className="text-xs font-semibold text-stone-500">直连关系：</div>
                    <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                      {graphData.links
                        .filter((l) => l.source === selectedGraphNode.id || l.target === selectedGraphNode.id)
                        .map((l, idx) => (
                          <div key={idx} className="p-1.5 rounded bg-amber-50/60 dark:bg-stone-800/60 flex items-center justify-between">
                            <span>
                              {l.source} → {l.target}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/60 dark:bg-stone-700 text-amber-900 dark:text-amber-200">
                              {l.type}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Jump to Sutras with this tag */}
                  <button
                    onClick={() => {
                      setSelectedTagFilter(selectedGraphNode.name);
                      setTab('sutras');
                      setMobileView('list');
                    }}
                    className="w-full mt-2 py-1.5 px-3 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span>研读含此名相的经文</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: AGENTS ANNOTATION WORKBENCH */}
        {tab === 'workbench' && (
          <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 overflow-y-auto space-y-6">
            <div className="border-b border-amber-200/50 dark:border-stone-800 pb-3">
              <h2 className="font-serif-sc text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                逐经打标工作台 (AGENTS 规范流程)
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
                严格遵循 AGENTS.md 约定：每轮起草 10 条经标签，保持经文原典用词，顿号串联固定词组，编号升序与核心评级
              </p>
            </div>

            {/* Progress Gauge */}
            {taggingProgress && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 rounded-xl border border-amber-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
                  <div className="text-xs text-stone-500">已标注经文</div>
                  <div className="text-xl sm:text-2xl font-bold font-serif-sc text-amber-800 dark:text-amber-400 mt-1">
                    {taggingProgress.annotated} 条
                  </div>
                  <div className="text-xs text-emerald-600 mt-0.5 flex items-center justify-between">
                    <span>T99-0001 ~ T99-0100</span>
                    <button
                      onClick={() => {
                        setActiveDocTab('changelog');
                        setTab('about');
                      }}
                      className="underline hover:text-amber-800"
                    >
                      查看修改记录
                    </button>
                  </div>
                </div>

                <div className="p-3 sm:p-4 rounded-xl border border-amber-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
                  <div className="text-xs text-stone-500">待标注经文</div>
                  <div className="text-xl sm:text-2xl font-bold font-serif-sc text-stone-700 dark:text-stone-300 mt-1">
                    {taggingProgress.todoCount} 条
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">覆盖至 T99-1362</div>
                </div>

                <div className="p-3 sm:p-4 rounded-xl border border-amber-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
                  <div className="text-xs text-stone-500">当前批次</div>
                  <div className="text-base sm:text-lg font-bold font-serif-sc text-amber-700 dark:text-amber-300 mt-1">
                    {taggingProgress.nextBatch[0]} ~ {taggingProgress.nextBatch[taggingProgress.nextBatch.length - 1]}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">下批顺序 10 条</div>
                </div>

                <div className="p-3 sm:p-4 rounded-xl border border-amber-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
                  <div className="text-xs text-stone-500">完成比例</div>
                  <div className="text-xl sm:text-2xl font-bold font-serif-sc text-stone-800 dark:text-stone-100 mt-1">
                    {((taggingProgress.annotated / taggingProgress.total) * 100).toFixed(1)}%
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-amber-600 h-1.5 rounded-full"
                      style={{ width: `${(taggingProgress.annotated / taggingProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Next 10 Batch Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif-sc font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>下一批待标注经文（10条经）</span>
                </h3>
                <span className="text-xs text-stone-500">点击进入研读并录入标签</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {taggingProgress?.nextBatchDetails.map((sutra) => (
                  <div
                    key={sutra.id}
                    className="p-4 rounded-xl border border-amber-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2 hover:border-amber-400 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-400">
                        {sutra.id}
                      </span>
                      <span className="text-xs text-stone-400">
                        {sutra.juan} · {sutra.wordCount}字
                      </span>
                    </div>

                    <h4 className="font-serif-sc font-bold text-sm text-stone-900 dark:text-stone-100">
                      {sutra.title}
                    </h4>

                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed font-serif-sc">
                      {sutra.rawText}
                    </p>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedSutraId(sutra.id);
                          setTab('sutras');
                          setMobileView('detail');
                        }}
                        className="text-xs px-2.5 py-1 rounded bg-amber-100 text-amber-900 dark:bg-stone-800 dark:text-amber-300 hover:bg-amber-200 transition font-medium"
                      >
                        阅读并打标 →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: ABOUT & DOCS */}
        {tab === 'about' && (
          <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 overflow-y-auto space-y-4 sm:space-y-6">
            <div className="border-b border-amber-200/50 dark:border-stone-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif-sc text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                  关于本站与规范指南
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  CBETA 佛典授权、名相六类关系法则与经文标注流程规范
                </p>
              </div>

              {/* Sub tabs */}
              <div className="flex items-center rounded-lg border border-amber-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-0.5 text-xs overflow-x-auto no-scrollbar shrink-0">
                <button
                  onClick={() => setActiveDocTab('about')}
                  className={`px-2.5 py-1 rounded whitespace-nowrap ${activeDocTab === 'about' ? 'bg-amber-800 text-white font-medium' : 'text-stone-600 dark:text-stone-300'}`}
                >
                  关于与授权
                </button>
                <button
                  onClick={() => setActiveDocTab('changelog')}
                  className={`px-2.5 py-1 rounded whitespace-nowrap ${activeDocTab === 'changelog' ? 'bg-amber-800 text-white font-medium' : 'text-stone-600 dark:text-stone-300'}`}
                >
                  修改记录 (0001-0100)
                </button>
                <button
                  onClick={() => setActiveDocTab('relation_types')}
                  className={`px-2.5 py-1 rounded whitespace-nowrap ${activeDocTab === 'relation_types' ? 'bg-amber-800 text-white font-medium' : 'text-stone-600 dark:text-stone-300'}`}
                >
                  关系类型规范
                </button>
                <button
                  onClick={() => setActiveDocTab('rules')}
                  className={`px-2.5 py-1 rounded whitespace-nowrap ${activeDocTab === 'rules' ? 'bg-amber-800 text-white font-medium' : 'text-stone-600 dark:text-stone-300'}`}
                >
                  标注约定
                </button>
                <button
                  onClick={() => setActiveDocTab('agents')}
                  className={`px-2.5 py-1 rounded whitespace-nowrap ${activeDocTab === 'agents' ? 'bg-amber-800 text-white font-medium' : 'text-stone-600 dark:text-stone-300'}`}
                >
                  AI 助手说明
                </button>
              </div>
            </div>

            {/* Doc Markdown content */}
            <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-amber-200/60 dark:border-stone-800 text-xs sm:text-sm leading-relaxed font-sans">
              <MarkdownContent content={docContent} />
            </div>
          </div>
        )}
      </main>

      {/* Tag Editor Modal */}
      {editingTags && sutraDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-amber-100 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-serif-sc font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                  编辑经文标签：{sutraDetail.id}
                </h3>
                <p className="text-xs text-stone-500">{sutraDetail.title}</p>
              </div>
              <button onClick={() => setEditingTags(false)} className="text-stone-400 hover:text-stone-600 p-1">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-stone-700 dark:text-stone-300">
                  核心标签（标A/B/C者，一行一个，按字母排序）：
                </label>
                <textarea
                  value={editCore}
                  onChange={(e) => setEditCore(e.target.value)}
                  placeholder="五蕴&#10;无常"
                  rows={2}
                  className="w-full p-2 rounded-lg border border-amber-200 dark:border-stone-700 bg-amber-50/30 dark:bg-stone-800 font-sans focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-stone-700 dark:text-stone-300">
                  已编号标签（标签列，一行一个，按数字编号排序）：
                </label>
                <textarea
                  value={editSorted}
                  onChange={(e) => setEditSorted(e.target.value)}
                  placeholder="五蕴&#10;无常&#10;正观&#10;厌离&#10;喜贪尽&#10;心解脱"
                  rows={3}
                  className="w-full p-2 rounded-lg border border-amber-200 dark:border-stone-700 bg-amber-50/30 dark:bg-stone-800 font-sans focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-stone-700 dark:text-stone-300">
                  全部原始标签（标签 unsorted，一行一个）：
                </label>
                <textarea
                  value={editUnsorted}
                  onChange={(e) => setEditUnsorted(e.target.value)}
                  placeholder="五蕴&#10;无常&#10;正观&#10;厌离&#10;苦&#10;空&#10;非我&#10;佛&#10;比丘&#10;舍卫国祇树给孤独园"
                  rows={3}
                  className="w-full p-2 rounded-lg border border-amber-200 dark:border-stone-700 bg-amber-50/30 dark:bg-stone-800 font-sans focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-stone-700 dark:text-stone-300">
                  随手备注（放进备注列）：
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="备忘或疑点..."
                  className="w-full p-2 rounded-lg border border-amber-200 dark:border-stone-700 bg-amber-50/30 dark:bg-stone-800 font-sans focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {saveSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs flex items-center gap-1.5">
                <Check className="w-4 h-4" /> 标签已成功保存至 tags_raw.csv 并更新视图！
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-100 dark:border-stone-800 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditUnsorted(sutraDetail.unsortedTags.join('\n'));
                    setEditSorted(sutraDetail.tags.join('\n'));
                    setEditCore(sutraDetail.coreTags.join('\n'));
                    setEditNotes(sutraDetail.userNotes || '');
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1"
                  title="放弃当前框内未保存的输入，恢复为当前已存状态"
                >
                  <RotateCcw className="w-3 h-3" /> 重置当前输入
                </button>
                {sutraDetail.canUndoTags && (
                  <button
                    type="button"
                    onClick={handleUndoTags}
                    className="px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-stone-800 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-100 flex items-center gap-1 font-medium"
                  >
                    <RotateCcw className="w-3 h-3" /> 撤销上次保存
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingTags(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveTags}
                  className="px-4 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> 保存标签
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Study Note Editor Modal */}
      {editingNote && sutraDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-amber-100 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-serif-sc font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                  {sutraDetail.studyNotes ? '编辑学习笔记' : '新增学习笔记'}：{sutraDetail.id}
                </h3>
                <p className="text-xs text-stone-500">
                  {sutraDetail.title} · 保存在 data/notes/{sutraDetail.id}.md
                </p>
              </div>
              <button onClick={() => setEditingNote(false)} className="text-stone-400 hover:text-stone-600 p-1">
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-stone-600 dark:text-stone-400">
                  支持自由格式 Markdown（如：要旨、次第、对照说明）：
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const tpl = `> 草稿：由我根据原文整理，待你改成自己的理解。\n\n**要旨**：\n\n**次第**：\n\n**说明**：`;
                    setEditStudyNoteContent((prev) => (prev.trim() ? `${prev}\n\n${tpl}` : tpl));
                  }}
                  className="px-2.5 py-1 rounded bg-amber-100/80 dark:bg-stone-800 text-amber-900 dark:text-amber-300 hover:bg-amber-200/70 font-medium transition"
                >
                  + 插入标准笔记模板
                </button>
              </div>

              <textarea
                value={editStudyNoteContent}
                onChange={(e) => setEditStudyNoteContent(e.target.value)}
                placeholder="**要旨**：...&#10;&#10;**次第**：... → ...&#10;&#10;**说明**：..."
                rows={10}
                className="w-full p-3 rounded-xl border border-amber-200 dark:border-stone-700 bg-amber-50/30 dark:bg-stone-800 font-sans text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {noteSaveSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs flex items-center gap-1.5">
                <Check className="w-4 h-4" /> 学习笔记已成功保存至 data/notes/{sutraDetail.id}.md！
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-100 dark:border-stone-800 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditStudyNoteContent(sutraDetail.studyNotes || '')}
                  className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1"
                  title="放弃当前未保存的修改，恢复为当前已存笔记"
                >
                  <RotateCcw className="w-3 h-3" /> 重置当前输入
                </button>
                {sutraDetail.canUndoNote && (
                  <button
                    type="button"
                    onClick={handleUndoNote}
                    className="px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-stone-800 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-100 flex items-center gap-1 font-medium"
                  >
                    <RotateCcw className="w-3 h-3" /> 撤销上次保存
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingNote(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveNote}
                  className="px-4 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> 保存笔记
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to split a Markdown table row by '|' while respecting inline code backticks
function splitMarkdownTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let current = '';
  let inCode = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '`') {
      inCode = !inCode;
      current += ch;
    } else if (ch === '|' && !inCode && (i === 0 || trimmed[i - 1] !== '\\')) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function isTableSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
  const cells = splitMarkdownTableRow(trimmed);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
}

function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  // Handle <br> tags first
  const brParts = text.split(/<br\s*\/?>/gi);
  if (brParts.length > 1) {
    return brParts.map((part, idx) => (
      <React.Fragment key={idx}>
        {idx > 0 && <br />}
        {renderInlineMarkdown(part)}
      </React.Fragment>
    ));
  }

  // Tokenize inline code `...` and bold **...**
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length >= 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-amber-100/80 dark:bg-stone-800 text-amber-900 dark:text-amber-300 font-mono text-[0.9em]"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length >= 4) {
      return (
        <strong key={i} className="font-bold text-stone-900 dark:text-stone-100">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    return tok;
  });
}

function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Fenced code block ```
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      blocks.push(
        <pre
          key={`code-${i}`}
          className="my-2.5 p-3 rounded-lg bg-stone-100 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 font-mono text-xs overflow-x-auto whitespace-pre-wrap text-stone-800 dark:text-stone-200"
        >
          {codeLines.join('\n')}
        </pre>
      );
      continue;
    }

    // 2. Markdown Table (starts with | and ends with |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.startsWith('|') && t.endsWith('|')) {
          tableLines.push(t);
          i++;
        } else {
          break;
        }
      }

      if (tableLines.length >= 2 && isTableSeparatorRow(tableLines[1])) {
        const headers = splitMarkdownTableRow(tableLines[0]);
        const bodyRows = tableLines.slice(2).filter((l) => !isTableSeparatorRow(l)).map(splitMarkdownTableRow);

        blocks.push(
          <div
            key={`table-${i}`}
            className="my-3 overflow-x-auto rounded-lg border border-amber-200/90 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-2xs"
          >
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-amber-100/70 dark:bg-stone-800 border-b border-amber-200 dark:border-stone-700">
                  {headers.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="py-2.5 px-3 font-serif-sc font-bold text-stone-900 dark:text-amber-200 border-r last:border-r-0 border-amber-200/60 dark:border-stone-700 whitespace-nowrap"
                    >
                      {renderInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200/50 dark:divide-stone-800">
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="odd:bg-white even:bg-amber-50/25 dark:odd:bg-stone-900 dark:even:bg-stone-800/40 hover:bg-amber-50/70 dark:hover:bg-stone-800/80 transition-colors"
                  >
                    {headers.map((_, cIdx) => {
                      const cellText = row[cIdx] ?? '';
                      return (
                        <td
                          key={cIdx}
                          className={`py-2 px-3 border-r last:border-r-0 border-amber-100/80 dark:border-stone-800 align-top leading-relaxed ${
                            cIdx === 0
                              ? 'font-medium text-stone-900 dark:text-stone-100 whitespace-nowrap'
                              : 'text-stone-700 dark:text-stone-300 min-w-[110px]'
                          }`}
                        >
                          {renderInlineMarkdown(cellText)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      } else {
        // Fallback if single-row pipe text
        const rows = tableLines.map(splitMarkdownTableRow);
        blocks.push(
          <div
            key={`table-raw-${i}`}
            className="my-3 overflow-x-auto rounded-lg border border-amber-200/90 dark:border-stone-700 bg-white dark:bg-stone-900"
          >
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <tbody className="divide-y divide-amber-200/50 dark:divide-stone-800">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="py-2 px-3 border-r last:border-r-0 border-amber-100 dark:border-stone-800 text-stone-700 dark:text-stone-300"
                      >
                        {renderInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 3. Horizontal Rule ---
    if (/^-{3,}$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${i}`} className="my-4 border-amber-200/60 dark:border-stone-800" />);
      i++;
      continue;
    }

    // 4. Headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const cls =
        level === 1
          ? 'font-serif-sc text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 mt-4 mb-2 pb-1 border-b border-amber-200/60 dark:border-stone-800'
          : level === 2
          ? 'font-serif-sc text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 mt-4 mb-1.5'
          : 'font-serif-sc text-sm sm:text-base font-bold text-amber-900 dark:text-amber-300 mt-3 mb-1';
      blocks.push(
        <div key={`h-${i}`} className={cls}>
          {renderInlineMarkdown(text)}
        </div>
      );
      i++;
      continue;
    }

    // 5. Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 px-3 py-2 rounded-r-lg border-l-3 border-amber-600 dark:border-amber-500 bg-amber-100/40 dark:bg-stone-800/70 text-xs sm:text-sm text-stone-600 dark:text-stone-300 italic leading-relaxed"
        >
          {quoteLines.map((ql, qIdx) => (
            <div key={qIdx}>{renderInlineMarkdown(ql)}</div>
          ))}
        </blockquote>
      );
      continue;
    }

    // 6. Unordered or Ordered Lists (- ..., * ..., 1. ...)
    if (/^([-*]|\d+\.)\s+/.test(trimmed)) {
      const listItems: { marker: string; text: string }[] = [];
      while (i < lines.length) {
        const lTrim = lines[i].trim();
        const m = lTrim.match(/^([-*]|\d+\.)\s+(.+)$/);
        if (m) {
          listItems.push({ marker: m[1], text: m[2] });
          i++;
        } else {
          break;
        }
      }
      blocks.push(
        <ul key={`list-${i}`} className="my-2 space-y-1.5 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-stone-700 dark:text-stone-300 leading-relaxed">
              <span className="text-amber-800 dark:text-amber-400 font-semibold select-none shrink-0">
                {item.marker === '-' || item.marker === '*' ? '•' : item.marker}
              </span>
              <span className="flex-1">{renderInlineMarkdown(item.text)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Standard paragraph
    blocks.push(
      <p key={`p-${i}`} className="my-2 leading-relaxed text-stone-700 dark:text-stone-300">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-2">{blocks}</div>;
}

// GraphCanvas Component for rendering interactive node-link network
function GraphCanvas({
  data,
  filterType,
  onSelectNode,
  selectedNode,
}: {
  data: { nodes: GraphNode[]; links: GraphLink[] };
  filterType: string;
  onSelectNode: (node: GraphNode) => void;
  selectedNode: GraphNode | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeLinks = useMemo(() => {
    if (filterType === 'all') return data.links;
    return data.links.filter((l) => l.type === filterType);
  }, [data.links, filterType]);

  const activeNodes = useMemo(() => {
    if (filterType === 'all') return data.nodes;
    const connectedIds = new Set<string>();
    for (const l of activeLinks) {
      connectedIds.add(l.source);
      connectedIds.add(l.target);
    }
    return data.nodes.filter((n) => connectedIds.has(n.id));
  }, [data.nodes, activeLinks, filterType]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = canvas.width;
    const height = canvas.height;

    // Initialize node positions in a radial layout
    const nodes = activeNodes.map((n, i) => {
      const angle = (i / activeNodes.length) * 2 * Math.PI;
      const radius = 180 + (i % 3) * 60;
      return {
        ...n,
        x: n.x ?? width / 2 + Math.cos(angle) * radius,
        y: n.y ?? height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    function step() {
      // Force simulation
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 150) {
            const force = (150 - dist) / 150;
            n1.x -= (dx / dist) * force * 1.5;
            n1.y -= (dy / dist) * force * 1.5;
            n2.x += (dx / dist) * force * 1.5;
            n2.y += (dy / dist) * force * 1.5;
          }
        }
      }

      // Link attraction
      for (const l of activeLinks) {
        const s = nodeMap.get(l.source);
        const t = nodeMap.get(l.target);
        if (s && t) {
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 120;
          const force = (dist - targetDist) * 0.01;
          s.x += (dx / dist) * force;
          s.y += (dy / dist) * force;
          t.x -= (dx / dist) * force;
          t.y -= (dy / dist) * force;
        }
      }

      // Center gravity
      for (const n of nodes) {
        n.x += (width / 2 - n.x) * 0.01;
        n.y += (height / 2 - n.y) * 0.01;
        n.x = Math.max(50, Math.min(width - 50, n.x));
        n.y = Math.max(50, Math.min(height - 50, n.y));
      }

      // Draw
      ctx.clearRect(0, 0, width, height);

      // Draw links
      for (const l of activeLinks) {
        const s = nodeMap.get(l.source);
        const t = nodeMap.get(l.target);
        if (!s || !t) continue;

        const isHighlight =
          selectedNode && (selectedNode.id === s.id || selectedNode.id === t.id);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (l.type === '开合') {
          ctx.strokeStyle = isHighlight ? '#b45309' : 'rgba(180, 83, 9, 0.4)';
          ctx.lineWidth = isHighlight ? 2.5 : 1.5;
        } else if (l.type === '缘起序') {
          ctx.strokeStyle = isHighlight ? '#047857' : 'rgba(4, 120, 87, 0.4)';
          ctx.lineWidth = isHighlight ? 2.5 : 1.5;
        } else if (l.type === '修证') {
          ctx.strokeStyle = isHighlight ? '#4338ca' : 'rgba(67, 56, 202, 0.4)';
          ctx.lineWidth = isHighlight ? 2.5 : 1.5;
        } else {
          ctx.strokeStyle = isHighlight ? '#78716c' : 'rgba(168, 162, 158, 0.3)';
          ctx.lineWidth = 1;
        }
        ctx.stroke();

        if (isHighlight && l.label) {
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;
          ctx.font = '10px sans-serif';
          ctx.fillStyle = '#78716c';
          ctx.fillText(l.label, midX + 4, midY - 4);
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const isSel = selectedNode?.id === n.id;
        const r = Math.min(Math.max(12, n.value), 26);

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);

        if (n.coreCount > 0) {
          ctx.fillStyle = isSel ? '#b45309' : '#d97706';
        } else {
          ctx.fillStyle = isSel ? '#57534e' : '#a8a29e';
        }
        ctx.fill();

        ctx.lineWidth = isSel ? 3 : 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.font = isSel ? 'bold 12px "Noto Serif SC", serif' : '11px "Noto Serif SC", serif';
        ctx.fillStyle = '#292524';
        ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y + r + 13);
      }

      animId = requestAnimationFrame(step);
    }

    step();

    function handleClick(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (const n of nodes) {
        const dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
        if (dist <= 26) {
          onSelectNode(n);
          return;
        }
      }
      onSelectNode(null as any);
    }

    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('click', handleClick);
    };
  }, [activeNodes, activeLinks, selectedNode, onSelectNode]);

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={950}
        height={650}
        className="w-full h-full object-contain cursor-pointer"
      />
    </div>
  );
}
