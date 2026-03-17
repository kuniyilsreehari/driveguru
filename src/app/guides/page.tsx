
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
    // Collect all unique video sources
    const urls = appConfig?.videoResources?.filter(url => url.trim() !== "") || [];
    // Include intro video if it's not already in the resources
    if (appConfig?.introVideoUrl && !urls.includes(appConfig.introVideoUrl)) {
        urls.unshift(appConfig.introVideoUrl);
    }

    if (urls.length === 0) {
        setResolvedVideos([]);
        return;
    }

    const resolveAll = async () => {
        setIsResolving(true);
        const resolved: ResolvedVideo[] = [];

        for (const url of urls) {
            if (!url) continue;

            // 1. YouTube Identification
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

            // 2. Firebase Storage Identification (gs:// or common paths)
            if (url.startsWith('gs://') || url.includes('firebasestorage.googleapis.com') || url.includes('/profile-photos/') || url.includes('/post_images/') || url.includes('/tutorial_videos/')) {
                try {
                    const storage = getStorage(firebaseApp);
                    // Handle direct download URLs vs relative paths
                    let finalDownloadUrl = url;
                    if (url.startsWith('gs://') || !url.startsWith('http')) {
                        const path = url.startsWith('gs://') ? url : `gs://${firebaseApp.options.storageBucket}/${url}`;
                        const storageRef = ref(storage, path);
                        finalDownloadUrl = await getDownloadURL(storageRef);
                    }
                    resolved.push({ url: finalDownloadUrl, type: 'direct', originalUrl: url });
                } catch (err) {
                    console.error("Failed to resolve storage URL", url, err);
                    resolved.push({ url: '', type: 'error', originalUrl: url });
                }
                continue;
            }

            // 3. Direct Link Identification (MP4, etc)
            const directExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
            if (directExtensions.some(ext => url.toLowerCase().includes(ext))) {
                resolved.push({ url: url, type: 'direct', originalUrl: url });
                continue;
            }

            // Fallback: Try as YouTube or mark as error
            resolved.push({ url: '', type: 'error', originalUrl: url });
        }

        setResolvedVideos(resolved);
        setIsResolving(false);
    };

    resolveAll();
  }, [appConfig?.videoResources, appConfig?.introVideoUrl, firebaseApp]);

  return (
    <div className="min-h-screen bg-[#1a1c23] p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
                <BookOpen className="h-10 w-10 text-orange-500" />
                <h1 className="text-4xl sm:text-6xl font-black text-white uppercase italic tracking-tighter">Guide Center</h1>
            </div>
            <p className="text-muted-foreground font-medium">Master the platform with sequential video and text resources.</p>
        </div>
        
        <div className="mb-6">
            <Button variant="outline" asChild className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold h-10">
                <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
            </Button>
        </div>

        {isResolving ? (
            <Card className="rounded-[2rem] border-none bg-[#24262d] p-16 flex flex-col items-center justify-center gap-4 shadow-2xl">
                <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Syncing Video Library...</p>
            </Card>
        ) : resolvedVideos.length > 0 ? (
            <div className="space-y-10">
                {resolvedVideos.map((video, index) => (
                    <Card key={index} className="overflow-hidden border-2 border-white/5 rounded-[2.5rem] shadow-2xl bg-[#24262d] animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ transitionDelay: `${index * 100}ms` }}>
                        <CardHeader className="bg-white/5 border-b border-white/5 p-6 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-3 text-2xl font-black text-white uppercase italic">
                                    <PlayCircle className="h-6 w-6 text-orange-500" />
                                    {index === 0 ? "Introduction" : `Tutorial #${index + 1}`}
                                </CardTitle>
                                <CardDescription className="text-muted-foreground font-medium">System training module for professionals.</CardDescription>
                            </div>
                            <ShareDialog shareDetails={{ type: 'group-post', title: 'DriveGuru Platform Guide', text: 'Master your professional presence with this guide.', url: video.url || window.location.href }}>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 h-10 w-10">
                                    <Share2 className="h-5 w-5 text-muted-foreground" />
                                </Button>
                            </ShareDialog>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="aspect-video w-full bg-black shadow-inner">
                                {video.type === 'error' ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center p-8 bg-white/5">
                                        <AlertCircle className="h-12 w-12 text-red-500 opacity-20" />
                                        <p className="text-sm font-black text-white/40 uppercase tracking-widest">Resource Link Invalid</p>
                                        <p className="text-[10px] text-muted-foreground max-w-xs">{video.originalUrl}</p>
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
                                        className="w-full h-full object-contain"
                                        src={video.url}
                                    >
                                        Your browser does not support high-definition video playback.
                                    </video>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        ) : (
            <Card className="rounded-[2.5rem] border-none bg-[#24262d] p-20 flex flex-col items-center justify-center gap-4 text-center shadow-xl">
                <div className="bg-orange-500/10 p-6 rounded-full w-fit mb-4">
                    <Video className="h-12 w-12 text-orange-500 opacity-20" />
                </div>
                <h3 className="text-2xl font-black text-white/40 uppercase italic tracking-tighter">Library Empty</h3>
                <p className="text-sm text-muted-foreground max-w-sm font-medium">Platform video guides have not been published by the administration yet.</p>
            </Card>
        )}

        <Card className="rounded-[2.5rem] border-none bg-[#24262d] shadow-2xl overflow-hidden mt-12">
            <CardHeader className="bg-white/5 border-b border-white/5 p-8">
                <div className="flex items-center gap-3 mb-2">
                    <Info className="h-6 w-6 text-orange-500" />
                    <CardTitle className="text-2xl font-black text-white uppercase italic tracking-tighter">Technical Help Center</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground text-sm font-medium">Procedures for optimizing your professional presence.</CardDescription>
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
                        <AccordionContent className="space-y-4 text-muted-foreground pl-11 pb-8 leading-relaxed font-medium">
                            <p>Share professional updates, photos, or project completions with the entire community. Public posts are visible to all users and visitors.</p>
                            <ol className="list-decimal list-inside space-y-3">
                                <li>Navigate to your <Link href="/dashboard" className="text-orange-500 hover:underline">Dashboard</Link>.</li>
                                <li>Switch to the <strong>Feed</strong> tab.</li>
                                <li>Write your update. You can include links to YouTube or Instagram.</li>
                                <li>Click <strong>Post</strong> to synchronize with the public wall.</li>
                            </ol>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2" className="border-white/5">
                        <AccordionTrigger className="hover:no-underline text-white font-bold py-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Video className="h-5 w-5 text-orange-500" />
                                </div>
                                <span>Sharing Video Portfolios</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 text-muted-foreground pl-11 pb-8 leading-relaxed font-medium">
                            <p>Showcase your expertise by sharing video content from YouTube or Instagram directly in your feed.</p>
                             <ol className="list-decimal list-inside space-y-3">
                                <li>Paste the direct URL of your video into a new feed post.</li>
                                <li>The DriveGuru engine will automatically detect and render an interactive player.</li>
                                <li>Ensure your profile is **Verified** to maximize video reach.</li>
                            </ol>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3" className="border-none">
                        <AccordionTrigger className="hover:no-underline text-white font-bold py-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Users className="h-5 w-5 text-orange-500" />
                                </div>
                                <span>Professional Networking Groups</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 text-muted-foreground pl-11 pb-8 leading-relaxed font-medium">
                            <p>Groups allow for specialized discussions with experts in your industry. Private groups require approval from the group owner.</p>
                             <ol className="list-decimal list-inside space-y-3">
                                <li>Visit the <Link href="/groups" className="text-orange-500 hover:underline">Groups Hub</Link> to explore communities.</li>
                                <li>Once a member, you can participate in secureIndustry-specific threads.</li>
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
