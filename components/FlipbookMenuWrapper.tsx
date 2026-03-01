'use client'
import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the FlipbookMenu component with SSR disabled
const FlipbookMenu = dynamic(() => import('@/components/FlipbookMenu'), { ssr: false });

interface Props {
    pdfUrl: string;
}

export default function FlipbookMenuWrapper(props: Props) {
    return <FlipbookMenu {...props} />;
}
