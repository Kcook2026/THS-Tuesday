import React from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AuthStatusScreen({ 
  status = "loading", 
  title, 
  description, 
  onRetry, 
  onLogout,
  showActions = false 
}) {
  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-12 h-12 text-green-500" />;
      case "error":
        return <AlertCircle className="w-12 h-12 text-destructive" />;
      default:
        return <Loader2 className="w-12 h-12 text-primary animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "border-green-200 bg-green-50";
      case "error":
        return "border-destructive/20 bg-destructive/5";
      default:
        return "border-primary/20 bg-primary/5";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <Card className={`w-full max-w-md border-2 shadow-lg ${getStatusColor()}`}>
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4">{getStatusIcon()}</div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          {description && (
            <CardDescription className="text-base mt-2">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        {showActions && (
          <CardContent className="space-y-3 pt-0">
            {onRetry && (
              <Button onClick={onRetry} className="w-full h-12">
                Try Again
              </Button>
            )}
            {onLogout && (
              <Button onClick={onLogout} variant="outline" className="w-full h-12">
                Sign Out
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}