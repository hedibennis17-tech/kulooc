import { Home, User, Wallet, Inbox, LifeBuoy } from 'lucide-react';
import Link from 'next/link';

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen bg-background font-sans">
      <header className="bg-white shadow-sm p-4 flex items-center justify-between z-10 border-b">
        <Link href="/driver" className="text-2xl font-bold tracking-tighter text-primary">
          KULOOC 🍁
        </Link>
        <div className="flex items-center gap-2">
            <Link href="/driver/inbox">
                <button className="p-2 rounded-full hover:bg-muted">
                    <Inbox className="h-6 w-6 text-gray-700" />
                </button>
            </Link>
             <Link href="/help">
                <button className="p-2 rounded-full hover:bg-muted">
                    <LifeBuoy className="h-6 w-6 text-gray-700" />
                </button>
            </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>

      <nav className="bg-white border-t shadow-t-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-around">
          <Link href="/driver" className="flex flex-col items-center justify-center text-gray-600 hover:text-primary">
            <Home className="h-6 w-6" />
            <span className="text-xs font-medium">Accueil</span>
          </Link>
          <Link href="#" className="flex flex-col items-center justify-center text-gray-600 hover:text-primary">
            <Wallet className="h-6 w-6" />
            <span className="text-xs font-medium">Gains</span>
          </Link>
          <Link href="/driver/account" className="flex flex-col items-center justify-center text-gray-600 hover:text-primary">
            <User className="h-6 w-6" />
            <span className="text-xs font-medium">Compte</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
