

'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, orderBy, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ChevronLeft, Rss, Search, Heart, Share2, MoreHorizontal, Trash2, Send, LogIn, MessageSquareReply, MessageSquare, Pen } from 'lucide-react';
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


type Post = {
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
}

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
                                <div className="flex items-center">
                                    <button onClick={handleLikeComment} className="hover:underline flex items-center gap-1">
                                        <Heart className={cn("h-3 w-3", hasLiked && "fill-red-500 text-red-500")} />
                                        <span>Like</span>
                                    </button>
                                    {comment.likes && comment.likes.length > 0 && (
                                        <span className="ml-1">{comment.likes.length}</span>
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
                            <CommentThread key={reply.id} comment={reply} postId={postId} allComments={allComments} onDelete={onDelete} postAuthorId={postAuthorId} />
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

function FeedContent() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [isPostDeleteDialogOpen, setIsPostDeleteDialogOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editedPostContent, setEditedPostContent] = useState('');
    
    const superAdminDocRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'roles_super_admin', user.uid);
    }, [firestore, user]);

    const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);
    const isSuperAdmin = !!superAdminData;


    const postsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'posts'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore]);

    const { data: posts, isLoading: isLoadingPosts } = useCollection<Post>(postsQuery);

    const handleLike = async (post: Post) => {
        if (!user || !firestore) {
            toast({
                variant: 'destructive',
                title: 'Authentication Required',
                description: 'You must be logged in to like a post.',
            });
            return;
        }

        const postRef = doc(firestore, 'posts', post.id);
        const hasLiked = post.likes?.includes(user.uid);
        const updateAction = hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid);

        try {
            await updateDoc(postRef, {
                likes: updateAction,
            });
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

    const handleEditPost = (post: Post) => {
        setEditingPostId(post.id);
        setEditedPostContent(post.content);
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

    const openDeleteDialog = (post: Post) => {
        setSelectedPost(post);
        setIsPostDeleteDialogOpen(true);
    }
    
    const handleDeletePost = () => {
        if (!selectedPost || !firestore) return;
        const postDocRef = doc(firestore, 'posts', selectedPost.id);
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


    const isLoading = isUserLoading || isLoadingPosts || isRoleLoading;
    
    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading public feed...</p>
            </div>
        );
    }
    
    if (!posts || posts.length === 0) {
        return (
            <div className="text-center py-16">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">The Feed is Empty</CardTitle>
                        <CardDescription>No posts have been made yet. Be the first!</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard">
                                <Search className="mr-2 h-4 w-4" /> Go to Dashboard
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {posts.map(post => {
                    const hasLiked = user ? post.likes?.includes(user.uid) : false;
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
                                                {post.createdAt ? `${formatDistanceToNowStrict(post.createdAt.toDate(), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")} ago` : '...'}
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
                                    <p className="text-sm whitespace-pre-wrap mb-4">{post.content}</p>
                                )}

                                {post.imageUrl && !isEditingThisPost && (
                                    <div className="relative rounded-lg overflow-hidden border aspect-video">
                                        <Image
                                            src={post.imageUrl}
                                            alt={`Post image from ${post.authorName}`}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex-col items-start">
                                <div className="flex items-center gap-2 w-full">
                                    <Button variant="ghost" size="sm" onClick={() => handleLike(post)}>
                                        <Heart className={cn("mr-2 h-4 w-4", hasLiked && "fill-red-500 text-red-500")} />
                                        Like
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                        {post.likes?.length || 0} {post.likes?.length === 1 ? 'like' : 'likes'}
                                    </span>
                                    <ShareDialog expertId={post.authorId} expertName={post.authorName}>
                                        <Button variant="ghost" size="sm">
                                            <Share2 className="mr-2 h-4 w-4" />
                                            Share
                                        </Button>
                                    </ShareDialog>
                                </div>
                                <CommentsSection postId={post.id} postAuthorId={post.authorId} />
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
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
        </>
    );
}

export default function FeedPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-2xl">
                <header className="pb-8 text-center">
                     <div className="flex items-center justify-center gap-3 mb-4">
                        <Rss className="h-10 w-10 text-primary" />
                        <h1 className="text-4xl sm:text-5xl font-bold">Public Feed</h1>
                    </div>
                    <p className="text-muted-foreground">Updates from all experts and companies on the platform.</p>
                </header>
                <main>
                    <div className="mb-6">
                        <Button variant="outline" asChild>
                            <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                        </Button>
                    </div>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }>
                        <FeedContent />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
