
'use client';

import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Facebook, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
    return (
        <footer className="bg-secondary text-secondary-foreground mt-auto">
            <div className="container py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center space-x-2">
                            <Icons.logo className="h-8 w-8 text-primary" />
                            <span className="font-bold text-xl">DriveGuru</span>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                            Your one-stop platform for finding trusted local service professionals and kickstarting your career.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/" className="text-muted-foreground hover:text-primary">Home</Link></li>
                            <li><Link href="/vacancies" className="text-muted-foreground hover:text-primary">Vacancies</Link></li>
                            <li><Link href="/featured-experts" className="text-muted-foreground hover:text-primary">Featured Experts</Link></li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 className="font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/terms" className="text-muted-foreground hover:text-primary">Terms & Conditions</Link></li>
                            <li><Link href="/cancellation-policy" className="text-muted-foreground hover:text-primary">Cancellation & Refund</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Follow Us</h4>
                        <div className="flex space-x-4">
                            <Button asChild variant="ghost" size="icon">
                                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                                    <Twitter className="h-5 w-5" />
                                </a>
                            </Button>
                            <Button asChild variant="ghost" size="icon">
                                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                                    <Facebook className="h-5 w-5" />
                                </a>
                            </Button>
                             <Button asChild variant="ghost" size="icon">
                                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                                    <Linkedin className="h-5 w-5" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} DriveGuru. All Rights Reserved.</p>
                </div>
            </div>
        </footer>
    );
}
