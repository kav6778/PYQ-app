import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle, Clock, AlertCircle, Upload, ChevronRight, FileText, Hash } from "lucide-react";

interface BankSummary {
  id: number;
  examId: number;
  paperId: number;
  pdfName: string;
  year: number;
  status: string;
  totalPages?: number;
  totalQuestions?: number;
  createdAt?: string;
  examName?: string;
  paperName?: string;
}

function statusIcon(status: string) {
  if (status === "approved") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (status === "ready") return <Clock className="w-4 h-4 text-amber-400" />;
  if (status === "processing") return <div className="w-4 h-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />;
  return <AlertCircle className="w-4 h-4 text-gray-400" />;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    approved: "Approved",
    ready: "Ready for Review",
    processing: "Processing...",
    pending: "Pending",
  };
  return map[status] || status;
}

function statusColor(status: string) {
  if (status === "approved") return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  if (status === "ready") return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  if (status === "processing") return "text-violet-400 bg-violet-400/10 border-violet-400/20";
  return "text-gray-400 bg-gray-400/10 border-gray-400/20";
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery<{ banks: BankSummary[] }>({
    queryKey: ["/api/admin/banks"],
    queryFn: async () => {
      const token = localStorage.getItem("pyq_token");
      const res = await fetch("/api/admin/banks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    refetchInterval: 10000,
  });

  const banks = data?.banks ?? [];
  const approved = banks.filter((b) => b.status === "approved").length;
  const pending = banks.filter((b) => b.status !== "approved").length;
  const totalQuestions = banks.reduce((sum, b) => sum + (b.totalQuestions ?? 0), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Question Banks</h1>
          <p className="text-gray-400 text-sm mt-1">Review extracted question banks and approve them for student use</p>
        </div>
        <Link href="/admin/upload" className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <Upload className="w-4 h-4" />
          Upload PDF
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Banks", value: banks.length, color: "text-white" },
          { label: "Approved", value: approved, color: "text-emerald-400" },
          { label: "Pending Review", value: pending, color: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-400 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Banks list */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading banks...</div>
      ) : banks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No question banks yet</p>
          <p className="text-gray-600 text-sm mt-1">Upload a PDF to get started</p>
          <Link href="/admin/upload" className="inline-flex items-center gap-2 mt-4 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Upload className="w-4 h-4" />
            Upload PDF
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {banks.map((bank) => (
            <Link key={bank.id} href={`/admin/banks/${bank.id}`} className="flex items-center gap-4 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-violet-500/30 rounded-xl p-4 transition group">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-violet-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium text-sm truncate">{bank.pdfName}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${statusColor(bank.status)}`}>
                    {statusIcon(bank.status)}
                    {statusLabel(bank.status)}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                  <span>{bank.examName || `Exam #${bank.examId}`} · {bank.paperName || `Paper #${bank.paperId}`} · {bank.year}</span>
                  {bank.totalPages && <span>{bank.totalPages} pages</span>}
                  {bank.totalQuestions && <span>{bank.totalQuestions} questions</span>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-violet-400 transition flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
