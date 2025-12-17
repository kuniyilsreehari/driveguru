"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Review = {
  id: string;
  comment: string;
  reviewerName: string;
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
        const querySnapshot = await getDocs(collection(firestore, "reviews"));
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
    return <p>Loading reviews...</p>;
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
                <CardTitle>Review by {r.reviewerName}</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{r.comment}</p>
            </CardContent>
          </Card>
        ))
      ) : (
        <p>No reviews found.</p>
      )}
    </div>
  );
}
