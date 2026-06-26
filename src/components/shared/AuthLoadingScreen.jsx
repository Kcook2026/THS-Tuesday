import React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AuthLoadingScreen({ message = "Signing you in..." }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardContent className="flex flex-col items-center py-12">
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <Loader2 className="w-12 h-12 text-primary animate-spin relative" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-foreground">
            {message}
          </h2>
          <p className="text-sm text-muted-foreground text-center">
            Please wait while we set things up for you
          </p>
          <div className="mt-8 flex gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}