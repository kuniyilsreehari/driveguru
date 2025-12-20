
'use client';

import Link from 'next/link';

export function Footer() {
    return (
        <footer className="bg-background text-secondary-foreground border-t">
            <div className="container py-6 text-center text-sm text-muted-foreground">
                <p className="mb-4">Available in: Kozhikode - Kerala</p>
                <div className="border-t border-border/50 pt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                    <p>&copy; {new Date().getFullYear()} DriveGuru. All rights reserved.</p>
                    <div className="flex items-center gap-x-4 gap-y-2 flex-wrap justify-center">
                         <Link href="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
                         <span className="hidden sm:inline">•</span>
                         <Link href="/cancellation-policy" className="hover:text-primary transition-colors">Cancellation & Refund Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
