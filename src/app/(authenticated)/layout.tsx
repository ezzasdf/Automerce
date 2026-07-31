"use client";

import { Suspense } from "react";
import { AppSidebar } from "@/components/AppSidebar";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Suspense fallback={<div style={{ width: "240px" }} />}>
        <AppSidebar />
      </Suspense>
      <div style={{ flex: 1, padding: "0" }}>{children}</div>
    </div>
  );
}
