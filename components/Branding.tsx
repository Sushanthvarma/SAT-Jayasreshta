'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Branding() {
  return (
    <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
      <Image 
        src="/logo.svg" 
        alt="SAT Practice Platform" 
        width={40}
        height={40}
        priority
        className="flex-shrink-0 sm:w-12 sm:h-12"
      />
      <div className="flex flex-col">
        <h1 className="font-bold text-gray-900 text-base sm:text-lg leading-tight">SAT Practice Platform</h1>
        <p className="text-xs text-gray-500 hidden sm:block">By Sushanth Varma</p>
      </div>
    </Link>
  );
}
