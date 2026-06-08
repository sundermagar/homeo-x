import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, PhoneCall, MessageSquare, ChevronRight, CheckCircle, CreditCard } from 'lucide-react';

export default function NewConsultationPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const consultationTypes = [
    {
      id: 'video',
      title: 'Video Consultation',
      icon: <Video className="h-6 w-6" />,
      description: 'Face-to-face online consultation with the doctor.',
      price: '₹500',
    },
    {
      id: 'audio',
      title: 'Audio Consultation',
      icon: <PhoneCall className="h-6 w-6" />,
      description: 'Consult via a phone call at your convenience.',
      price: '₹400',
    },
    {
      id: 'questions',
      title: 'Text / Questions',
      icon: <MessageSquare className="h-6 w-6" />,
      description: 'Submit your health questionnaire online.',
      price: '₹300',
    },
  ];

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto flex flex-col min-h-[80vh]">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary mb-3">New Case — Online Consultation</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Start your homeopathic treatment journey. Choose how you would like to consult with our specialists.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex-1">
        {step === 1 && (
          <div className="fade-in space-y-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">Select Consultation Type</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {consultationTypes.map((type) => (
                <Card 
                  key={type.id}
                  className={`cursor-pointer transition-all border-2 ${
                    selectedType === type.id 
                      ? 'border-primary bg-primary/5 shadow-md scale-105' 
                      : 'border-transparent hover:border-slate-200'
                  }`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <CardContent className="p-6 text-center flex flex-col items-center h-full">
                    <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-4 ${
                      selectedType === type.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {type.icon}
                    </div>
                    <h3 className="text-lg font-bold mb-2">{type.title}</h3>
                    <p className="text-sm text-slate-500 mb-4 flex-1">{type.description}</p>
                    <div className="font-bold text-xl text-primary">{type.price}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-10 flex justify-end">
              <Button 
                onClick={() => setStep(2)}
                disabled={!selectedType}
                className="px-8 py-6 text-lg rounded-xl"
              >
                Proceed to Payment <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in max-w-md mx-auto space-y-6 text-center py-10">
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <CreditCard className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Complete Payment</h2>
            <p className="text-slate-500">
              You selected {consultationTypes.find(t => t.id === selectedType)?.title}. 
              Please complete the payment of {consultationTypes.find(t => t.id === selectedType)?.price} to proceed.
            </p>
            
            <div className="pt-6 space-y-4">
              <Button 
                onClick={() => setStep(3)}
                className="w-full py-6 text-lg rounded-xl bg-emerald-600 hover:bg-emerald-700"
              >
                Pay Now (Razorpay Mock)
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setStep(1)}
                className="w-full"
              >
                Go Back
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in max-w-md mx-auto space-y-6 text-center py-10">
            <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Payment Confirmed!</h2>
            <p className="text-slate-500 mb-8">
              Your payment was successful. Let's proceed to the next step.
            </p>
            
            <Button 
              onClick={() => {
                if (selectedType === 'questions') {
                  alert('Opening Health Questionnaire Form...');
                } else {
                  alert('Opening Vitals / Report Upload and Calendar...');
                }
              }}
              className="w-full py-6 text-lg rounded-xl"
            >
              Continue to {selectedType === 'questions' ? 'Questionnaire' : 'Booking'} <ChevronRight className="ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
