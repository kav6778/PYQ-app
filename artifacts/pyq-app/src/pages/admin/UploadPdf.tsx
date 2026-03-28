import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Upload, FileText, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

interface Exam { id: number; name: string; slug: string; }
interface Paper { id: number; examId: number; name: string; slug: string; }

function authFetch(url: string, opts?: RequestInit) {
  const token = localStorage.getItem("pyq_token");
  return fetch(url, { ...opts, headers: { ...opts?.headers, Authorization: `Bearer ${token}` } });
}

export default function UploadPdf() {
  const [, navigate] = useLocation();
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
  const [year, setYear] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [skipCovers, setSkipCovers] = useState(true);
  const [oddOnly, setOddOnly] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ bankId: number; message: string } | null>(null);
  const [error, setError] = useState("");

  const { data: examsData } = useQuery<{ exams: Exam[] }>({
    queryKey: ["/api/exams"],
    queryFn: async () => {
      const res = await fetch("/api/exams");
      return res.json();
    },
  });

  const { data: papersData } = useQuery<{ papers: Paper[] }>({
    queryKey: ["/api/exams", selectedExamId, "papers"],
    queryFn: async () => {
      const res = await fetch(`/api/exams/${selectedExamId}/papers`);
      return res.json();
    },
    enabled: !!selectedExamId,
  });

  const exams = examsData?.exams ?? [];
  const papers = papersData?.papers ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedExamId || !selectedPaperId || !year) {
      setError("Please fill all fields and select a file.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("examId", String(selectedExamId));
      form.append("paperId", String(selectedPaperId));
      form.append("year", year);
      form.append("skipCovers", String(skipCovers));
      form.append("oddOnly", String(oddOnly));

      const token = localStorage.getItem("pyq_token");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/admin")} className="text-gray-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Upload Question Paper PDF</h1>
          <p className="text-gray-400 text-sm">Upload and process a new question bank</p>
        </div>
      </div>

      {result ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-white font-semibold text-lg mb-1">Upload Successful!</h2>
          <p className="text-gray-400 text-sm mb-4">{result.message}</p>
          <button
            onClick={() => navigate(`/admin/banks/${result.bankId}`)}
            className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
          >
            View Bank →
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            {/* Exam */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Exam</label>
              <select
                value={selectedExamId ?? ""}
                onChange={(e) => { setSelectedExamId(Number(e.target.value)); setSelectedPaperId(null); }}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 transition"
                required
              >
                <option value="">Select exam...</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            {/* Paper */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Paper</label>
              <select
                value={selectedPaperId ?? ""}
                onChange={(e) => setSelectedPaperId(Number(e.target.value))}
                disabled={!selectedExamId}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 transition disabled:opacity-40"
                required
              >
                <option value="">Select paper...</option>
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Exam Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2024"
                min={1990}
                max={2030}
                required
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 transition"
              />
            </div>
          </div>

          {/* Page filtering options */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-medium text-gray-300">Page Extraction Options</p>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={skipCovers}
                onChange={(e) => setSkipCovers(e.target.checked)}
                className="mt-0.5 accent-violet-500"
              />
              <div>
                <p className="text-sm text-white group-hover:text-violet-300 transition">Skip cover pages</p>
                <p className="text-xs text-gray-500">Ignore the first and last page (usually title/instruction pages)</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={oddOnly}
                onChange={(e) => setOddOnly(e.target.checked)}
                className="mt-0.5 accent-violet-500"
              />
              <div>
                <p className="text-sm text-white group-hover:text-violet-300 transition">English pages only (odd pages)</p>
                <p className="text-xs text-gray-500">For UPSC bilingual papers — odd pages are English, even pages are Hindi</p>
              </div>
            </label>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">PDF File</label>
            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition ${file ? "border-violet-500/50 bg-violet-500/5" : "border-white/10 hover:border-white/20"}`}>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {file ? (
                <>
                  <FileText className="w-10 h-10 text-violet-400 mb-2" />
                  <p className="text-white text-sm font-medium">{file.name}</p>
                  <p className="text-gray-500 text-xs mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-500 mb-2" />
                  <p className="text-gray-400 text-sm">Click to select PDF</p>
                  <p className="text-gray-600 text-xs mt-1">Max 100 MB</p>
                </>
              )}
            </label>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading & Processing..." : "Upload & Start Processing"}
          </button>
        </form>
      )}
    </div>
  );
}
