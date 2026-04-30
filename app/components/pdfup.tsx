"use client";

import React, { useState, useRef } from "react";
import { 
  UploadCloud, Trash2, Pencil, Check, X, 
  Sparkles, Loader2, FileText, ChevronLeft, ChevronRight, Save
} from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument } from 'pdf-lib';
import CanvasDraw from "react-canvas-draw";

// ==========================================
// 1. STABLE PRODUCTION WORKER
// ==========================================
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SmartEditorProps {
  onComplete: (processedFile: File) => void;
}

export default function SmartPdfEditor({ onComplete }: SmartEditorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [activePage, setActivePage] = useState<number>(1);
  const [excludedPages, setExcludedPages] = useState<Set<number>>(new Set());
  
  // State for the UI Canvas (JSON) and the Final PDF Export (PNG Base64)
  const [drawings, setDrawings] = useState<{ [key: number]: string }>({});
  const [drawingImages, setDrawingImages] = useState<{ [key: number]: string }>({});
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "edit">("grid");

  const canvasRef = useRef<any>(null);

  // --- Handlers ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setExcludedPages(new Set());
      setDrawings({});
      setDrawingImages({});
      setViewMode("grid");
    }
  };

  const saveCurrentDrawing = () => {
    if (canvasRef.current) {
      // 1. Save JSON for the UI to remember strokes if you switch pages back and forth
      const data = canvasRef.current.getSaveData();
      setDrawings(prev => ({ ...prev, [activePage]: data }));

      // 2. Extract the transparent PNG of the strokes to stamp on the final PDF
      try {
        const drawingCanvas = canvasRef.current.canvas.drawing;
        const dataUrl = drawingCanvas.toDataURL("image/png");
        setDrawingImages(prev => ({ ...prev, [activePage]: dataUrl }));
      } catch (e) {
        console.error("Failed to extract drawing layer:", e);
      }
    }
  };

  const enterEditMode = (pageIdx: number) => {
    setActivePage(pageIdx);
    setViewMode("edit");
  };

  const togglePageRemoval = (index: number) => {
    const newSet = new Set(excludedPages);
    newSet.has(index) ? newSet.delete(index) : newSet.add(index);
    setExcludedPages(newSet);
  };

  // --- Core Processing Engine (Cut & Draw) ---

  const handleExport = async () => {
    if (!file) return;
    setIsProcessing(true);
    
    // Save the canvas if the user didn't click the "Save Drawing" button before exporting
    if (viewMode === "edit") saveCurrentDrawing(); 

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      
      // STEP A: Stamp all drawings onto their respective pages
      for (const [pageStr, dataUrl] of Object.entries(drawingImages)) {
        const pageNum = parseInt(pageStr);
        
        // Skip stamping if we are going to delete this page anyway
        if (excludedPages.has(pageNum - 1)) continue;

        const pngImageBytes = await fetch(dataUrl).then((res) => res.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(pngImageBytes);

        // pdf-lib is 0-indexed, so page 1 is index 0
        const page = pdfDoc.getPage(pageNum - 1);
        const { width, height } = page.getSize();

        // Paint the drawing layer perfectly over the original PDF page
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: width,
          height: height,
        });
      }

      // STEP B: Physically remove the excluded pages (Sort descending is critical!)
      const indicesToRemove = Array.from(excludedPages).sort((a, b) => b - a);
      indicesToRemove.forEach(index => {
        pdfDoc.removePage(index);
      });

      // STEP C: Package file and send to Step 2
      const pdfBytes = await pdfDoc.save();
      const processedFile = new File([pdfBytes.buffer as ArrayBuffer], file.name, { 
        type: 'application/pdf' 
      });
      
      onComplete(processedFile);

    } catch (err) {
      console.error("Critical Processing Error:", err);
      alert("This document is heavily protected or corrupted. Please try another file.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- UI Render ---

  return (
    <div className="w-full bg-[#0B1120] rounded-[32px] border border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[700px]">
      
      {!file ? (
        <label className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/30 transition-all p-12 group">
          <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-10 h-10 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Production PDF Engine</h2>
          <p className="text-slate-500 font-bold mt-2">Upload multi-page documents to cut and annotate</p>
          <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
        </label>
      ) : (
        <>
          {/* Header Bar */}
          <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setViewMode(viewMode === "grid" ? "edit" : "grid")}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"
              >
                {viewMode === "grid" ? "Switch to Editor" : "Back to Grid"}
              </button>
              <div className="h-6 w-px bg-slate-700 mx-2" />
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                Selected: <span className="text-white text-sm">{numPages - excludedPages.size}</span> / {numPages} Pages
              </p>
            </div>
            <button onClick={() => setFile(null)} className="p-2 text-slate-500 hover:text-red-400 transition-colors bg-slate-800/50 rounded-lg hover:bg-red-500/10">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Workspace Area */}
          <div className="flex-1 overflow-hidden relative flex bg-[#0B1120]">
            
            {/* VIEW 1: GRID MODE (FOR CUTTING) */}
            {viewMode === "grid" && (
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <Document 
                  file={file} 
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)} 
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
                >
                  {Array.from(new Array(numPages), (el, index) => (
                    <div key={`thumb_${index}`} className="relative group">
                      
                      {/* Interaction Overlay */}
                      <div className={`absolute inset-0 z-20 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300 ${excludedPages.has(index) ? 'bg-red-500/20 border-2 border-red-500/50 backdrop-blur-[2px]' : 'bg-transparent group-hover:bg-[#0B1120]/60'}`}>
                        <button 
                          onClick={() => enterEditMode(index + 1)}
                          className={`p-3 bg-white text-slate-900 rounded-xl shadow-xl transition-all hover:scale-110 ${excludedPages.has(index) ? 'hidden' : 'opacity-0 group-hover:opacity-100 scale-95'}`}
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => togglePageRemoval(index)}
                          className={`p-3 rounded-xl shadow-xl transition-all hover:scale-110 ${excludedPages.has(index) ? 'bg-red-500 text-white scale-100' : 'bg-slate-800 text-white opacity-0 group-hover:opacity-100 scale-95 hover:bg-red-500'}`}
                        >
                          {excludedPages.has(index) ? <Check className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                      </div>

                      {/* PDF Thumbnail */}
                      <div className={`p-3 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700/50 transition-opacity ${excludedPages.has(index) ? 'opacity-30' : 'opacity-100'}`}>
                        <div className="bg-white rounded-lg overflow-hidden flex justify-center relative">
                          <Page pageNumber={index + 1} width={160} renderTextLayer={false} renderAnnotationLayer={false} />
                          
                          {/* Show a tiny pencil icon on the thumbnail if it has drawings! */}
                          {drawingImages[index + 1] && !excludedPages.has(index) && (
                            <div className="absolute top-1 right-1 bg-amber-500 p-1 rounded-md shadow-md">
                              <Pencil className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-center mt-3 text-slate-400 font-black tracking-widest uppercase">PAGE {index + 1}</p>
                      </div>

                    </div>
                  ))}
                </Document>
              </div>
            )}

            {/* VIEW 2: EDIT MODE (FOR DRAWING) */}
            {viewMode === "edit" && (
              <div className="flex-1 flex flex-col items-center overflow-hidden bg-slate-900/50">
                
                {/* Editor Navigation */}
                <div className="w-full p-4 flex justify-between items-center bg-slate-800/30 border-b border-slate-800">
                   <div className="flex items-center gap-2">
                      <button onClick={() => { saveCurrentDrawing(); setActivePage(Math.max(1, activePage - 1)) }} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                      <span className="text-white font-black px-4 bg-slate-800 py-1.5 rounded-lg border border-slate-700">Page {activePage}</span>
                      <button onClick={() => { saveCurrentDrawing(); setActivePage(Math.min(numPages, activePage + 1)) }} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"><ChevronRight className="w-5 h-5"/></button>
                   </div>
                   <button onClick={() => { saveCurrentDrawing(); setViewMode("grid"); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all">
                      <Save className="w-4 h-4" /> Save Drawing
                   </button>
                </div>
                
                {/* The Canvas Area */}
                <div className="flex-1 p-8 overflow-auto w-full flex justify-center custom-scrollbar">
                  <div className="relative shadow-2xl rounded-lg overflow-hidden h-[700px] w-[500px] bg-white ring-4 ring-slate-800">
                    
                    {/* Transparent Canvas (Top Layer) */}
                    <div className="absolute inset-0 z-20 cursor-crosshair">
                      <CanvasDraw 
                        ref={canvasRef}
                        brushColor="#ef4444" // Red ink
                        brushRadius={2}
                        canvasWidth={500}
                        canvasHeight={700}
                        hideGrid={true}
                        backgroundColor="transparent"
                        saveData={drawings[activePage] || ""}
                        immediateLoading={true}
                      />
                    </div>

                    {/* PDF Underlay (Bottom Layer - Unclickable) */}
                    <div className="absolute inset-0 z-10 pointer-events-none flex justify-center bg-white">
                      <Document file={file}>
                        <Page 
                          pageNumber={activePage} 
                          width={500} 
                          renderTextLayer={false} 
                          renderAnnotationLayer={false} 
                        />
                      </Document>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export Footer Bar */}
          <div className="p-6 bg-slate-800/80 border-t border-slate-800 flex items-center justify-between backdrop-blur-xl z-30">
            <div>
              <p className="text-white font-black text-lg">Ready to Export</p>
              <p className="text-xs text-slate-400 font-bold tracking-wide mt-1">
                Burns drawings into PDF and removes deleted pages.
              </p>
            </div>
            <button 
              onClick={handleExport}
              disabled={isProcessing || excludedPages.size === numPages}
              className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
              {isProcessing ? "Packaging File..." : "Confirm & Send to Form"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}