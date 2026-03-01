'use client'
import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Hook up the worker directly via unpkg to bypass Turbopack / Webpack asset bundling bugs in dev & prod
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
    pdfUrl: string;
}

// React-PageFlip requires pages to be forwarded refs
const PageCover = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>((props, ref) => {
    return (
        <div className="page page-cover shadow-[0_0_20px_rgba(0,0,0,0.2)] bg-[#3D2B1F] flex items-center justify-center overflow-hidden" ref={ref} data-density="hard">
            <div className="page-content w-full h-full relative">
                {props.children}
            </div>
        </div>
    );
});

PageCover.displayName = 'PageCover';

const PageContent = React.forwardRef<HTMLDivElement, { children: React.ReactNode, number: number }>((props, ref) => {
    return (
        <div className="page bg-[#F4F1EA] shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] overflow-hidden" ref={ref}>
            <div className="page-content w-full h-full relative flex flex-col items-center justify-center px-4 py-8">
                <div className="flex-1 w-full flex items-center justify-center">
                    {props.children}
                </div>
                <div className="page-footer absolute bottom-4 text-[10px] text-[#3D2B1F]/40 font-serif w-full text-center">
                    {props.number}
                </div>
                {/* Binder Ring Effect (visual only) */}
                <div className="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
            </div>
        </div>
    );
});

PageContent.displayName = 'PageContent';

export default function FlipbookMenu({ pdfUrl }: Props) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [windowWidth, setWindowWidth] = useState(0);

    useEffect(() => {
        // Delay initial state set to avoid cascading render lock in Strict Mode
        const initialTimer = setTimeout(() => setWindowWidth(window.innerWidth), 0);
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(initialTimer);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    // Responsive scaling
    const isMobile = windowWidth < 768;
    const width = isMobile ? windowWidth - 20 : 400; // Single page width
    const height = isMobile ? (width * 1.414) : 600; // Standard A4 ratio

    if (!windowWidth) return null; // Avoid hydration mismatch

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] bg-[#2A2A2A] py-12 px-2 overflow-hidden relative">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/wood-pattern.png")` }}></div>

            <div className="text-center mb-8 z-10">
                <h2 className="text-[#C6A87C] font-serif uppercase tracking-[0.3em] text-sm mb-2">Our Menu</h2>
                <p className="text-stone-400 text-[10px] uppercase tracking-widest">{isMobile ? 'Swipe to turn pages' : 'Click or drag to flip pages'}</p>
            </div>

            <div className="relative z-10 max-w-full drop-shadow-2xl">
                <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="text-[#C6A87C] uppercase tracking-widest text-xs animate-pulse flex items-center justify-center h-64 w-full">
                            Loading Menu Book...
                        </div>
                    }
                >
                    {numPages && (
                        <HTMLFlipBook
                            width={width}
                            height={height}
                            size={isMobile ? "fixed" : "stretch"}
                            minWidth={315}
                            maxWidth={isMobile ? width : 600}
                            minHeight={420}
                            maxHeight={isMobile ? height : 900}
                            maxShadowOpacity={0.5}
                            showCover={true}
                            mobileScrollSupport={true}
                            className="flip-book"
                            style={{ margin: '0 auto' }}
                            startPage={0}
                            drawShadow={true}
                            flippingTime={1000}
                            usePortrait={isMobile}
                            startZIndex={0}
                            autoSize={true}
                            clickEventForward={true}
                            useMouseEvents={true}
                            swipeDistance={30}
                            showPageCorners={true}
                            disableFlipByClick={false}
                        >
                            {/* Generate a page for each PDF page */}
                            {Array.from(new Array(numPages), (el, index) => {
                                const isCover = index === 0 || index === numPages - 1;

                                if (isCover) {
                                    return (
                                        <PageCover key={`page_${index + 1}`}>
                                            <Page
                                                pageNumber={index + 1}
                                                width={width}
                                                renderTextLayer={false}
                                                renderAnnotationLayer={false}
                                                loading=""
                                            />
                                        </PageCover>
                                    );
                                }

                                return (
                                    <PageContent key={`page_${index + 1}`} number={index + 1}>
                                        <Page
                                            pageNumber={index + 1}
                                            width={width - 20} // Padding inside book
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                            loading=""
                                        />
                                    </PageContent>
                                );
                            })}
                        </HTMLFlipBook>
                    )}
                </Document>
            </div>

            <div className="mt-12 text-[#C6A87C]/50 text-[10px] uppercase tracking-widest z-10 flex gap-4">
                <button className="hover:text-[#C6A87C] transition-colors bg-black/20 px-4 py-2 rounded-full backdrop-blur-md">Previous</button>
                <button className="hover:text-[#C6A87C] transition-colors bg-black/20 px-4 py-2 rounded-full backdrop-blur-md">Next</button>
            </div>
        </div>
    );
}
