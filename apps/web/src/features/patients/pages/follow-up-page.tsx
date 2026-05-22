import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, CloudRain, MapPin, CreditCard, ChevronRight } from 'lucide-react';
import { FollowUpWizard } from '@/features/dashboard/components/follow-up-wizard';

export default function FollowUpPage() {
  const [showWizard, setShowWizard] = useState(false);

  if (showWizard) {
    return (
      <div className="py-6">
        <FollowUpWizard onBack={() => setShowWizard(false)} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-2xl border-none shadow-xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-white to-primary/5 relative">
        {/* Abstract shape background decoration */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-70"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-70"></div>

        <CardContent className="p-10 relative z-10">
          <div className="mb-8">
            <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-primary/20">
              <Stethoscope className="h-8 w-8 text-primary-foreground" />
            </div>
            
            <h1 className="text-3xl font-bold text-primary mb-3">Follow-up / Medicine</h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-md leading-relaxed">
              Update health progress, upload reports, and order repeat medicines online.
            </p>

            <div className="space-y-6 mb-10">
              <div className="flex items-start">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4 shrink-0">
                  <CloudRain className="h-5 w-5 text-primary" />
                </div>
                <div className="pt-2">
                  <p className="text-foreground font-medium">Update complaints & upload reports</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4 shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="pt-2">
                  <p className="text-foreground font-medium">Confirm delivery address</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4 shrink-0">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div className="pt-2">
                  <p className="text-foreground font-medium">Membership benefits auto-applied</p>
                </div>
              </div>
            </div>

            <Button 
              className="group text-base font-semibold px-0" 
              variant="link"
              onClick={() => setShowWizard(true)}
            >
              Start Follow-up Flow 
              <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
