
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Briefcase, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RoleSelectionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary mb-4">Join Our Platform Today</h1>
        <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
          Choose the path that’s right for you. Are you looking to offer your services or find your next opportunity?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Expert Card */}
          <Card className="text-center hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1 border-primary">
            <CardHeader>
              <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">I&apos;m an Expert</CardTitle>
              <CardDescription>
                Offer your professional services, set your own rates, and connect with clients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/signup">
                  Become an Expert <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Fresher Card */}
          <Card className="text-center hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader>
              <div className="mx-auto bg-secondary p-4 rounded-full w-fit mb-4">
                <User className="h-8 w-8 text-secondary-foreground" />
              </div>
              <CardTitle className="text-2xl">Fresher</CardTitle>
              <CardDescription>
                Start your career journey and find exciting opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/vacancies">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
