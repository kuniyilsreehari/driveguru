

'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { collection, query, orderBy, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, addDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChevronLeft, Users, Rss, UserPlus, UserMinus, Hash, Edit, Send, MoreHorizontal, Trash2, Pen, Heart, Share2, LogIn, MessageSquareReply, MessageSquare, Upload, Image as ImageIcon, X, Search } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import type { Group } from '@/app/groups/page';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PostForm } from '@/components/post-form';
import { LikesDialog } from '@/components/likes-dialog';
import { ImageLightbox } from '@/components/image-lightbox';
import { ShareDialog } from '@/components/share-dialog';

type GroupPost = {
    id: string;
    authorId: string;
    authorName: string;
    authorPhotoUrl?: string;
    content: string;
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
    profession?: string;
}

const editGroupSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters.').max(50, 'Group name cannot exceed 50 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(250, 'Description cannot exceed 250 characters.'),
});

const postFormSchema = z.object({
  content: z.string().min(2, 'Post must be at least 2 characters.').max(500, 'Post cannot exceed 500 characters.'),
});

const commentFormSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty.'),
});


function getInitials(name?: string | null) {
    if (!name) return 'AN';
    const names = name.trim().split(' ').filter(Boolean);
    if (names.length > 1 && names[names.length - 1]) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
    }
    if (names[0] && names[0].length > 1) {
        return names[0].substring(0, 2).toUpperCase();
    }
    return names[0] ? names[0].charAt(0).toUpperCase() : 'U';
}

const PostContentRenderer = ({ content }: { content: string }) => {
    const youtubeRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11}))/;
    const match = content.match(youtubeRegex);

    if (match) {
        const videoId = match[2];
        const parts = content.split(match[0]);
        
        return (
            <div className="text-sm whitespace-pre-wrap mb-4">
                <span>{parts[0]}</span>
                <div className="aspect-video rounded-lg overflow-hidden border my-4">
                    <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
                <a href={match[0]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{match[0]}</a>
                <span>{parts[1]}</span>
            </div>
        );
    }

    return <p className="text-sm whitespace-pre-wrap mb-4">{content}</p>;
};

