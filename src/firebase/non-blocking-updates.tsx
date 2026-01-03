

'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
  doc,
  runTransaction,
  increment
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Initiates a setDoc operation for a document reference.
 * It can be awaited by the caller, or used in a fire-and-forget manner.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options?: SetOptions): Promise<void> {
  // Return the promise from setDoc.
  return setDoc(docRef, data, options || {}).catch(error => {
    // On failure, emit a structured permission error.
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: options && 'merge' in options ? 'update' : 'create',
        requestResourceData: data,
      })
    );
    // Re-throw the original error so that if the caller is awaiting, their catch block will trigger.
    throw error;
  });
}


/**
 * Initiates an addDoc operation.
 * Can be used for a collection reference (to get an auto-ID) or a specific document reference.
 * Returns the Promise, which can be awaited or used in a fire-and-forget manner.
 */
export function addDocumentNonBlocking(ref: CollectionReference | DocumentReference, data: any) {
  const promise = (ref.type === 'collection')
    ? addDoc(ref, data)
    : setDoc(ref, data);

  return promise.catch(error => {
      const path = ref.type === 'collection' ? ref.path : (ref as DocumentReference).path;
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: path,
          operation: 'create',
          requestResourceData: data,
        })
      )
  });
}


/**
 * Initiates an updateDoc operation for a document reference.
 * It can be awaited by the caller, or used in a fire-and-forget manner.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any): Promise<void> {
  // Return the promise from updateDoc.
  return updateDoc(docRef, data).catch(error => {
    // On failure, emit a structured permission error.
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      })
    );
    // Re-throw the original error so that if the caller is awaiting, their catch block will trigger.
    throw error;
  });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * It can be awaited by the caller, or used in a fire-and-forget manner.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference): Promise<void> {
  // Return the promise from deleteDoc.
  return deleteDoc(docRef).catch(error => {
    // On failure, emit a structured permission error.
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      })
    );
    // Re-throw the original error so that if the caller is awaiting, their catch block will trigger.
    throw error;
  });
}

    