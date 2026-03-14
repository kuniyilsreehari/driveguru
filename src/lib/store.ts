
import { atom } from 'jotai';

export const installPromptAtom = atom<Event | null>(null);
export const chatOpenAtom = atom<boolean>(false);
export const installDialogOpenAtom = atom<boolean>(false);
