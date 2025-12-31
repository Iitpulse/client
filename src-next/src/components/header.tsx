"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { LogOut, User } from "lucide-react";

export function Header() {
  const router = useRouter();
  const { currentUser, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold">
          {currentUser?.userType === "student" ? "Student Dashboard" : "Admin Dashboard"}
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {currentUser && (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {getInitials(currentUser.name || currentUser.email || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-medium">
                {currentUser.name || currentUser.email}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {currentUser.userType}
              </p>
            </div>
          </div>
        )}

        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
