
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowRight, Briefcase, Search, User, UserCheck } from 'lucide-react';
import { Icons } from '@/components/icons';

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full">
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
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5" />
                  <span className="font-semibold">For Freshers: Finding a Job</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                Are you looking to start your career? Browse job vacancies posted by top companies. Simply head to the "Vacancies" page, find a job that interests you, and follow the application instructions provided in the posting.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5" />
                  <span className="font-semibold">For Experts: Offering Your Services</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                Sign up as an expert to create your professional profile. Showcase your skills, experience, and qualifications to attract clients. Verified and premium members get higher visibility and more features.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Search className="h-5 w-5" />
                  <span className="font-semibold">For Clients: Finding an Expert</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                Use our powerful search filters on the home page to find the perfect professional for your needs. Search by skill, location, availability, and more. Use our AI-powered search for even more precise results.
              </AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-4">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5" />
                  <span className="font-semibold">Verification and Tiers</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                Becoming a verified expert builds trust with clients. Upgrading to our Premier or Super Premier tiers unlocks powerful features like job posting, top placement in search results, and direct contact options. Manage your plan from your dashboard.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <Button asChild size="lg" className="w-full mt-8">
            <Link href="/">
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
