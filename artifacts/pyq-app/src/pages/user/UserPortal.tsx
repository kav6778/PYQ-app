import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { BookOpen, Brain, LogOut, ChevronDown, Search, X, Filter, Menu } from "lucide-react";
import SubjectSidebar from "../../components/SubjectSidebar";
import BrowseMode from "../../components/BrowseMode";
import QuizMode from "../../components/QuizMode";

interface Exam { id: number; name: string; slug: string; }
interface Paper { id: number; examId: number; name: string; slug: string; }

type Mode = "browse" | "quiz";

export default function UserPortal() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<Mode>("browse");
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [yearStart, setYearStart] = useState<number>(2010);
  const [yearEnd, setYearEnd] = useState<number>(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: examsData } = useQuery<{ exams: Exam[] }>({
    queryKey: ["/api/exams"],
    queryFn: () => fetch("/api/exams").then((r) => r.json()),
  });

  const { data: papersData } = useQuery<{ papers: Paper[] }>({
    queryKey: ["/api/exams", selectedExamId, "papers"],
    queryFn: () => fetch(`/api/exams/${selectedExamId}/papers`).then((r) => r.json()),
    enabled: !!selectedExamId,
  });

  const exams = examsData?.exams ?? [];
  const papers = papersData?.papers ?? [];

  const handleExamChange = (examId: number | null) => {
    setSelectedExamId(examId);
    setSelectedPaperId(null);
    setSelectedSubject(null);
    setSelectedTopic(null);
  };

  const handlePaperChange = (paperId: number | null) => {
    setSelectedPaperId(paperId);
    setSelectedSubject(null);
    setSelectedTopic(null);
  };

  const handleSubjectSelect = (subject: string | null, topic: string | null) => {
    setSelectedSubject(subject);
    setSelectedTopic(topic);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1990 + 1 }, (_, i) => 1990 + i).reverse();

  return (
    <div className="min-h-screen bg-[#0d0d14] flex flex-col">
      {/* Top bar */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Logo + hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-sm hidden sm:block">PrepMaster AI</span>
          </div>

          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {/* Exam picker */}
            <div className="relative">
              <select
                value={selectedExamId ?? ""}
                onChange={(e) => handleExamChange(e.target.value ? Number(e.target.value) : null)}
                className="appearance-none bg-white/8 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 transition min-w-[140px]"
              >
                <option value="">All Exams</option>
                {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* Paper picker */}
            <div className="relative">
              <select
                value={selectedPaperId ?? ""}
                onChange={(e) => handlePaperChange(e.target.value ? Number(e.target.value) : null)}
                disabled={!selectedExamId}
                className="appearance-none bg-white/8 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 transition disabled:opacity-40 min-w-[130px]"
              >
                <option value="">All Papers</option>
                {papers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* Year range */}
            <div className="flex items-center gap-1.5 text-sm">
              <select
                value={yearStart}
                onChange={(e) => setYearStart(Number(e.target.value))}
                className="appearance-none bg-white/8 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-violet-500 transition"
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="text-gray-500">–</span>
              <select
                value={yearEnd}
                onChange={(e) => setYearEnd(Number(e.target.value))}
                className="appearance-none bg-white/8 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-violet-500 transition"
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions..."
                className="w-full bg-white/8 border border-white/10 rounded-lg pl-9 pr-8 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 flex-shrink-0">
            <button
              onClick={() => setMode("browse")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${mode === "browse" ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Browse</span>
            </button>
            <button
              onClick={() => setMode("quiz")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${mode === "quiz" ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quiz</span>
            </button>
          </div>

          {/* User */}
          <button onClick={logout} className="flex items-center gap-2 text-gray-400 hover:text-white transition text-xs flex-shrink-0">
            <span className="hidden sm:inline">{user?.username}</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Active filters display */}
        {(selectedSubject || selectedTopic || search) && (
          <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
            <span className="text-gray-500 text-xs flex items-center gap-1"><Filter className="w-3 h-3" /> Filters:</span>
            {selectedSubject && (
              <button
                onClick={() => handleSubjectSelect(null, null)}
                className="flex items-center gap-1 text-xs bg-violet-500/20 text-violet-300 border border-violet-500/20 rounded-full px-2.5 py-0.5 hover:bg-violet-500/30 transition"
              >
                {selectedSubject} <X className="w-3 h-3" />
              </button>
            )}
            {selectedTopic && (
              <button
                onClick={() => setSelectedTopic(null)}
                className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/20 rounded-full px-2.5 py-0.5 hover:bg-blue-500/30 transition"
              >
                {selectedTopic} <X className="w-3 h-3" />
              </button>
            )}
            {search && (
              <button
                onClick={() => setSearch("")}
                className="flex items-center gap-1 text-xs bg-gray-500/20 text-gray-300 border border-gray-500/20 rounded-full px-2.5 py-0.5 hover:bg-gray-500/30 transition"
              >
                "{search}" <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? "w-60 flex-shrink-0" : "w-0"} transition-all duration-200 overflow-hidden border-r border-white/10 bg-black/20`}>
          <SubjectSidebar
            examId={selectedExamId}
            paperId={selectedPaperId}
            selectedSubject={selectedSubject}
            selectedTopic={selectedTopic}
            onSelect={handleSubjectSelect}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {mode === "browse" ? (
            <BrowseMode
              examId={selectedExamId}
              paperId={selectedPaperId}
              subject={selectedSubject}
              topic={selectedTopic}
              yearStart={yearStart}
              yearEnd={yearEnd}
              search={search}
            />
          ) : (
            <QuizMode
              examId={selectedExamId}
              paperId={selectedPaperId}
              subject={selectedSubject}
              topic={selectedTopic}
              yearStart={yearStart}
              yearEnd={yearEnd}
            />
          )}
        </main>
      </div>
    </div>
  );
}
