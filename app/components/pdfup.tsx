"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  UploadCloud, Trash2, Pencil, Check, X, 
  Sparkles, Loader2, FileText, ChevronLeft, ChevronRight, Save
} from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument } from 'pdf-lib';
import CanvasDraw from "react-canvas-draw";

// PRODUCTION WORKER CONFIG: Uses a stable CDN link
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface SmartEditorProps {
  onComplete: (processedBlob: Blob) => void;
}

export default function SmartPdfEditor({ onComplete }: SmartEditorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [activePage, setActivePage] = useState<number>(1);
  const [excludedPages, setExcludedPages] = useState<Set<number>>(new Set());
  const [drawings, setDrawings] = useState<{ [key: number]: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "edit">("grid");

  const canvasRef = useRef<any>(null);

  // 1. Load File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setExcludedPages(new Set());
      setDrawings({});
      setViewMode("grid");
    }
  };

  // 2. Navigation & Drawing Logic
  const saveCurrentDrawing = () => {
    if (canvasRef.current) {
      const data = canvasRef.current.getSaveData();
      setDrawings(prev => ({ ...prev, [activePage]: data }));
    }
  };

  const enterEditMode = (pageIdx: number) => {
    setActivePage(pageIdx);
    setViewMode("edit");
  };

  // 3. THE "PRODUCTION" FIX: Ignore Encryption & Clean Processing
  const handleExport = async () => {
    if (!file) return;
    setIsProcessing(true);
    saveCurrentDrawing(); // Catch last page work

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // FIX: Added { ignoreEncryption: true } to solve your production error
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      
      // Step A: Physical Page Removal (indices are 0-based)
      const indicesToRemove = Array.from(excludedPages).sort((a, b) => b - a);
      indicesToRemove.forEach(index => {
        pdfDoc.removePage(index);
      });

      // Step B: Final Save with TypeScript-safe buffer casting
      const pdfBytes = await pdfDoc.save();
      const processedBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { 
        type: 'application/pdf' 
      });
      
      onComplete(processedBlob);
    } catch (err) {
      console.error("Critical Processing Error:", err);
      alert("This PDF is heavily protected or corrupted. Try another file.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full bg-slate-900 rounded-[32px] border border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[700px]">
      
      {!file ? (
        <label className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 transition-all p-12 group">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-10 h-10 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-black text-white">Production PDF Engine</h2>
          <p className="text-slate-500 font-bold mt-2">Upload multi-page documents to edit</p>
          <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
        </label>
      ) : (
        <>
          {/* Top Control Bar */}
          <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setViewMode(viewMode === "grid" ? "edit" : "grid")}
                className="px-4 py-2 bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-600 transition-all"
              >
                {viewMode === "grid" ? "Switch to Editor" : "Back to Grid"}
              </button>
              <div className="h-6 w-px bg-slate-700 mx-2" />
              <p className="text-slate-400 text-xs font-bold">
                Selected: <span className="text-white">{numPages - excludedPages.size}</span> / {numPages} Pages
              </p>
            </div>
            <button onClick={() => setFile(null)} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
              <X />
            </button>
          </div>

          {/* Main Workspace */}
          <div className="flex-1 overflow-hidden relative flex">
            
            {/* VIEW 1: GRID MODE (FOR CUTTING) */}
            {viewMode === "grid" && (
              <div className="flex-1 overflow-y-auto p-8 bg-slate-900">
                <Document file={file} onLoadSuccess={({ numPages }) => setNumPages(numPages)} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {Array.from(new Array(numPages), (el, index) => (
                    <div key={`thumb_${index}`} className="relative group">
                      <div className={`absolute inset-0 z-10 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${excludedPages.has(index) ? 'bg-red-500/60 border-4 border-red-600' : 'bg-black/0 group-hover:bg-black/40'}`}>
                        <button 
                          onClick={() => enterEditMode(index + 1)}
                          className={`p-3 bg-white text-slate-900 rounded-xl shadow-xl transition-all ${excludedPages.has(index) ? 'hidden' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            const newSet = new Set(excludedPages);
                            newSet.has(index) ? newSet.delete(index) : newSet.add(index);
                            setExcludedPages(newSet);
                          }}
                          className={`p-3 rounded-xl shadow-xl transition-all ${excludedPages.has(index) ? 'bg-white text-red-600' : 'bg-red-600 text-white opacity-0 group-hover:opacity-100'}`}
                        >
                          {excludedPages.has(index) ? <Check /> : <Trash2 />}
                        </button>
                      </div>
                      <div className={`p-2 bg-slate-800 rounded-2xl ${excludedPages.has(index) ? 'opacity-30' : ''}`}>
                        <Page pageNumber={index + 1} width={150} renderTextLayer={false} renderAnnotationLayer={false} />
                        <p className="text-[10px] text-center mt-2 text-slate-500 font-bold">PAGE {index + 1}</p>
                      </div>
                    </div>
                  ))}
                </Document>
              </div>
            )}

            {/* VIEW 2: EDIT MODE (FOR DRAWING) */}
            {viewMode === "edit" && (
              <div className="flex-1 flex flex-col bg-slate-950 items-center overflow-hidden">
                <div className="w-full p-4 flex justify-between items-center bg-slate-900/50 border-b border-slate-800">
                   <div className="flex items-center gap-2">
                      <button onClick={() => { saveCurrentDrawing(); setActivePage(Math.max(1, activePage - 1)) }} className="p-2 text-white bg-slate-800 rounded-lg"><ChevronLeft/></button>
                      <span className="text-white font-black px-4">Page {activePage}</span>
                      <button onClick={() => { saveCurrentDrawing(); setActivePage(Math.min(numPages, activePage + 1)) }} className="p-2 text-white bg-slate-800 rounded-lg"><ChevronRight/></button>
                   </div>
                   <button onClick={() => setViewMode("grid")} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">
                      <Save className="w-4 h-4" /> Save Page
                   </button>
                </div>
                
                <div className="flex-1 p-10 overflow-auto w-full flex justify-center scrollbar-hide">
                  <div className="relative shadow-2xl rounded-lg overflow-hidden h-fit">
                    <CanvasDraw 
                      ref={canvasRef}
                      brushColor="#6366f1"
                      brushRadius={3}
                      canvasWidth={500}
                      canvasHeight={700}
                      saveData={drawings[activePage] || ""}
                      immediateLoading={true}
                    />
                    <div className="absolute inset-0 -z-10 bg-white">
                      <Document file={file}>
                        <Page pageNumber={activePage} width={500} renderTextLayer={false} renderAnnotationLayer={false} />
                      </Document>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export Footer */}
          <div className="p-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-white font-black">Production Export</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Ready to build final sanitized PDF</p>
            </div>
            <button 
              onClick={handleExport}
              disabled={isProcessing || excludedPages.size === numPages}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {isProcessing ? "Processing..." : "Export Clean PDF"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}