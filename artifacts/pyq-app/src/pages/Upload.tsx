import React from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileType, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Upload() {
  const [isDragging, setIsDragging] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setIsUploading(true);
    // Mock upload process
    setTimeout(() => {
      setIsUploading(false);
      setSuccess(true);
    }, 2500);
  };

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto min-h-full flex flex-col">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-display font-bold mb-3">Upload Exam PDF</h1>
        <p className="text-muted-foreground">Our AI pipeline will automatically extract questions, math formulas, and options.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {!success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-2xl aspect-[3/2] rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 relative overflow-hidden ${
              isDragging ? "border-primary bg-primary/5" : "border-white/10 bg-black/20 hover:bg-black/30 hover:border-white/20"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                <h3 className="text-xl font-bold mb-2">Processing Document...</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">Running LayoutParser, Tesseract OCR, and identifying question boundaries.</p>
              </div>
            ) : file ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileType className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">{file.name}</h3>
                <p className="text-muted-foreground text-sm mb-8">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={() => setFile(null)}>Cancel</Button>
                  <Button onClick={handleUpload}>Process PDF</Button>
                </div>
              </div>
            ) : (
              <div className="text-center pointer-events-none">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                  <UploadCloud className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">Drag & Drop your PDF here</h3>
                <p className="text-muted-foreground text-sm mb-6">or click to browse files</p>
                <Button className="pointer-events-auto relative">
                  Select File
                  <input 
                    type="file" 
                    accept=".pdf" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => e.target.files && setFile(e.target.files[0])}
                  />
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-12 glass-card rounded-3xl max-w-md w-full border border-green-500/30"
          >
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-white">Extraction Complete</h3>
            <p className="text-muted-foreground mb-8">142 questions were successfully extracted and added to the database.</p>
            <Button className="w-full" onClick={() => { setSuccess(false); setFile(null); }}>
              Upload Another
            </Button>
          </motion.div>
        )}

        <div className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          Secure processing environment
        </div>
      </div>
    </div>
  );
}
