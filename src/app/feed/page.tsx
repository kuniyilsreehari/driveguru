
'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, orderBy, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData, addDoc, where, onSnapshot, QueryConstraint } from 'firebase/firestore';
import { getStorage, ref as storageRef, getDownloadURL, ref } from "firebase/storage";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, useFirebaseApp } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ChevronLeft, Rss, Search, Heart, Share2, MoreHorizontal, Trash2, Send, LogIn, MessageSquareReply, MessageSquare, Pen, Upload, Image as ImageIcon, X, Linkedin, Twitter, Github, Globe, Youtube, UserPlus, UserMinus, Crown, Sparkles, UserCheck, PlayCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ShareDialog } from '@/components/share-dialog';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LikesDialog } from '@/components/likes-dialog';
import { ImageLightbox } from '@/components/image-lightbox';
import { useSearchParams } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';


type Post = {
    id: string;
    authorId: string;
    title?: string;
    content: string;
    link?: string;
    imageUrl?: string;
    createdAt: Timestamp;
    likes?: string[];
};

type Comment = {
    id: string;
    parentId: string | null;
    authorId: string;
    content: string;
    createdAt: Timestamp;
    likes?: string[];
    replies?: Comment[];
}

type UserProfile = {
    id: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    verified?: boolean;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    following?: string[];
}

const commentFormSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty.'),
});

function getInitials(firstName?: string, lastName?: string) {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
}


function CommenterInfo({ authorId }: { authorId: string }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    
    const commenterDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'users', authorId);
    }, [firestore, authorId]);
    const { data: commenter, isLoading } = useDoc<UserProfile>(commenterDocRef);

    const currentUserDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: currentUserProfile } = useDoc<UserProfile>(currentUserDocRef);

    const handleToggleFollow = async () => {
        if (!currentUserDocRef || !commenter) return;

        try {
            const isFollowing = currentUserProfile?.following?.includes(commenter.id);
            const updateAction = isFollowing ? arrayRemove(commenter.id) : arrayUnion(commenter.id);
            await updateDocumentNonBlocking(currentUserDocRef, { following: updateAction });
            toast({
                title: isFollowing ? 'Unfollowed' : 'Followed',
                description: `You are now ${isFollowing ? 'no longer following' : 'following'} ${commenter.firstName} ${commenter.lastName}.`,
            });
        } catch (error) {
            console.error("Failed to toggle follow", error);
            if ((error as any).name !== 'FirebaseError') {
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not update your follow status.' });
            }
        }
    }

    if (isLoading || !commenter) {
        return (
             <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarFallback><Loader2 className="h-4 w-4 animate-spin" /></AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="text-sm font-semibold">Loading...</p>
                </div>
            </div>
        );
    }
    
    const displayName = `${commenter.firstName || 'Anonymous'} ${commenter.lastName || ''}`.trim();
    const displayInitials = getInitials(commenter.firstName, commenter.lastName);
    const canFollow = user && user.uid !== commenter.id;
    const isFollowing = user && currentUserProfile?.following?.includes(commenter.id);

    return (
        <div className="flex items-center gap-3">
            <Link href={`/expert/${authorId}`}>
                <Avatar className="h-8 w-8">
                    <AvatarImage src={commenter.photoUrl} />
                    <AvatarFallback>{displayInitials}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <Link href={`/expert/${authorId}`} className="hover:underline">
                        <p className="text-sm font-semibold">{displayName}</p>
                    </Link>
                    {commenter.verified && <UserCheck className="h-4 w-4 text-green-500" />}
                    {commenter.tier === 'Premier' && <Crown className="h-4 w-4 text-purple-500" />}
                    {commenter.tier === 'Super Premier' && <Sparkles className="h-4 w-4 text-blue-500" />}
                     {canFollow && (
                        <>
                           <span className="text-muted-foreground/50 text-xs">•</span>
                           <button onClick={handleToggleFollow} className="text-primary hover:underline font-semibold text-xs">
                               {isFollowing ? 'Following' : 'Follow'}
                           </button>
                       </>
                   )}
                </div>
            </div>
        </div>
    );
}

