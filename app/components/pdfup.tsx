"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  UploadCloud, Scissors, Trash2, Pencil, Sparkles, 
  Loader2, FileType, CheckCircle2, X 
} from "lucide-react";
import CanvasDraw from "react-canvas-draw";
import { PDFDocument } from 'pdf-lib';

interface PdfUploadProps {
  onComplete: (processedBlob: Blob) => void;
}

export default function PdfUpload({ onComplete }: PdfUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tool, setTool] = useState<"draw" | "select">("select");
  const canvasRef = useRef<any>(null);

  // Clean up URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleAnalyzeAndUpload = async () => {
    setIsProcessing(true);
    try {
      // Logic for PDF-Lib manipulation (Cut/Add pages) would be executed here
      // We simulate the analysis processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (file) {
        onComplete(file); // Passing the blob to Section 2
      }
    } catch (error) {
      console.error("PDF Processing Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!file ? (
        <label className="flex flex-col items-center justify-center w-full h-[500px] cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all border-4 border-dashed border-slate-200 m-2 rounded-[32px] group">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Smart PDF Upload</h2>
          <p className="text-slate-500 font-bold mt-2 text-center max-w-xs">
            Upload an image or PDF to edit, mark, and analyze for the Study Hub.
          </p>
          <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileChange} />
        </label>
      ) : (
        <div className="flex flex-col h-full">
          {/* Editor Toolbar */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setTool("select")}
                className={`p-3 rounded-xl transition-all ${tool === 'select' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <Scissors className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setTool("draw")}
                className={`p-3 rounded-xl transition-all ${tool === 'draw' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <Pencil className="w-5 h-5" />
              </button>
              <button className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                {file.name.length > 20 ? file.name.substring(0, 20) + "..." : file.name}
              </span>
              <button onClick={() => setFile(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Interactive Workspace */}
          <div className="relative flex-1 bg-slate-200 p-8 flex justify-center overflow-auto min-h-[600px]">
            <div className="relative shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] bg-white rounded-lg">
              <CanvasDraw 
                ref={canvasRef}
                brushColor="#2563eb"
                brushRadius={tool === "draw" ? 3 : 0}
                lazyRadius={0}
                canvasWidth={500}
                canvasHeight={700}
                imgSrc={previewUrl || ""}
                enablePanAndZoom={false}
                hideInterface={true}
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="p-6 bg-white border-t border-slate-100">
            <button 
              onClick={handleAnalyzeAndUpload}
              disabled={isProcessing}
              className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-xl flex items-center justify-center shadow-xl shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
            >
              {isProcessing ? (
                <><Loader2 className="w-6 h-6 animate-spin mr-3" /> Analyzing & Processing...</>
              ) : (
                <><Sparkles className="w-6 h-6 mr-3" /> Confirm & Analyze Document</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}