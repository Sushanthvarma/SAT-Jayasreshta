import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'SAT Practice Platform | By Sushanth Varma',
  description: 'Master the SAT with comprehensive practice tests, detailed analytics, and personalized learning paths. Educational excellence for students worldwide.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#3B82F6',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster 
            position="top-center"
            containerClassName="!top-16 sm:!top-20"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#fff',
                color: '#111827',
                fontSize: '14px',
                padding: '12px 16px',
                borderRadius: '12px',
                boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
                maxWidth: '90vw',
                margin: '0 auto',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}