function CommenterInfo({ authorId }: { authorId: string }) {
    const firestore = useFirestore();
    const commenterDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'users', authorId);
    }, [firestore, authorId]);
    
    const { data: commenter, isLoading } = useDoc<UserProfile>(commenterDocRef);

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
    const displayInitials = getInitials(displayName);

    return (
        <div className="flex items-center gap-3">
            <Link href={`/expert/${authorId}`}>
                <Avatar className="h-8 w-8">
                    <AvatarImage src={commenter.photoUrl} />
                    <AvatarFallback>{displayInitials}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1">
                <Link href={`/expert/${authorId}`} className="hover:underline">
                    <p className="text-sm font-semibold">{displayName}</p>
                </Link>
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
                                <div className="flex items-center gap-2">
                                    <button onClick={handleLikeComment} className="hover:underline flex items-center gap-1">
                                        <Heart className={cn("h-3 w-3", hasLiked && "fill-red-500 text-red-500")} />
                                        <span>Like</span>
                                    </button>
                                     {canViewLikes ? (
                                        <LikesDialog userIds={comment.likes!}>
                                            <button className="text-xs text-muted-foreground hover:underline">
                                                {comment.likes?.length || 0}
                                            </button>
                                        </LikesDialog>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">
                                            {comment.likes?.length || 0}
                                        </span>
                                    )}
                                </div>
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
                            <CommentThread key={reply.id} comment={reply} postId={postId} allComments={allComments || []} onDelete={onDelete} postAuthorId={postAuthorId} />
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

function GroupHeader({ group, onMembershipChange }: { group: Group, onMembershipChange: () => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const isMember = user ? group.members.includes(user.uid) : false;
    const isCreator = user ? group.creatorId === user.uid : false;
    
    const form = useForm<z.infer<typeof editGroupSchema>>({
        resolver: zodResolver(editGroupSchema),
        defaultValues: {
            name: group.name,
            description: group.description,
        },
    });
    
    const handleToggleMembership = async () => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'You must be logged in.' });
            return;
        }

        setIsSubmitting(true);
        const groupDocRef = doc(firestore, 'groups', group.id);
        const userDocRef = doc(firestore, 'users', user.uid);
        
        try {
            const groupUpdateAction = isMember ? arrayRemove(user.uid) : arrayUnion(user.uid);
            const userUpdateAction = isMember ? arrayRemove(group.id) : arrayUnion(group.id);

            await Promise.all([
                updateDoc(groupDocRef, { members: groupUpdateAction }),
                updateDoc(userDocRef, { groups: userUpdateAction })
            ]);
            
            toast({
                title: isMember ? 'Left Group' : 'Joined Group',
                description: `You are now ${isMember ? 'no longer' : ''} a member of ${group.name}.`,
            });
            onMembershipChange();
        } catch (error) {
            console.error("Error toggling group membership:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update your membership.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const onEditSubmit = async (values: z.infer<typeof editGroupSchema>) => {
        if (!firestore) return;
        setIsSubmitting(true);
        const groupDocRef = doc(firestore, 'groups', group.id);
        
        try {
            await updateDocumentNonBlocking(groupDocRef, {
                name: values.name,
                description: values.description,
            });
            toast({ title: "Group Updated", description: "Your group details have been saved." });
            setIsEditOpen(false);
        } catch (error) {
            if ((error as any).name !== 'FirebaseError') {
                 toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save group details.' });
            }
        } finally {
             setIsSubmitting(false);
        }
    };
    
    return (
        <Card className="mb-8">
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                           <Hash className="h-10 w-10 text-primary" />
                           <h1 className="text-4xl sm:text-5xl font-bold">{group.name}</h1>
                        </div>
                        <p className="text-muted-foreground">{group.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isCreator && (
                             <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <Edit className="mr-2 h-4 w-4"/> Edit Group
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Edit Group Details</DialogTitle>
                                        <DialogDescription>Update the name and description for your group.</DialogDescription>
                                    </DialogHeader>
                                     <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Group Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g., React Developers India" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="description"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Group Description</FormLabel>
                                                        <FormControl>
                                                            <Textarea placeholder="What is this group about?" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <DialogFooter>
                                                <Button type="submit" disabled={isSubmitting}>
                                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        )}
                        {user && !isCreator && (
                            <Button onClick={handleToggleMembership} disabled={isSubmitting}>
                               {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : isMember ? <UserMinus className="mr-2 h-4 w-4"/> : <UserPlus className="mr-2 h-4 w-4"/> }
                               {isMember ? 'Leave Group' : 'Join Group'}
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardFooter>
                 <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{group.members.length} {group.members.length === 1 ? 'member' : 'members'}</span>
                </div>
            </CardFooter>
        </Card>
    );
}

function GroupFeed({ group }: { group: Group }) {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPostDeleteDialogOpen, setIsPostDeleteDialogOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<GroupPost | null>(null);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editedPostContent, setEditedPostContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const isMember = user ? group.members.includes(user.uid) : false;

    const postsQuery = useMemoFirebase(() => {
        if (!firestore || !isMember) return null; // Don't fetch if not a member
        return query(collection(firestore, 'groups', group.id, 'posts'), orderBy('createdAt', 'desc'));
    }, [firestore, group.id, isMember]);

    const { data: posts, isLoading } = useCollection<GroupPost>(postsQuery);

    const currentUserDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: currentUserProfile, isLoading: isCurrentUserProfileLoading } = useDoc<UserProfile>(currentUserDocRef);
    
    const superAdminDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'roles_super_admin', user.uid);
    }, [firestore, user]);
    const { data: superAdminData } = useDoc(superAdminDocRef);
    const isSuperAdmin = !!superAdminData;
    
    const filteredPosts = useMemo(() => {
        if (!posts) return [];
        if (!searchQuery) return posts;

        const lowercasedQuery = searchQuery.toLowerCase();
        return posts.filter(post => 
            post.content.toLowerCase().includes(lowercasedQuery) ||
            post.authorName.toLowerCase().includes(lowercasedQuery)
        );
    }, [posts, searchQuery]);

    const postForm = useForm<z.infer<typeof postFormSchema>>({
        resolver: zodResolver(postFormSchema),
        defaultValues: {
            content: '',
        },
        mode: 'onChange',
    });

    async function onPostSubmit(values: z.infer<typeof postFormSchema>) {
        if (!firestore || !user || !currentUserProfile) return;

        setIsSubmitting(true);
        try {
            const postsCollectionRef = collection(firestore, 'groups', group.id, 'posts');
            
            await addDocumentNonBlocking(postsCollectionRef, {
                content: values.content,
                authorId: user.uid,
                authorName: `${currentUserProfile.firstName || ''} ${currentUserProfile.lastName || ''}`.trim(),
                authorPhotoUrl: currentUserProfile.photoUrl || '',
                createdAt: serverTimestamp(),
                likes: [],
                groupId: group.id,
                imageUrl: '',
            });

            toast({
                title: 'Post Published!',
                description: 'Your update is now live in the group feed.',
            });
            postForm.reset();
        } catch (error) {
            console.error("Error creating post:", error);
             if ((error as any).name !== 'FirebaseError') {
                toast({
                    variant: 'destructive',
                    title: 'Failed to Post',
                    description: 'An unexpected error occurred. Please try again.',
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const openDeleteDialog = (post: GroupPost) => {
        setSelectedPost(post);
        setIsPostDeleteDialogOpen(true);
    }
    
    const handleDeletePost = () => {
        if (!selectedPost || !firestore) return;
        const postDocRef = doc(firestore, 'groups', group.id, 'posts', selectedPost.id);
        deleteDocumentNonBlocking(postDocRef).then(() => {
            toast({
                title: "Post Deleted",
                description: "The post has been successfully removed.",
            });
        }).catch(error => {
            if ((error as any).name !== 'FirebaseError') {
                toast({
                    variant: 'destructive',
                    title: "Deletion Failed",
                    description: "Could not delete the post. Please try again.",
                });
            }
        });
        setIsPostDeleteDialogOpen(false);
        setSelectedPost(null);
    }

    const handleEditPost = (post: GroupPost) => {
        setEditingPostId(post.id);
        setEditedPostContent(post.content);
    };

    const handleCancelEdit = () => {
        setEditingPostId(null);
        setEditedPostContent('');
    };

    const handleUpdatePost = async () => {
        if (!firestore || !editingPostId) return;
        
        const postDocRef = doc(firestore, 'groups', group.id, 'posts', editingPostId);
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

    if (isLoading || isUserLoading || isCurrentUserProfileLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading group feed...</p>
            </div>
        );
    }
    
    if (!isMember) {
        return (
            <Card className="text-center p-8">
                <CardTitle>This is a private group.</CardTitle>
                <CardDescription className="mt-2">Join the group to view and participate in discussions.</CardDescription>
            </Card>
        )
    }

    return (
        <>
            <div className="space-y-6">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Rss className="h-6 w-6"/> Group Feed</h2>
                
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search posts..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <PostForm 
                    form={postForm}
                    onSubmit={onPostSubmit}
                    isSubmitting={isSubmitting}
                />

                {filteredPosts && filteredPosts.length > 0 ? (
                    filteredPosts.map(post => {
                        const canEdit = user && user.uid === post.authorId;
                        const canDelete = canEdit || isSuperAdmin;
                        const isEditingThisPost = editingPostId === post.id;
                        return (
                            <Card key={post.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <Link href={`/expert/${post.authorId}`}>
                                                <Avatar>
                                                    <AvatarImage src={post.authorPhotoUrl} />
                                                    <AvatarFallback>{getInitials(post.authorName)}</AvatarFallback>
                                                </Avatar>
                                            </Link>
                                            <div>
                                                <Link href={`/expert/${post.authorId}`} className="hover:underline">
                                                    <CardTitle className="text-base">{post.authorName}</CardTitle>
                                                </Link>
                                                <CardDescription className="text-xs">
                                                    {post.createdAt ? `${formatDistanceToNowStrict(post.createdAt.toDate())} ago` : '...'}
                                                </CardDescription>
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
                                                        <DropdownMenuItem onClick={() => openDeleteDialog(post)} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            <span>Delete</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
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
                                        <PostContentRenderer content={post.content} />
                                    )}

                                    {post.imageUrl && !isEditingThisPost && (
                                        <ImageLightbox imageUrl={post.imageUrl} altText={`Post image from ${post.authorName}`}>
                                            <div className="relative rounded-lg overflow-hidden border aspect-video cursor-pointer">
                                                <Image
                                                    src={post.imageUrl}
                                                    alt={`Post image from ${post.authorName}`}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        </ImageLightbox>
                                    )}
                                </CardContent>
                                <CardFooter className="flex items-center gap-2">
                                    <ShareDialog
                                        shareDetails={{
                                            type: 'group-post',
                                            title: `Post in ${group.name}`,
                                            text: post.content,
                                            url: `${window.location.href}#${post.id}`
                                        }}
                                    >
                                        <Button variant="ghost" size="sm">
                                            <Share2 className="mr-2 h-4 w-4" />
                                            Share
                                        </Button>
                                    </ShareDialog>
                                </CardFooter>
                            </Card>
                        )
                    })
                ) : (
                    <Card className="text-center p-8">
                        <CardTitle>The feed is empty.</CardTitle>
                        <CardDescription className="mt-2">Be the first to post in this group!</CardDescription>
                    </Card>
                )}
            </div>
             <AlertDialog open={isPostDeleteDialogOpen} onOpenChange={setIsPostDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this post.
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
        </>
    );
}

function GroupPageContent() {
    const params = useParams();
    const groupId = params.groupId as string;
    const firestore = useFirestore();

    const groupDocRef = useMemoFirebase(() => {
        if (!firestore || !groupId) return null;
        return doc(firestore, 'groups', groupId);
    }, [firestore, groupId]);

    const { data: group, isLoading, error, mutate } = useDoc<Group>(groupDocRef);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading Group...</p>
            </div>
        );
    }
    
    if (error || !group) {
        return (
            <div className="text-center py-16 text-destructive">
                <h2 className="text-2xl font-semibold">Group Not Found</h2>
                <p className="text-sm mt-2">The group you are looking for does not exist.</p>
                <Button asChild variant="outline" className="mt-4"><Link href="/groups">Back to Groups</Link></Button>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <GroupHeader group={group} onMembershipChange={mutate} />
            <GroupFeed group={group} />
        </div>
    )
}

export default function GroupPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-4xl">
                 <div className="mb-6">
                    <Button variant="outline" asChild>
                        <Link href="/groups"><ChevronLeft className="mr-2 h-4 w-4" /> All Groups</Link>
                    </Button>
                </div>
                <main>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }>
                        <GroupPageContent />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
