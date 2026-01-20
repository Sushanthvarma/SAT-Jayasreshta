'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Branding() {
  return (
    <Link href="/" className="flex items-center gap-3 sm:gap-4 hover:opacity-80 transition-opacity">
      <Image 
        src="/logo.svg" 
        alt="SAT Practice Platform" 
        width={48}
        height={48}
        priority
        className="flex-shrink-0"
      />
      <div className="flex flex-col justify-center">
        <h1 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
          SAT Practice Platform
        </h1>
        <p className="text-xs text-gray-500 leading-tight hidden sm:block">
          By Sushanth Varma
        </p>
      </div>
    </Link>
  );
}
