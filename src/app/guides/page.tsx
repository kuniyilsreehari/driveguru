'use client';

import { useMemo, useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useFirestore, useDoc, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, BookOpen, Video, Rss, Users, Briefcase, PlayCircle, Info, Loader2, Share2, AlertCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ShareDialog } from '@/components/share-dialog';

type AppConfig = {
    introVideoUrl?: string;
    videoResources?: string[];
};

type ResolvedVideo = {
    url: string;
    type: 'youtube' | 'direct' | 'error';
    originalUrl: string;
};

export default function GuidesPage() {
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const appConfigDocRef = useMemoFirebase(() => doc(firestore, 'app_config', 'homepage'), [firestore]);
  const { data: appConfig } = useDoc<AppConfig>(appConfigDocRef);

  const [resolvedVideos, setResolvedVideos] = useState<ResolvedVideo[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const urls = appConfig?.videoResources || [appConfig?.introVideoUrl].filter(Boolean) || [];
    if (urls.length === 0) {
        setResolvedVideos([]);
        return;
    }

    const resolveAll = async () => {
        setIsResolving(true);
        const resolved: ResolvedVideo[] = [];

        for (const url of urls) {
            if (!url) continue;

            // 1. YouTube
            const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const ytMatch = url.match(ytRegExp);
            if (ytMatch && ytMatch[2].length === 11) {
                resolved.push({ 
                    url: `https://www.youtube.com/embed/${ytMatch[2]}`, 
                    type: 'youtube',
                    originalUrl: url
                });
                continue;
            }

            // 2. Storage
            if (url.startsWith('gs://') || (!url.startsWith('http') && url.includes('_DRIVE'))) {
                try {
                    const storage = getStorage(firebaseApp);
                    const path = url.startsWith('gs://') ? url : `gs://${firebaseApp.options.storageBucket}/${url}`;
                    const storageRef = ref(storage, path);
                    const downloadUrl = await getDownloadURL(storageRef);
                    resolved.push({ url: downloadUrl, type: 'direct', originalUrl: url });
                } catch (err) {
                    console.error("Failed to resolve storage URL", url, err);
                    resolved.push({ url: '', type: 'error', originalUrl: url });
                }
                continue;
            }

            // 3. Direct
            const directExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
            if (directExtensions.some(ext => url.toLowerCase().includes(ext)) || url.includes('firebasestorage.googleapis.com')) {
                resolved.push({ url: url, type: 'direct', originalUrl: url });
                continue;
            }

            resolved.push({ url: '', type: 'error', originalUrl: url });
        }

        setResolvedVideos(resolved);
        setIsResolving(false);
    };

    resolveAll();
  }, [appConfig?.videoResources, appConfig?.introVideoUrl, firebaseApp]);

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

        {isResolving ? (
            <Card className="rounded-[2rem] border-none bg-[#24262d] p-12 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Building Resource Library...</p>
            </Card>
        ) : resolvedVideos.length > 0 ? (
            <div className="space-y-8">
                {resolvedVideos.map((video, index) => (
                    <Card key={index} className="overflow-hidden border-2 border-primary/20 rounded-[2rem] shadow-2xl shadow-primary/5 bg-[#24262d] animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ transitionDelay: `${index * 100}ms` }}>
                        <CardHeader className="bg-white/5 border-b border-white/5 p-6 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-3 text-2xl font-black text-white">
                                    <PlayCircle className="h-6 w-6 text-orange-500" />
                                    {index === 0 ? "Platform Introduction" : `Tutorial Resource #${index + 1}`}
                                </CardTitle>
                                <CardDescription className="text-muted-foreground font-medium">Watch this guide to learn how to make the most of DriveGuru.</CardDescription>
                            </div>
                            <ShareDialog shareDetails={{ type: 'group-post', title: 'DriveGuru Platform Guide', text: 'Check out this professional guide on DriveGuru.', url: video.url || '' }}>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 h-10 w-10">
                                    <Share2 className="h-5 w-5 text-muted-foreground" />
                                </Button>
                            </ShareDialog>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="aspect-video w-full bg-black">
                                {video.type === 'error' ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center p-8">
                                        <AlertCircle className="h-12 w-12 text-red-500 opacity-20" />
                                        <p className="text-sm font-black text-white/40 uppercase tracking-widest">Video Resource Unavailable</p>
                                    </div>
                                ) : video.type === 'youtube' ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={video.url}
                                        title={`Guide #${index + 1}`}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="block"
                                    ></iframe>
                                ) : (
                                    <video 
                                        controls 
                                        controlsList="nodownload"
                                        onContextMenu={(e) => e.preventDefault()}
                                        className="w-full h-full"
                                        src={video.url}
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        ) : (
            <Card className="rounded-[2rem] border-none bg-[#24262d] p-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="bg-orange-500/10 p-4 rounded-full">
                    <Video className="h-10 w-10 text-orange-500 opacity-20" />
                </div>
                <h3 className="text-xl font-black text-white/40 uppercase italic">Library Empty</h3>
                <p className="text-sm text-muted-foreground max-w-sm">No training videos have been published by the administration yet.</p>
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
