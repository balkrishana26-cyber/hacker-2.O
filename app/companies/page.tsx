"use client";

import { Header } from "@/components/header";
import { Building, Globe, Users, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CompaniesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Partner Companies</h1>
          <p className="text-muted-foreground">Explore companies that post internships on TalentBridge</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="h-14 w-14 rounded-md bg-primary/20 flex items-center justify-center mb-2">
                  <Building className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>{
                  i % 3 === 0 ? "TechCorp Solutions" : 
                  i % 3 === 1 ? "InnovateTech" : 
                  "DevWorks Inc"
                }</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" /> 
                  {i % 3 === 0 ? "Technology" : i % 3 === 1 ? "Software" : "IT Services"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  {i % 4 === 0 ? "Bangalore" : i % 4 === 1 ? "Mumbai" : i % 4 === 2 ? "Delhi" : "Remote"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Users className="h-4 w-4" />
                  {i * 50}-{i * 100} employees
                </div>
                {/* Openings temporarily hidden — re-enable when feature is ready */}
                <Button className="w-full" disabled>
                  Openings hidden
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}