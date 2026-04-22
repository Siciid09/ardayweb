"use client";

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SecurePdfViewerProps {
  pdfUrl: string;
  pageNumber: number;
  scale: number;
  onLoadSuccess: (data: { numPages: number }) => void;
}

export default function SecurePdfViewer({ pdfUrl, pageNumber, scale, onLoadSuccess }: SecurePdfViewerProps) {
  return (
    <Document
      file={pdfUrl}
      onLoadSuccess={onLoadSuccess}
      loading={
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-bold">Painting secure canvas...</p>
        </div>
      }
      error={
        <div className="text-red-500 font-bold bg-red-500/10 p-6 rounded-xl border border-red-500/20 text-center">
          Failed to decrypt document. Ensure Firebase CORS is configured.
        </div>
      }
    >
      <Page 
        pageNumber={pageNumber} 
        scale={scale}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        className="shadow-2xl border border-slate-800 pointer-events-none select-none"
      />
    </Document>
  );
}