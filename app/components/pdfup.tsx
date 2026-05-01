"use client";

import React, { useState, useRef } from "react";
import { 
  UploadCloud, Trash2, Pencil, Check, X, 
  Sparkles, Loader2, ChevronLeft, ChevronRight, Save, Crop, RotateCcw
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

// Coordinate interface for our Crop Box (Percentages 0 to 1)
interface CropCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export default function SmartPdfEditor({ onComplete }: SmartEditorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [activePage, setActivePage] = useState<number>(1);
  const [excludedPages, setExcludedPages] = useState<Set<number>>(new Set());
  
  // State for the UI Canvas (JSON) and the Final PDF Export (PNG Base64)
  const [drawings, setDrawings] = useState<{ [key: number]: string }>({});
  const [drawingImages, setDrawingImages] = useState<{ [key: number]: string }>({});
  
  // ==========================================
  // CROP STATE & REFS
  // ==========================================
  const [viewMode, setViewMode] = useState<"grid" | "edit" | "crop">("grid");
  const [cropBox, setCropBox] = useState<CropCoords | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<any>(null);

  // --- Handlers ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setExcludedPages(new Set());
      setDrawings({});
      setDrawingImages({});
      setCropBox(null);
      setViewMode("grid");
    }
  };

  const saveCurrentDrawing = () => {
    if (canvasRef.current) {
      const data = canvasRef.current.getSaveData();
      setDrawings(prev => ({ ...prev, [activePage]: data }));

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

  // ==========================================
  // CROP MOUSE EVENTS
  // ==========================================
  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (!cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setCropBox({ x1: x, y1: y, x2: x, y2: y });
    setIsDraggingCrop(true);
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCrop || !cropContainerRef.current || !cropBox) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    // Clamp to boundaries (0 to 1)
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setCropBox({ ...cropBox, x2: x, y2: y });
  };

  const handleCropMouseUp = () => {
    setIsDraggingCrop(false);
    if (cropBox) {
      // Normalize box coordinates so x1 is always left, y1 is always top
      const finalBox = {
        x1: Math.min(cropBox.x1, cropBox.x2),
        y1: Math.min(cropBox.y1, cropBox.y2),
        x2: Math.max(cropBox.x1, cropBox.x2),
        y2: Math.max(cropBox.y1, cropBox.y2),
      };
      
      // If the user just clicked without dragging (tiny box), clear it
      if (finalBox.x2 - finalBox.x1 < 0.05 || finalBox.y2 - finalBox.y1 < 0.05) {
        setCropBox(null);
      } else {
        setCropBox(finalBox);
      }
    }
  };

  // Helper to draw the crop box UI dynamically
  const getCropStyle = () => {
    if (!cropBox) return {};
    const x1 = Math.min(cropBox.x1, cropBox.x2);
    const y1 = Math.min(cropBox.y1, cropBox.y2);
    const width = Math.abs(cropBox.x2 - cropBox.x1);
    const height = Math.abs(cropBox.y2 - cropBox.y1);
    return {
      left: `${x1 * 100}%`,
      top: `${y1 * 100}%`,
      width: `${width * 100}%`,
      height: `${height * 100}%`,
    };
  };

  // --- Core Processing Engine (Cut, Draw & Crop) ---

  const handleExport = async () => {
    if (!file) return;
    setIsProcessing(true);
    
    if (viewMode === "edit") saveCurrentDrawing(); 

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      
      // STEP A: Stamp all drawings
      for (const [pageStr, dataUrl] of Object.entries(drawingImages)) {
        const pageNum = parseInt(pageStr);
        if (excludedPages.has(pageNum - 1)) continue;

        const pngImageBytes = await fetch(dataUrl).then((res) => res.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(pngImageBytes);

        const page = pdfDoc.getPage(pageNum - 1);
        const { width, height } = page.getSize();

        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: width,
          height: height,
        });
      }

      // STEP B: Apply Global Crop (Smart Coordinate Inversion)
      if (cropBox) {
        const pages = pdfDoc.getPages();
        pages.forEach((page, index) => {
          // Don't waste time cropping a page we are about to delete
          if (!excludedPages.has(index)) {
            const { width, height } = page.getSize();
            
            // Web coordinates (Top-Left) to Physical PDF coordinates (Bottom-Left)
            const pdfWidth = width * (cropBox.x2 - cropBox.x1);
            const pdfHeight = height * (cropBox.y2 - cropBox.y1);
            const pdfX = width * cropBox.x1;
            // Invert the Y axis!
            const pdfY = height - (height * cropBox.y2); 

            page.setCropBox(pdfX, pdfY, pdfWidth, pdfHeight);
          }
        });
      }

      // STEP C: Physically remove the excluded pages (Sort descending is critical!)
      const indicesToRemove = Array.from(excludedPages).sort((a, b) => b - a);
      indicesToRemove.forEach(index => {
        pdfDoc.removePage(index);
      });

      // STEP D: Package file and send to Step 2
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
          <p className="text-slate-500 font-bold mt-2">Upload multi-page documents to cut, draw, and crop</p>
          <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
        </label>
      ) : (
        <>
          {/* Header Bar */}
          <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex flex-wrap items-center justify-between backdrop-blur-md gap-4">
            
            {/* View Mode Toggles */}
            <div className="flex bg-slate-900 rounded-xl p-1 shadow-inner border border-slate-800">
              <button 
                onClick={() => { if(viewMode==="edit") saveCurrentDrawing(); setViewMode("grid"); }}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === "grid" ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              >
                Grid View
              </button>
              <button 
                onClick={() => { setViewMode("edit"); setActivePage(1); }}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === "edit" ? "bg-indigo-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Pencil className="w-3 h-3" /> Draw
              </button>
              <button 
                onClick={() => { if(viewMode==="edit") saveCurrentDrawing(); setViewMode("crop"); }}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === "crop" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Crop className="w-3 h-3" /> Global Crop
              </button>
            </div>

            <div className="flex items-center gap-4">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                Selected: <span className="text-white text-sm">{numPages - excludedPages.size}</span> / {numPages} Pages
              </p>
              <div className="h-6 w-px bg-slate-700" />
              <button onClick={() => setFile(null)} className="p-2 text-slate-500 hover:text-red-400 transition-colors bg-slate-800/50 rounded-lg hover:bg-red-500/10">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Workspace Area */}
          <div className="flex-1 overflow-hidden relative flex bg-[#0B1120]">
            
            {/* VIEW 1: GRID MODE (FOR CUTTING) */}
            {viewMode === "grid" && (
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <Document file={file} onLoadSuccess={({ numPages }) => setNumPages(numPages)} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                  {Array.from(new Array(numPages), (el, index) => (
                    <div key={`thumb_${index}`} className="relative group">
                      <div className={`absolute inset-0 z-20 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300 ${excludedPages.has(index) ? 'bg-red-500/20 border-2 border-red-500/50 backdrop-blur-[2px]' : 'bg-transparent group-hover:bg-[#0B1120]/60'}`}>
                        <button onClick={() => togglePageRemoval(index)} className={`p-3 rounded-xl shadow-xl transition-all hover:scale-110 ${excludedPages.has(index) ? 'bg-red-500 text-white scale-100' : 'bg-slate-800 text-white opacity-0 group-hover:opacity-100 scale-95 hover:bg-red-500'}`}>
                          {excludedPages.has(index) ? <Check className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                      </div>
                      <div className={`p-3 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700/50 transition-opacity ${excludedPages.has(index) ? 'opacity-30' : 'opacity-100'}`}>
                        <div className="bg-white rounded-lg overflow-hidden flex justify-center relative">
                          <Page pageNumber={index + 1} width={160} renderTextLayer={false} renderAnnotationLayer={false} />
                          {drawingImages[index + 1] && !excludedPages.has(index) && (
                            <div className="absolute top-1 right-1 bg-indigo-500 p-1 rounded-md shadow-md"><Pencil className="w-3 h-3 text-white" /></div>
                          )}
                          {cropBox && !excludedPages.has(index) && (
                            <div className="absolute top-1 left-1 bg-emerald-500 p-1 rounded-md shadow-md"><Crop className="w-3 h-3 text-white" /></div>
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
                
                <div className="flex-1 p-8 overflow-auto w-full flex justify-center custom-scrollbar">
                  <div className="relative shadow-2xl rounded-lg overflow-hidden h-[700px] w-[500px] bg-white ring-4 ring-slate-800">
                    <div className="absolute inset-0 z-20 cursor-crosshair">
                      <CanvasDraw 
                        ref={canvasRef} brushColor="#ef4444" brushRadius={2} canvasWidth={500} canvasHeight={700}
                        hideGrid={true} backgroundColor="transparent" saveData={drawings[activePage] || ""} immediateLoading={true}
                      />
                    </div>
                    <div className="absolute inset-0 z-10 pointer-events-none flex justify-center bg-white">
                      <Document file={file}>
                        <Page pageNumber={activePage} width={500} renderTextLayer={false} renderAnnotationLayer={false} />
                      </Document>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: GLOBAL CROP MODE */}
            {viewMode === "crop" && (
              <div className="flex-1 flex flex-col items-center overflow-hidden bg-slate-900/50">
                <div className="w-full p-4 flex justify-between items-center bg-slate-800/30 border-b border-slate-800">
                   <div className="text-white font-bold flex items-center gap-2">
                     <Crop className="w-5 h-5 text-emerald-400" /> Draw a box to crop ALL pages identically.
                   </div>
                   <div className="flex items-center gap-3">
                     {cropBox && (
                       <button onClick={() => setCropBox(null)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-sm">
                         <RotateCcw className="w-4 h-4" /> Clear Crop
                       </button>
                     )}
                     <button onClick={() => setViewMode("grid")} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all">
                        <Check className="w-4 h-4" /> Done Cropping
                     </button>
                   </div>
                </div>
                
                <div className="flex-1 p-8 overflow-auto w-full flex justify-center custom-scrollbar select-none">
                  <div className="relative shadow-2xl rounded-lg overflow-hidden h-[700px] w-[500px] bg-white ring-4 ring-emerald-500/50">
                    
                    {/* The Crop Interaction Layer */}
                    <div 
                      ref={cropContainerRef}
                      onMouseDown={handleCropMouseDown}
                      onMouseMove={handleCropMouseMove}
                      onMouseUp={handleCropMouseUp}
                      onMouseLeave={handleCropMouseUp}
                      className="absolute inset-0 z-30 cursor-crosshair"
                    >
                      {/* The Drawn Crop Box Visualizer */}
                      {cropBox && (
                        <div 
                          className="absolute border-2 border-emerald-500 bg-emerald-500/10 shadow-[0_0_0_9999px_rgba(11,17,32,0.6)]"
                          style={getCropStyle()}
                        >
                          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                        </div>
                      )}
                      
                      {!cropBox && !isDraggingCrop && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className="bg-slate-900/80 text-white px-4 py-2 rounded-lg font-bold text-sm tracking-widest uppercase">Click & Drag to Crop</p>
                        </div>
                      )}
                    </div>

                    {/* PDF Underlay (Page 1 Used as Reference) */}
                    <div className="absolute inset-0 z-10 pointer-events-none flex justify-center bg-white">
                      <Document file={file}>
                        <Page pageNumber={1} width={500} renderTextLayer={false} renderAnnotationLayer={false} />
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
              <div className="flex gap-2 mt-1">
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold">{excludedPages.size} Removed</span>
                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold">{Object.keys(drawings).length} Drawn</span>
                {cropBox && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">Global Crop Applied</span>}
              </div>
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