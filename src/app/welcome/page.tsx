'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Briefcase, Search, UserCheck, Users, Rss } from 'lucide-react';
import { Icons } from '@/components/icons';

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <Card className="transition-all duration-300 border-2 border-transparent hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
              <Icons.logo className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-4xl font-bold text-primary">Welcome to DriveGuru!</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Your journey to finding and providing expert services starts here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="bg-secondary/50 p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Search className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">Find an Expert</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Use our powerful search to find trusted professionals for any job. Filter by location, skills, and availability.
                </p>
                <Button asChild variant="outline">
                  <Link href="/">
                    Search for Experts <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
               <div className="bg-secondary/50 p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <UserCheck className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">Become an Expert</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Sign up to offer your services, build your profile, and connect directly with clients looking for your skills.
                </p>
                <Button asChild variant="outline">
                  <Link href="/signup/role">
                    Create Your Profile <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="bg-secondary/50 p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">Join a Group</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Connect and share knowledge with other professionals in groups dedicated to your interests and skills.
                </p>
                <Button asChild variant="outline">
                  <Link href="/groups">
                    Explore Groups <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="bg-secondary/50 p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Rss className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">View Public Feed</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Stay updated with the latest news, projects, and insights from the DriveGuru professional community.
                </p>
                <Button asChild variant="outline">
                  <Link href="/feed">
                    Go to Feed <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}