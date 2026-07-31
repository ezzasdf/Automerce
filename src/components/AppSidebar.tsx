"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Navigation,
} from "@shopify/polaris";
import {
  HomeMajor,
  OrderedListMajor,
  ChatMajor,
  CreditCardMajor,
  SettingsMajor,
} from "@shopify/polaris-icons";

const navItems = [
  { label: "Dashboard", url: "/dashboard", icon: HomeMajor },
  { label: "Orders", url: "/orders", icon: OrderedListMajor },
  { label: "Tickets", url: "/tickets", icon: ChatMajor },
  { label: "Refunds", url: "/refunds", icon: CreditCardMajor },
  { label: "Settings", url: "/settings", icon: SettingsMajor },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop") || "";

  return (
    <div style={{ width: "240px", minHeight: "100vh", borderRight: "1px solid #e1e3e5", padding: "16px 0" }}>
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontWeight: "bold", fontSize: "18px" }}>Support Auto</div>
      </div>
      <nav>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.url);
          const url = shop ? `${item.url}?shop=${shop}` : item.url;
          return (
            <a
              key={item.url}
              href={url}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                textDecoration: "none",
                color: isActive ? "#008060" : "#202223",
                backgroundColor: isActive ? "#f1f2f4" : "transparent",
                fontWeight: isActive ? "600" : "400",
              }}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
