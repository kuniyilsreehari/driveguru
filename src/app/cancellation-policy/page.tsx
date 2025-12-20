
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, FileText } from 'lucide-react';

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
                <FileText className="h-10 w-10 text-primary" />
                <h1 className="text-4xl sm:text-5xl font-bold">Cancellation &amp; Refund Policy</h1>
            </div>
            <p className="text-muted-foreground">Last updated on 20-12-2025 21:44:58</p>
        </div>
        
        <div className="mb-6">
            <Button variant="outline" asChild>
                <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
            </Button>
        </div>

        <Card>
            <CardContent className="p-6 md:p-8 space-y-6 text-muted-foreground">
                <p>
                    calicut information technology believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. Under this policy:
                </p>
                <ul className="space-y-4 list-disc pl-6">
                    <li>Cancellations will be considered only if the request is made immediately after placing the order. However, the cancellation request may not be entertained if the orders have been communicated to the vendors/merchants and they have initiated the process of shipping them.</li>
                    <li>calicut information technology does not accept cancellation requests for perishable items like flowers, eatables etc. However, refund/replacement can be made if the customer establishes that the quality of product delivered is not good.</li>
                    <li>In case of receipt of damaged or defective items please report the same to our Customer Service team. The request will, however, be entertained once the merchant has checked and determined the same at his own end. This should be reported within 2 Days days of receipt of the products. In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our customer service within 2 Days days of receiving the product. The Customer Service Team after looking into your complaint will take an appropriate decision.</li>
                    <li>In case of complaints regarding products that come with a warranty from manufacturers, please refer the issue to them. In case of any Refunds approved by the calicut information technology, it’ll take 1-2 Days days for the refund to be processed to the end customer.</li>
                </ul>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
