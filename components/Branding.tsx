'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Branding() {
  return (
    <Link href="/" className="flex items-center gap-2.5 sm:gap-3 hover:opacity-80 transition-opacity">
      <Image 
        src="/logo.svg" 
        alt="SAT Practice Platform" 
        width={48}
        height={48}
        priority
        className="flex-shrink-0"
      />
      <div className="flex flex-col justify-center -space-y-0.5">
        <h1 className="font-normal text-gray-900 text-xs sm:text-sm leading-[1.2] tracking-tight">
          SAT Practice Platform
        </h1>
        <p className="text-[9px] sm:text-[10px] text-gray-500 leading-[1.2] hidden sm:block">
          By Sushanth Varma
        </p>
      </div>
    </Link>
  );
}
