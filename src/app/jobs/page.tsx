
'use client';

import { redirect } from 'next/navigation';

export default function JobsPage() {
    // Redirect to the main vacancies page to avoid duplication and use the high-fidelity UI
    redirect('/vacancies');
}
