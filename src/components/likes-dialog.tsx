
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, documentId } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

type UserProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
};

interface LikesDialogProps {
  userIds: string[];
  children: React.ReactNode;
}

function getInitials(firstName?: string, lastName?: string) {
    if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) {
        return firstName.charAt(0).toUpperCase();
    }
    return 'U';
}

export function LikesDialog({ userIds, children }: LikesDialogProps) {
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || userIds.length === 0) return null;
    // Firestore 'in' queries are limited to 30 items.
    // For this app, we'll assume likes won't exceed this, but for a larger app, pagination would be needed here.
    const userIdsToShow = userIds.slice(0, 30);
    return query(collection(firestore, 'users'), where(documentId(), 'in', userIdsToShow));
  }, [firestore, userIds]);

  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Liked By</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {users?.map(user => (
                <Link href={`/expert/${user.id}`} key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                    <Avatar>
                        <AvatarImage src={user.photoUrl} />
                        <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
