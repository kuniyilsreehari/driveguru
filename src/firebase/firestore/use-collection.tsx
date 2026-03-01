
'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUser } from '../provider';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

function getPathFromQuery(q: Query): string {
    if ((q as any)._query) {
        // This is a robust way to get the path from a v9 query object
        const internalQuery = (q as any)._query;
        if (internalQuery.path) {
            return internalQuery.path.canonicalString();
        }
    }
    // Fallback for collection references or other query types
    if ((q as any).path) {
        return (q as any).path;
    }
    return 'unknown';
}


/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidance.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const { isUserLoading } = useUser();
  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // Wait until firebase auth is resolved
    if (isUserLoading) {
      setIsLoading(true);
      return;
    }

    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    let unsubscribe: (() => void) | null = null;
    
    try {
        unsubscribe = onSnapshot(
          memoizedTargetRefOrQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            const results: ResultItemType[] = [];
            for (const doc of snapshot.docs) {
              results.push({ ...(doc.data() as T), id: doc.id });
            }
            setData(results);
            setError(null);
            setIsLoading(false);
          },
          (error: FirestoreError) => {
            // Check for permission denied specifically to emit a contextual error
            if (error.code === 'permission-denied') {
                const path = getPathFromQuery(memoizedTargetRefOrQuery);
                const contextualError = new FirestorePermissionError({
                  operation: 'list',
                  path,
                });
                
                setError(contextualError);
                setData([]); // Return empty array on permission error to prevent UI crash
                setIsLoading(false);
        
                // trigger global error propagation
                errorEmitter.emit('permission-error', contextualError);
            } else {
                console.error("Firestore useCollection error:", error);
                setError(error);
                setIsLoading(false);
            }
          }
        );
    } catch(e) {
        console.error("Error setting up onSnapshot listener in useCollection", e);
        setError(e instanceof Error ? e : new Error("An unknown error occurred while setting up the listener."));
        setIsLoading(false);
    }

    return () => {
        if(unsubscribe) {
            unsubscribe();
        }
    }
  }, [memoizedTargetRefOrQuery, isUserLoading]);
  
  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    console.warn('Query was not properly memoized using useMemoFirebase. This can lead to infinite loops.');
  }

  return { data, isLoading, error };
}
