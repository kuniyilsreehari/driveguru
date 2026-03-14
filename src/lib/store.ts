
import { atom } from 'jotai';

export type ExpertUser = {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    phoneNumber?: string;
    verified?: boolean;
};

export const installPromptAtom = atom<Event | null>(null);
export const chatOpenAtom = atom<boolean>(false);
export const installDialogOpenAtom = atom<boolean>(false);
export const currentExpertAtom = atom<ExpertUser | null>(null);