function CommentThread({ comment, postId, allComments, onDelete, postAuthorId }: { comment: Comment, postId: string, allComments: Comment[], onDelete: (commentId: string) => void, postAuthorId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);
    
    const superAdminDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'roles_super_admin', user.uid);
    }, [firestore, user]);
    const { data: superAdminData } = useDoc(superAdminDocRef);
    const isSuperAdmin = !!superAdminData;

    const replies = useMemo(() => allComments.filter(c => c.parentId === comment.id), [allComments, comment.id]);

    const form = useForm<z.infer<typeof commentFormSchema>>({
        resolver: zodResolver(commentFormSchema),
        defaultValues: { content: '' },
    });
    
    async function onSubmit(values: z.infer<typeof commentFormSchema>) {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'You must be logged in to comment.' });
            return;
        }
        setIsSubmitting(true);
        const commentRef = collection(firestore, 'posts', postId, 'comments');
        try {
            await addDocumentNonBlocking(commentRef, {
                authorId: user.uid,
                content: values.content,
                createdAt: serverTimestamp(),
                parentId: comment.id,
            });

            // Notify comment author
            if (user.uid !== comment.authorId) {
                const notifRef = collection(firestore, 'users', comment.authorId, 'notifications');
                addDocumentNonBlocking(notifRef, {
                    type: 'comment_reply',
                    message: `replied to your comment.`,
                    link: `/feed#${postId}`,
                    read: false,
                    actorId: user.uid,
                    actorName: user.displayName || 'An expert',
                    actorPhotoUrl: user.photoURL || '',
                    createdAt: serverTimestamp(),
                });
            }

            form.reset();
            setShowReplyForm(false);
        } catch (error) {
            if ((error as any).name !== 'FirebaseError') {
                toast({ variant: 'destructive', title: 'Failed to post reply.' });
            }
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleLikeComment = async () => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'You must be logged in to like a comment.' });
            return;
        }

        const commentRef = doc(firestore, 'posts', postId, 'comments', comment.id);
        const hasLiked = comment.likes?.includes(user.uid);
        const updateAction = hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid);
        
        try {
            await updateDoc(commentRef, { likes: updateAction });
        } catch (error) {
            console.error("Error liking comment:", error);
            if ((error as any).name !== 'FirebaseError') {
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not update like status.' });
            }
        }
    };

    const handleUpdateComment = async () => {
        if (!firestore) return;
        const commentDocRef = doc(firestore, 'posts', postId, 'comments', comment.id);
        
        try {
            await updateDocumentNonBlocking(commentDocRef, { content: editedContent });
            toast({ title: "Comment updated." });
            setIsEditing(false);
        } catch(error) {
            if ((error as any).name !== 'FirebaseError') {
                toast({ variant: 'destructive', title: 'Failed to update comment.' });
            }
        }
    }
    
    const canManageComment = user && (user.uid === comment.authorId || user.uid === postAuthorId || isSuperAdmin);
    const canEditComment = user && user.uid === comment.authorId;
    const hasLiked = user ? comment.likes?.includes(user.uid) : false;
    const canViewLikes = comment.likes && comment.likes.length > 0;

    return (
        <div className="flex items-start gap-3">
             {comment.parentId && <div className="w-4 shrink-0 border-l-2 border-border/50 h-full ml-4" />}
            <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                    <CommenterInfo authorId={comment.authorId} />
                    {canManageComment && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {canEditComment && 
                                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                        <Pen className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                }
                                <DropdownMenuItem onClick={() => onDelete(comment.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                <div className="pl-11">
                    {isEditing ? (
                        <div className="space-y-2">
                            <Textarea 
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="text-sm"
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button size="sm" onClick={handleUpdateComment}>Save</Button>
                            </div>
                        </div>
                    ) : (
                         <p className="text-sm">{comment.content}</p>
                    )}
                
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <p title={comment.createdAt?.toDate().toLocaleString()}>
                            {comment.createdAt ? `${formatDistanceToNowStrict(new Date(comment.createdAt.seconds * 1000))} ago` : 'just now'}
                        </p>
                        {user && (
                            <>
                                <button onClick={() => setShowReplyForm(!showReplyForm)} className="hover:underline flex items-center gap-1">
                                    <MessageSquareReply className="h-3 w-3" />
                                    Reply
                                </button>
                                <Button variant="ghost" size="sm" onClick={handleLikeComment} className="text-xs h-auto p-0 flex items-center -ml-2 text-muted-foreground hover:text-foreground">
                                    <Heart className={cn("mr-1 h-3 w-3", hasLiked && "fill-red-500 text-red-500")} />
                                    Like
                                    {canViewLikes && (
                                        <LikesDialog userIds={comment.likes!}>
                                            <span className="text-xs text-muted-foreground hover:underline ml-1">({comment.likes?.length})</span>
                                        </LikesDialog>
                                    )}
                                </Button>
                            </>
                        )}
                    </div>

                    {showReplyForm && user && (
                        <div className="mt-2">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
                                    <FormField
                                        control={form.control}
                                        name="content"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormControl>
                                                    <Input placeholder={`Reply to this comment...`} {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" size="icon" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    )}
                </div>
                
                 {replies.length > 0 && (
                    <div className="pt-2 space-y-4">
                        {replies.map(reply => (
                            <CommentThread key={reply.id} comment={reply} postId={postId} allComments={allComments || []} onDelete={onDelete} postAuthorId={postAuthorId}/>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function CommentsSection({ postId, postAuthorId }: { postId: string, postAuthorId: string }) {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCommentDeleteDialogOpen, setIsCommentDeleteDialogOpen] = useState(false);
    const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
    
    const commentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
    }, [firestore, postId]);

    const { data: comments, isLoading: isLoadingComments } = useCollection<Comment>(commentsQuery);
    
    const form = useForm<z.infer<typeof commentFormSchema>>({
        resolver: zodResolver(commentFormSchema),
        defaultValues: { content: '' },
    });

    async function onSubmit(values: z.infer<typeof commentFormSchema>) {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'You must be logged in to comment.' });
            return;
        }
        setIsSubmitting(true);
        const commentRef = collection(firestore, 'posts', postId, 'comments');
        try {
            await addDocumentNonBlocking(commentRef, {
                authorId: user.uid,
                content: values.content,
                createdAt: serverTimestamp(),
                parentId: null
            });

            // Notify post author
            if (user.uid !== postAuthorId) {
                const notifRef = collection(firestore, 'users', postAuthorId, 'notifications');
                addDocumentNonBlocking(notifRef, {
                    type: 'comment_reply',
                    message: `commented on your post.`,
                    link: `/feed#${postId}`,
                    read: false,
                    actorId: user.uid,
                    actorName: user.displayName || 'An expert',
                    actorPhotoUrl: user.photoURL || '',
                    createdAt: serverTimestamp(),
                });
            }

            form.reset();
        } catch (error) {
            if ((error as any).name !== 'FirebaseError') {
                toast({ variant: 'destructive', title: 'Failed to post comment.' });
            }
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const openDeleteDialog = (commentId: string) => {
        setSelectedCommentId(commentId);
        setIsCommentDeleteDialogOpen(true);
    };

    const handleDeleteComment = () => {
        if (!firestore || !selectedCommentId) return;
        const commentDocRef = doc(firestore, 'posts', postId, 'comments', selectedCommentId);
        deleteDocumentNonBlocking(commentDocRef).then(() => {
            toast({ title: "Comment deleted." });
        }).catch(error => {
            if ((error as any).name !== 'FirebaseError') {
                toast({ variant: 'destructive', title: 'Failed to delete comment.' });
            }
        });
        setIsCommentDeleteDialogOpen(false);
        setSelectedCommentId(null);
    };
    
    const topLevelComments = useMemo(() => {
        return comments?.filter(c => !c.parentId) || [];
    }, [comments]);


    return (
      <>
        <div className="pt-4 space-y-4">
            <Separator />
            {isUserLoading ? (
                 <div className="flex items-center justify-center h-10">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            ) : user ? (
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                        <Input placeholder="Write a comment..." {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" size="icon" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                 </Form>
            ) : (
                <div className="text-center py-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/login">
                            <LogIn className="mr-2 h-4 w-4" />
                            Log in to comment
                        </Link>
                    </Button>
                </div>
            )}
             <Separator />

             {isLoadingComments ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading comments...</span>
                </div>
            ) : (
                <div className="space-y-4">
                    {topLevelComments.map(comment => (
                        <CommentThread key={comment.id} comment={comment} postId={postId} allComments={comments || []} onDelete={openDeleteDialog} postAuthorId={postAuthorId}/>
                    ))}
                </div>
            )}
        </div>
        <AlertDialog open={isCommentDeleteDialogOpen} onOpenChange={setIsCommentDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete this comment and all of its replies. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteComment} className="bg-destructive hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
}

const POSTS_PER_PAGE = 5;

function VideoEmbed({ url }: { url: string }) {
    const firebaseApp = useFirebaseApp();
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (url.startsWith('gs://') || (!url.startsWith('http') && url.includes('_DRIVE'))) {
            setIsLoading(true);
            const storage = getStorage(firebaseApp);
            const path = url.startsWith('gs://') ? url : `gs://${firebaseApp.options.storageBucket}/${url}`;
            const storageRef = ref(storage, path);
            getDownloadURL(storageRef)
                .then(setResolvedUrl)
                .catch((err) => {
                    console.warn("Storage resolution failed", err);
                    setError(true);
                })
                .finally(() => setIsLoading(false));
        } else {
            setResolvedUrl(url);
        }
    }, [url, firebaseApp]);

    if (isLoading) return <div className="aspect-video bg-white/5 rounded-lg flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>;
    
    if (error) {
        return (
            <div className="aspect-video bg-white/5 rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-muted-foreground p-4 text-center">
                <AlertCircle className="h-8 w-8 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Video Unavailable</p>
                <p className="text-[10px] opacity-50">Storage link could not be resolved.</p>
            </div>
        );
    }

    if (!resolvedUrl) return null;

    return (
        <div className="aspect-video rounded-lg overflow-hidden border bg-black shadow-xl">
            <video 
                src={resolvedUrl} 
                className="w-full h-full" 
                controls 
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
            />
        </div>
    );
}

const PostContentRenderer = ({ content }: { content: string }) => {
    const youtubeRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]+))/;
    const instagramRegex = /(https?:\/\/(?:www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)\/?)/;
    const gsRegex = /(gs:\/\/[^\s]+)/;
    const storagePathRegex = /((?:tutorial_videos|post_images)\/[^\s]+)/;
    const videoFileRegex = /(https?:\/\/[^\s]+\.(mp4|webm|ogg|mov))/i;
    
    let currentContent = content;

    const youtubeMatch = currentContent.match(youtubeRegex);
    if (youtubeMatch) {
        const videoId = youtubeMatch[2];
        const isLive = youtubeMatch[0].includes('/live/');
        const embedUrl = isLive ? `https://www.youtube.com/embed/live_stream?channel=${videoId}` : `https://www.youtube.com/embed/${videoId}`;
        const parts = currentContent.split(youtubeMatch[0]);

        return (
            <div className="space-y-4">
                {parts[0] && <p className="text-sm whitespace-pre-wrap">{parts[0]}</p>}
                <div className="aspect-video rounded-lg overflow-hidden border">
                    <iframe
                        width="100%"
                        height="100%"
                        src={embedUrl}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
                {parts[1] && <p className="text-sm whitespace-pre-wrap">{parts[1]}</p>}
            </div>
        );
    }

    const instagramMatch = currentContent.match(instagramRegex);
    if (instagramMatch) {
        const postUrl = instagramMatch[0];
        const parts = currentContent.split(instagramMatch[0]);
        return (
             <div className="space-y-4">
                {parts[0] && <p className="text-sm whitespace-pre-wrap">{parts[0]}</p>}
                 <div className="my-4 flex justify-center">
                    <iframe 
                        className="instagram-media instagram-media-rendered" 
                        src={`${postUrl}embed/captioned`} 
                        allowFullScreen={true} 
                        frameBorder="0" 
                        height="550" 
                        scrolling="no" 
                        style={{ background: 'white', border: '1px solid rgb(219, 219, 219)', borderRadius: '3px', display: 'block', margin: '0px auto', maxWidth: '540px', minWidth: '326px', padding: '0px', width: 'calc(100% - 2px)' }}>
                    </iframe>
                </div>
                {parts[1] && <p className="text-sm whitespace-pre-wrap">{parts[1]}</p>}
            </div>
        )
    }

    const gsMatch = currentContent.match(gsRegex) || currentContent.match(storagePathRegex);
    if (gsMatch) {
        const url = gsMatch[0];
        const parts = currentContent.split(gsMatch[0]);
        return (
            <div className="space-y-4">
                {parts[0] && <p className="text-sm whitespace-pre-wrap">{parts[0]}</p>}
                <VideoEmbed url={url} />
                {parts[1] && <p className="text-sm whitespace-pre-wrap">{parts[1]}</p>}
            </div>
        );
    }

    const videoMatch = currentContent.match(videoFileRegex);
    if (videoMatch) {
        const url = videoMatch[0];
        const parts = currentContent.split(url);
        return (
            <div className="space-y-4">
                {parts[0] && <p className="text-sm whitespace-pre-wrap">{parts[0]}</p>}
                <VideoEmbed url={url} />
                {parts[1] && <p className="text-sm whitespace-pre-wrap">{parts[1]}</p>}
            </div>
        );
    }

    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
};

function PostCard({ post }: { post: Post }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isPostDeleteDialogOpen, setIsPostDeleteDialogOpen] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editedPostContent, setEditedPostContent] = useState('');
    const [posts, setPosts] = useState<Post[]>([]);

    const superAdminDocRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'roles_super_admin', user.uid);
    }, [firestore, user]);
    const { data: superAdminData } = useDoc(superAdminDocRef);
    const isSuperAdmin = !!superAdminData;

    const authorDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'users', post.authorId);
    }, [firestore, post.authorId]);
    const { data: author, isLoading: isAuthorLoading } = useDoc<UserProfile>(authorDocRef);
    
    const currentUserDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: currentUserProfile } = useDoc<UserProfile>(currentUserDocRef);


    const handleLike = async (postToLike: Post) => {
        if (!user || !firestore) {
            toast({
                variant: 'destructive',
                title: 'Authentication Required',
                description: 'You must be logged in to like a post.',
            });
            return;
        }

        const postRef = doc(firestore, 'posts', postToLike.id);
        const hasLiked = postToLike.likes?.includes(user.uid);
        const updateAction = hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid);

        try {
            await updateDoc(postRef, {
                likes: updateAction,
            });

            // Create notification for the author
            if (!hasLiked && user.uid !== postToLike.authorId) {
                const notifRef = collection(firestore, 'users', postToLike.authorId, 'notifications');
                addDocumentNonBlocking(notifRef, {
                    type: 'post_like',
                    message: `liked your update.`,
                    link: `/feed#${postToLike.id}`,
                    read: false,
                    actorId: user.uid,
                    actorName: user.displayName || 'An expert',
                    actorPhotoUrl: user.photoURL || '',
                    createdAt: serverTimestamp(),
                });
            }
        } catch (error) {
            console.error('Error updating like:', error);
            if ((error as any).name !== 'FirebaseError') {
                 toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not update like status. Please try again.',
                });
            }
        }
    };

    const handleEditPost = (postToEdit: Post) => {
        setEditingPostId(postToEdit.id);
        setEditedPostContent(postToEdit.content);
    };

    const handleCancelEdit = () => {
        setEditingPostId(null);
        setEditedPostContent('');
    };

    const handleUpdatePost = async () => {
        if (!firestore || !editingPostId) return;
        
        const postDocRef = doc(firestore, 'posts', editingPostId);
        try {
            await updateDocumentNonBlocking(postDocRef, { content: editedPostContent });
            toast({ title: 'Post updated' });
            handleCancelEdit();
        } catch (error) {
             if ((error as any).name !== 'FirebaseError') {
                toast({ variant: 'destructive', title: 'Failed to update post.' });
            }
        }
    };
    
    const handleDeletePost = () => {
        if (!firestore) return;
        const postDocRef = doc(firestore, 'posts', post.id);
        deleteDocumentNonBlocking(postDocRef).then(() => {
            setPosts(prevPosts => prevPosts.filter(p => p.id !== post.id));
            toast({
                title: "Post Deleted",
                description: "The post has been successfully removed.",
            });
        }).catch(error => {
            if ((error as any).name !== 'FirebaseError') {
                toast({
                    variant: "destructive",
                    title: "Deletion Failed",
                    description: "Could not delete the post. Please try again.",
                });
            }
        });
        setIsPostDeleteDialogOpen(false);
    }
    
    const handleToggleFollow = async () => {
        if (!currentUserDocRef || !author) return;

        try {
            const isFollowing = currentUserProfile?.following?.includes(author.id);
            const updateAction = isFollowing ? arrayRemove(author.id) : arrayUnion(author.id);
            await updateDocumentNonBlocking(currentUserDocRef, { following: updateAction });
            toast({
                title: isFollowing ? 'Unfollowed' : 'Followed',
                description: `You are now ${isFollowing ? 'no longer following' : 'following'} ${author.firstName} ${author.lastName}.`,
            });
        } catch (error) {
            console.error("Failed to toggle follow", error);
            if ((error as any).name !== 'FirebaseError') {
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not update your follow status.' });
            }
        }
    }
    
    const hasLiked = user ? post.likes?.includes(user.uid) : false;
    const canEdit = user && user.uid === post.authorId;
    const canDelete = canEdit || isSuperAdmin;
    const isEditingThisPost = editingPostId === post.id;
    const canViewLikes = post.likes && post.likes.length > 0;
    
    const combinedContentForRender = post.link ? `${post.content}\n${post.link}` : post.content;
    const isFollowing = user && author && currentUserProfile?.following?.includes(author.id);
    const canFollow = user && user.uid !== post.authorId;
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={`/expert/${post.authorId}`}>
                            <Avatar>
                                <AvatarImage src={author?.photoUrl} />
                                <AvatarFallback>{getInitials(author?.firstName, author?.lastName)}</AvatarFallback>
                            </Avatar>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <Link href={`/expert/${post.authorId}`} className="hover:underline">
                                    <p className="font-semibold">{author?.firstName} {author?.lastName}</p>
                                </Link>
                                {isAuthorLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : <>
                                    {author?.verified && <UserCheck className="h-4 w-4 text-green-500"/>}
                                    {author?.tier === 'Premier' && <Crown className="h-4 w-4 text-purple-500"/>}
                                    {author?.tier === 'Super Premier' && <Sparkles className="h-4 w-4 text-blue-500"/>}
                                </>}
                            </div>
                            <CardDescription className="text-xs flex items-center gap-2">
                                <span>{post.createdAt ? `${formatDistanceToNowStrict(post.createdAt.toDate())} ago` : '...'}</span>
                                {canFollow && (
                                     <>
                                        <span className="text-muted-foreground/50">•</span>
                                        <button onClick={handleToggleFollow} className="text-primary hover:underline font-semibold">
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    </>
                                )}
                            </CardDescription>
                            <div className="flex items-center gap-2 mt-2">
                              {isAuthorLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>
                                  {author?.portfolioUrl && <a href={author.portfolioUrl} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4 text-muted-foreground hover:text-primary"/></a>}
                                  {author?.facebookUrl && <a href={author.facebookUrl} target="_blank" rel="noopener noreferrer"><Icons.logo className="h-4 w-4 text-muted-foreground hover:text-primary"/></a>}
                                  {author?.instagramUrl && <a href={author.instagramUrl} target="_blank" rel="noopener noreferrer"><Icons.logo className="h-4 w-4 text-muted-foreground hover:text-primary"/></a>}
                                  {author?.youtubeUrl && <a href={author.youtubeUrl} target="_blank" rel="noopener noreferrer"><Youtube className="h-4 w-4 text-muted-foreground hover:text-primary"/></a>}
                                  {author?.linkedinUrl && <a href={author.linkedinUrl} target="_blank" rel="noopener noreferrer"><Linkedin className="h-4 w-4 text-muted-foreground hover:text-primary"/></a>}
                                  {author?.twitterUrl && <a href={author.twitterUrl} target="_blank" rel="noopener noreferrer"><Twitter className="h-4 w-4 text-muted-foreground hover:text-primary"/></a>}
                                  {author?.githubUrl && <a href={author.githubUrl} target="_blank" rel="noopener noreferrer"><Github className="h-4 w-4 text-muted-foreground hover:text-primary"/></a>}
                              </>}
                            </div>
                        </div>
                    </div>
                     {(canEdit || canDelete) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {canEdit && (
                                    <DropdownMenuItem onClick={() => handleEditPost(post)}>
                                        <Pen className="mr-2 h-4 w-4" />
                                        <span>Edit</span>
                                    </DropdownMenuItem>
                                )}
                                {canDelete && (
                                    <DropdownMenuItem onClick={() => setIsPostDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                 {post.title && (
                    <CardTitle className="pt-4 text-lg">{post.title}</CardTitle>
                )}
            </CardHeader>
            <CardContent>
                {isEditingThisPost ? (
                    <div className="space-y-2">
                        <Textarea
                            value={editedPostContent}
                            onChange={(e) => setEditedPostContent(e.target.value)}
                            className="text-sm whitespace-pre-wrap mb-4"
                            rows={4}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                            <Button size="sm" onClick={handleUpdatePost}>Save Changes</Button>
                        </div>
                    </div>
                ) : (
                    <PostContentRenderer content={combinedContentForRender} />
                )}

                {post.imageUrl && !isEditingThisPost && (
                    <ImageLightbox images={[post.imageUrl]} altText={`Post image from ${author?.firstName}`}>
                        <div className="relative rounded-lg overflow-hidden border aspect-video cursor-pointer">
                            <Image
                                src={post.imageUrl}
                                alt={`Post image from ${author?.firstName}`}
                                fill
                                className="object-cover"
                            />
                        </div>
                    </ImageLightbox>
                )}
            </CardContent>
            <CardFooter className="flex-col items-start">
                <div className="flex items-center gap-2 w-full">
                    <Button variant="ghost" size="sm" onClick={() => handleLike(post)} className={cn("text-muted-foreground hover:text-foreground flex items-center", hasLiked && "text-red-500")}>
                        <Heart className={cn("mr-2 h-4 w-4", hasLiked && "fill-red-500")} />
                        Like
                        {canViewLikes && (
                            <LikesDialog userIds={post.likes!}>
                                <span className="text-xs text-muted-foreground hover:underline ml-1">({post.likes?.length})</span>
                            </LikesDialog>
                        )}
                    </Button>

                    <ShareDialog shareDetails={{ type: 'expert-profile', expertId: post.authorId, expertName: `${author?.firstName} ${author?.lastName}` }}>
                        <Button variant="ghost" size="sm">
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                        </Button>
                    </ShareDialog>
                </div>
                <CommentsSection postId={post.id} postAuthorId={post.authorId} />
            </CardFooter>
             <AlertDialog open={isPostDeleteDialogOpen} onOpenChange={setIsPostDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this post and all its comments.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
        </Card>
    )
}

function FeedContent() {
    const firestore = useFirestore();
    const searchParams = useSearchParams();
    const { isUserLoading } = useUser();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const authorIdFilter = searchParams.get('authorId');

    useEffect(() => {
        if (!firestore) return;

        const fetchInitialPosts = async () => {
            setIsLoadingPosts(true);
            const constraints: QueryConstraint[] = [
                orderBy('createdAt', 'desc'),
                limit(POSTS_PER_PAGE)
            ];

            if (authorIdFilter) {
                constraints.unshift(where('authorId', '==', authorIdFilter));
            }

            const firstBatch = query(collection(firestore, 'posts'), ...constraints);
            
            const unsubscribe = onSnapshot(firstBatch, (documentSnapshots) => {
                const newPosts = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
                const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];

                setPosts(newPosts);
                setLastVisible(lastDoc);
                setHasMore(documentSnapshots.docs.length === POSTS_PER_PAGE);
                setIsLoadingPosts(false);
            }, (error) => {
                console.error("Error fetching initial posts:", error);
                setIsLoadingPosts(false);
            });
            
            return () => unsubscribe();
        };

        fetchInitialPosts();
    }, [firestore, authorIdFilter]);
    
    const loadMorePosts = async () => {
        if (!firestore || !lastVisible || !hasMore) return;

        setIsLoadingMore(true);
        const constraints: QueryConstraint[] = [
            orderBy('createdAt', 'desc'),
            startAfter(lastVisible),
            limit(POSTS_PER_PAGE)
        ];

        if (authorIdFilter) {
            constraints.unshift(where('authorId', '==', authorIdFilter));
        }

        const nextBatch = query(collection(firestore, 'posts'), ...constraints);
        const documentSnapshots = await getDocs(nextBatch);
        
        const newPosts = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];

        setPosts(prevPosts => [...prevPosts, ...newPosts]);
        setLastVisible(lastDoc);
        setHasMore(documentSnapshots.docs.length === POSTS_PER_PAGE);
        setIsLoadingMore(false);
    };


    const filteredPosts = useMemo(() => {
        if (!posts) return [];
        if (!searchQuery) return posts;

        const lowercasedQuery = searchQuery.toLowerCase();
        return posts.filter(post => 
            post.content.toLowerCase().includes(lowercasedQuery)
        );
    }, [posts, searchQuery]);
    
    const isLoading = isUserLoading || isLoadingPosts;
    
    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading public feed...</p>
            </div>
        );
    }
    
    if (posts.length === 0) {
        return (
            <div className="text-center py-16">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">The Feed is Empty</CardTitle>
                        <CardDescription>
                            {authorIdFilter ? "This expert hasn't posted anything yet." : "No posts have been made yet. Be the first!"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard">
                                <Rss className="mr-2 h-4 w-4" /> Go to Dashboard
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <div className="mb-6 w-full">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search feed by content..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="space-y-6">
                {filteredPosts.map(post => <PostCard key={post.id} post={post} />)}

                {hasMore && !searchQuery && (
                    <div className="flex justify-center mt-6">
                        <Button onClick={loadMorePosts} disabled={isLoadingMore} variant="outline">
                            {isLoadingMore ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                "Load More"
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}

function FeedPageHeader() {
    const searchParams = useSearchParams();
    const authorId = searchParams.get('authorId');
    const firestore = useFirestore();

    const authorDocRef = useMemoFirebase(() => {
        if (!firestore || !authorId) return null;
        return doc(firestore, 'users', authorId);
    }, [firestore, authorId]);
    const { data: author, isLoading } = useDoc<UserProfile>(authorDocRef);

    if (authorId) {
        return (
            <div className="flex items-center justify-center gap-3 mb-4">
                <Rss className="h-10 w-10 text-primary" />
                <div>
                     <h1 className="text-4xl sm:text-5xl font-bold">
                        {isLoading ? "Loading..." : author ? `${author.firstName}'s Posts` : "Expert's Posts"}
                    </h1>
                     <Button variant="link" asChild className="p-0 h-auto">
                        <Link href={`/expert/${authorId}`}>
                             <ChevronLeft className="mr-1 h-3 w-3"/>
                             Back to Profile
                        </Link>
                     </Button>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="flex items-center justify-center gap-3 mb-4">
                <Rss className="h-10 w-10 text-primary" />
                <h1 className="text-4xl sm:text-5xl font-bold">Public Feed</h1>
            </div>
            <p className="text-muted-foreground">Updates from all experts and companies on the platform.</p>
        </>
    )
}

function FeedPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-2xl">
                <header className="pb-8 text-center">
                    <FeedPageHeader />
                </header>
                <main>
                    <FeedContent />
                </main>
            </div>
        </div>
    )
}

export default function FeedPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Loading Feed...</p>
      </div>
    }>
        <FeedPage />
    </Suspense>
  );
}
