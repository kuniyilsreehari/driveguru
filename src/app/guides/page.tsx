'use client';

import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, BookOpen, Video, Rss, Users, Briefcase, PlayCircle, Info } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type AppConfig = {
    introVideoUrl?: string;
};

export default function GuidesPage() {
  const firestore = useFirestore();
  const appConfigDocRef = useMemoFirebase(() => doc(firestore, 'app_config', 'homepage'), [firestore]);
  const { data: appConfig } = useDoc<AppConfig>(appConfigDocRef);

  const youtubeEmbedUrl = useMemo(() => {
    const url = appConfig?.introVideoUrl;
    if (!url) return null;
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
  }, [appConfig?.introVideoUrl]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
                <BookOpen className="h-10 w-10 text-primary" />
                <h1 className="text-4xl sm:text-5xl font-bold">DriveGuru Guides</h1>
            </div>
            <p className="text-muted-foreground">Master the platform with our step-by-step video and text guides.</p>
        </div>
        
        <div className="mb-6">
            <Button variant="outline" asChild className="rounded-xl">
                <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
            </Button>
        </div>

        {youtubeEmbedUrl && (
            <Card className="overflow-hidden border-2 border-primary/20 rounded-[2rem] shadow-2xl shadow-primary/5 bg-[#24262d]">
                <CardHeader className="bg-white/5 border-b border-white/5 p-6">
                    <CardTitle className="flex items-center gap-3 text-2xl font-black text-white">
                        <PlayCircle className="h-6 w-6 text-orange-500" />
                        Platform Introduction
                    </CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Watch this short video to learn how to make the most of DriveGuru.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="aspect-video w-full bg-black">
                        <iframe
                            width="100%"
                            height="100%"
                            src={youtubeEmbedUrl}
                            title="DriveGuru Platform Introduction"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="block"
                        ></iframe>
                    </div>
                </CardContent>
            </Card>
        )}

        <Card className="rounded-[2rem] border-none bg-[#24262d] shadow-xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5 p-8">
                <div className="flex items-center gap-3 mb-2">
                    <Info className="h-6 w-6 text-orange-500" />
                    <CardTitle className="text-2xl font-black text-white">Quick Help Center</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground text-sm font-medium">Common questions and step-by-step platform procedures.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-white/5">
                        <AccordionTrigger className="hover:no-underline text-white font-bold py-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Rss className="h-5 w-5 text-orange-500" />
                                </div>
                                <span>Publishing to the Public Feed</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 text-muted-foreground pl-11 pb-8">
                            <p>Share professional updates, photos, or project completions with the entire community. Public posts are visible to all users and visitors.</p>
                            <ol className="list-decimal list-inside space-y-3 font-medium">
                                <li>Navigate to your <Link href="/dashboard" className="text-orange-500 hover:underline">Dashboard</Link>.</li>
                                <li>Switch to the <strong>Feed</strong> tab.</li>
                                <li>Write your update in the content box. You can include links to YouTube videos or Instagram posts.</li>
                                <li>Click <strong>Post</strong> to go live.</li>
                            </ol>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2" className="border-white/5">
                        <AccordionTrigger className="hover:no-underline text-white font-bold py-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Video className="h-5 w-5 text-orange-500" />
                                </div>
                                <span>Sharing Videos & Portfolio Items</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 text-muted-foreground pl-11 pb-8">
                            <p>Showcase your expertise by sharing video content from YouTube, Vimeo, or Instagram directly in your feed.</p>
                             <ol className="list-decimal list-inside space-y-3 font-medium">
                                <li>Create a new post in your dashboard feed.</li>
                                <li>Paste the direct URL of your video (e.g., https://youtu.be/...) into the post content.</li>
                                <li>The DriveGuru feed will automatically detect and render an interactive video player.</li>
                                <li>You can also add images directly to your triple-image profile slots in settings.</li>
                            </ol>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3" className="border-white/5">
                        <AccordionTrigger className="hover:no-underline text-white font-bold py-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Users className="h-5 w-5 text-orange-500" />
                                </div>
                                <span>Collaborating in Professional Groups</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 text-muted-foreground pl-11 pb-8">
                            <p>Groups allow for specialized discussions with experts in your industry. Private groups require approval from the group owner.</p>
                             <ol className="list-decimal list-inside space-y-3 font-medium">
                                <li>Visit the <Link href="/groups" className="text-orange-500 hover:underline">Groups</Link> page to explore active communities.</li>
                                <li>Click <strong>Join</strong> or <strong>Request to Join</strong> on a group that matches your skills.</li>
                                <li>Once a member, you can post, comment, and share documents within that specific group's private feed.</li>
                            </ol>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-4" className="border-none">
                        <AccordionTrigger className="hover:no-underline text-white font-bold py-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Briefcase className="h-5 w-5 text-orange-500" />
                                </div>
                                <span>Discovering Job Vacancies</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 text-muted-foreground pl-11 pb-8">
                            <p>Browse active job openings posted by companies and verified professionals directly in our interactive Jobs board.</p>
                             <ol className="list-decimal list-inside space-y-3 font-medium">
                                <li>Go to the <Link href="/vacancies" className="text-orange-500 hover:underline">Job Board</Link> from the main menu.</li>
                                <li>Filter by employment type or search for specific skills.</li>
                                <li>Review job descriptions and contact the employer directly via email or phone.</li>
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
