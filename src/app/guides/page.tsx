'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, BookOpen, Video, Rss, Users, Briefcase } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
                <BookOpen className="h-10 w-10 text-primary" />
                <h1 className="text-4xl sm:text-5xl font-bold">How-To Guides</h1>
            </div>
            <p className="text-muted-foreground">Your quick-start guide to using DriveGuru.</p>
        </div>
        
        <div className="mb-6">
            <Button variant="outline" asChild>
                <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
            </Button>
        </div>

        <Card>
            <CardContent className="p-6 md:p-8">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>
                            <div className="flex items-center gap-3">
                                <Rss className="h-5 w-5 text-primary" />
                                <span>How to publish a post to the public feed?</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 text-muted-foreground pl-8">
                            <p>Sharing your thoughts with the entire community is easy. Your public posts are visible to everyone on the platform.</p>
                            <ol className="list-decimal list-inside space-y-2">
                                <li>Navigate to your <strong>Dashboard</strong>.</li>
                                <li>Find the "Post to the Public Feed" section.</li>
                                <li>Write your content in the textbox.</li>
                                <li>Click the "Post" button to publish it.</li>
                            </ol>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger>
                           <div className="flex items-center gap-3">
                                <Video className="h-5 w-5 text-primary" />
                                <span>How to share a video?</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 text-muted-foreground pl-8">
                            <p>You can easily share videos from platforms like YouTube or Vimeo by including a link in your posts.</p>
                             <ol className="list-decimal list-inside space-y-2">
                                <li>Create a new post in either the public feed or a group feed.</li>
                                <li>Paste the URL of your video directly into the post content.</li>
                                <li>Add any text you want to accompany the video.</li>
                                <li>Publish your post. The video link will be clickable for other users.</li>
                            </ol>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger>
                            <div className="flex items-center gap-3">
                                <Users className="h-5 w-5 text-primary" />
                                <span>How to post in a group?</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 text-muted-foreground pl-8">
                            <p>Groups are perfect for focused discussions. To post in a group, you must first be a member.</p>
                             <ol className="list-decimal list-inside space-y-2">
                                <li>Go to the <strong>Groups</strong> page and join a group that interests you.</li>
                                <li>Once you're a member, navigate to that specific group's page.</li>
                                <li>You will see a "Group Feed" section with a form to create a new post.</li>
                                <li>Write your content and click "Post" to share it with the group members.</li>
                            </ol>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}