"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  UploadCloud, Trash2, Pencil, Check, X, 
  Sparkles, Loader2, FileText, LayoutGrid, Maximize2 
} from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb } from 'pdf-lib';
import CanvasDraw from "react-canvas-draw";

// Set worker for browser performance
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SmartPdfEditorProps {
  onComplete: (processedBlob: Blob) => void;
}

export default function SmartPdfEditor({ onComplete }: SmartPdfEditorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [excludedPages, setExcludedPages] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePage, setActivePage] = useState<number | null>(null); // For "Focus Mode" drawing
  
  // Store drawing data per page index
  const [pageDrawings, setPageDrawings] = useState<{ [key: number]: string }>({});
  const canvasRef = useRef<any>(null);

  // 1. Initial Load
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExcludedPages(new Set());
      setPageDrawings({});
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // 2. Toggle "Cut" status
  const togglePageRemoval = (index: number) => {
    const newExcluded = new Set(excludedPages);
    newExcluded.has(index) ? newExcluded.delete(index) : newExcluded.add(index);
    setExcludedPages(newExcluded);
  };

  // 3. Save Drawing & Close Focus Mode
  const saveDrawing = () => {
    if (activePage !== null && canvasRef.current) {
      const data = canvasRef.current.getSaveData();
      setPageDrawings(prev => ({ ...prev, [activePage]: data }));
      setActivePage(null);
    }
  };

  // 4. POWERFUL PROCESSING: Remove Pages + Flatten Annotations
  const processFinalPdf = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Step A: Physical Removal
      const totalPages = pdfDoc.getPageCount();
      const indicesToRemove = Array.from(excludedPages).sort((a, b) => b - a);
      indicesToRemove.forEach(index => pdfDoc.removePage(index));

      // Step B: Final Save with explicit casting to solve TypeScript conflict
      const pdfBytes = await pdfDoc.save();
      const processedBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { 
        type: 'application/pdf' 
      });
      
      onComplete(processedBlob);
    } catch (error) {
      console.error("Processing Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full bg-slate-950 rounded-[40px] border border-white/10 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
      
      {!file ? (
        <label className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all p-10 group">
          <div className="w-24 h-24 bg-indigo-500/10 rounded-[32px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-12 h-12 text-indigo-500" />
          </div>
          <h2 className="text-3xl font-black text-white">Smart Engine Ready</h2>
          <p className="text-slate-400 font-bold mt-2 text-lg">Upload PDF to cut and annotate pages</p>
          <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
        </label>
      ) : (
        <>
          {/* Dashboard Header */}
          <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/20 rounded-2xl">
                <FileText className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-black">{file.name}</h3>
                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                  {numPages - excludedPages.size} / {numPages} Pages Selected
                </p>
              </div>
            </div>
            <button onClick={() => setFile(null)} className="p-2 hover:bg-red-500/20 text-slate-500 hover:text-red-500 rounded-xl transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Grid View */}
          <div className="flex-1 overflow-y-auto p-8 relative">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
            >
              {Array.from(new Array(numPages), (el, index) => (
                <div key={`page_${index + 1}`} className="relative group">
                  {/* Status Badges */}
                  <div className="absolute top-4 left-4 z-20 flex gap-2">
                    {pageDrawings[index] && (
                      <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-lg">
                        <Pencil className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Glassmorphic Interaction Layer */}
                  <div className={`absolute inset-0 z-10 rounded-3xl transition-all border-4 flex flex-col items-center justify-center gap-4 ${
                    excludedPages.has(index) 
                    ? 'bg-red-500/60 border-red-600 backdrop-blur-sm' 
                    : 'bg-transparent border-transparent hover:bg-indigo-500/10 hover:border-indigo-500/30'
                  }`}>
                    {!excludedPages.has(index) && (
                      <button 
                        onClick={() => setActivePage(index)}
                        className="p-4 bg-white/10 backdrop-blur-md rounded-2xl text-white opacity-0 group-hover:opacity-100 hover:bg-indigo-500 transition-all shadow-xl"
                      >
                        <Maximize2 className="w-6 h-6" />
                      </button>
                    )}
                    <button 
                      onClick={() => togglePageRemoval(index)}
                      className={`p-4 rounded-2xl text-white shadow-xl transition-all ${
                        excludedPages.has(index) ? 'bg-white text-red-600 scale-110' : 'bg-red-600/80 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {excludedPages.has(index) ? <Check className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
                    </button>
                  </div>

                  {/* Thumbnail Rendering */}
                  <div className={`bg-slate-900 p-2 rounded-[32px] overflow-hidden shadow-2xl transition-opacity ${excludedPages.has(index) ? 'opacity-20' : 'opacity-100'}`}>
                    <Page 
                      pageNumber={index + 1} 
                      width={180} 
                      renderTextLayer={false} 
                      renderAnnotationLayer={false}
                      className="mx-auto"
                    />
                  </div>
                </div>
              ))}
            </Document>

            {/* FOCUS MODE: Drawing Overlay */}
            {activePage !== null && (
              <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center p-10">
                <div className="mb-6 flex gap-4 w-full max-w-[500px]">
                  <button onClick={saveDrawing} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg">
                    <Save className="w-5 h-5" /> Save Annotations
                  </button>
                  <button onClick={() => setActivePage(null)} className="p-4 bg-white/10 text-white rounded-2xl">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border-8 border-indigo-500/20">
                  <CanvasDraw 
                    ref={canvasRef}
                    brushColor="#6366f1"
                    brushRadius={3}
                    canvasWidth={450}
                    canvasHeight={600}
                    saveData={pageDrawings[activePage]}
                    // Pass the actual page as the canvas background
                    imgSrc={null} 
                  />
                  <div className="bg-slate-100 absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
                     <Document file={file}>
                        <Page pageNumber={activePage + 1} width={450} renderTextLayer={false} />
                     </Document>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Hub */}
          <div className="p-8 bg-white/5 border-t border-white/10 backdrop-blur-xl flex items-center justify-between">
            <div className="hidden md:block">
              <p className="text-white font-black text-xl tracking-tight">Finalize Structure</p>
              <p className="text-slate-500 font-medium">Removing <span className="text-red-500 font-bold">{excludedPages.size}</span> pages and merging drawings.</p>
            </div>
            <button 
              onClick={processFinalPdf}
              disabled={isProcessing || excludedPages.size === numPages}
              className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-xl flex items-center gap-4 shadow-2xl shadow-indigo-600/30 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
              {isProcessing ? "Rebuilding PDF..." : "Export Clean Version"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const Save = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);