import { Link, Outlet, useLocation } from 'react-router-dom';
import { FileText, Plus, PenLine } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const isSignPage = location.pathname.startsWith('/sign/');

  return (
    <div className="min-h-screen bg-gray-50">
      {!isSignPage && (
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-primary font-bold text-xl no-underline">
              <PenLine className="w-6 h-6" />
              DocSign
            </Link>
            <Link to="/new">
              <button className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
                <Plus className="w-4 h-4" />
                New Document
              </button>
            </Link>
          </div>
        </header>
      )}
      <main className={isSignPage ? '' : 'max-w-5xl mx-auto px-4 py-8'}>
        <Outlet />
      </main>
    </div>
  );
}
