
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Loader2 } from "lucide-react";

type Review = {
  id: string;
  comment: string;
  reviewerName: string;
  expertName: string;
  rating: number;
  // Add other review fields as needed for display
  [key: string]: any;
};

export default function ReviewsClient() {
  const firestore = useFirestore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore) return;

    const fetchReviews = async () => {
      try {
        setLoading(true);
        // Only fetch approved reviews, which is allowed by security rules for all users
        const reviewsQuery = query(collection(firestore, "reviews"), where("status", "==", "approved"));
        const querySnapshot = await getDocs(reviewsQuery);
        const reviewsData = querySnapshot.docs.map(
          (doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            ...doc.data(),
          })
        ) as Review[];
        setReviews(reviewsData);
      } catch (err: any) {
        console.error(err);
        setError("Failed to fetch reviews. Please check console for details.");
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [firestore]);

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading reviews...</div>;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-4">
      {reviews.length > 0 ? (
        reviews.map((r) => (
          <Card key={r.id}>
            <CardHeader>
                <CardTitle>Review for {r.expertName} by {r.reviewerName}</CardTitle>
            </CardHeader>
            <CardContent>
                <p>&quot;{r.comment}&quot;</p>
                <div className="flex items-center gap-1 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`h-4 w-4 ${i < r.rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                    ))}
                </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <p>No approved reviews found.</p>
      )}
    </div>
  );
}
