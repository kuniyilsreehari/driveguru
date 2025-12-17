import ReviewsClient from "@/components/ReviewsClient";

export default function ReviewViewAllPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">All Reviews</h1>
      <ReviewsClient />
    </div>
  );
}
