"use client";

import { useState } from "react";
import { NavigationDashboard } from "../../components/dashboard/common/Sidebar";
import { TopBar } from "@/components/dashboard/common/TopBar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="font-poppins">
        <NavigationDashboard
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <div className="lg:pl-72">
          <TopBar setSidebarOpen={setSidebarOpen} />

          <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
