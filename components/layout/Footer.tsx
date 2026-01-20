'use client';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} SAT Practice Platform
            </p>
            <p className="text-xs text-gray-500 mt-1">
              By Sushanth Varma • Educational Excellence
            </p>
            <p className="text-xs text-gray-400 mt-1">
              <a href="mailto:email@sushanthvarma.in" className="hover:text-indigo-600 transition-colors">
                email@sushanthvarma.in
              </a>
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <a href="mailto:email@sushanthvarma.in" className="hover:text-indigo-600 transition-colors">
              Support
            </a>
            <span className="hover:text-indigo-600 transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-indigo-600 transition-colors cursor-pointer">Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
