import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const Breadcrumbs = () => {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs on home page
  if (segments.length === 0) {
    return null;
  }

  // Map route segments to readable labels
  const getLabel = (segment: string): string => {
    const labelMap: Record<string, string> = {
      studio: "Studio",
      presets: "Presets",
      "natural-language": "AI Chat",
      history: "History",
      dashboard: "Dashboard",
      account: "Account",
      settings: "Settings",
      payments: "Payments",
      billing: "Billing",
      invoices: "Invoices",
      teams: "Teams",
      admin: "Admin",
      "sign-in": "Sign In",
      company: "Company",
      legal: "Legal",
      product: "Product",
      features: "Features",
      "use-cases": "Use Cases",
      docs: "Documentation",
    };
    return labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-2" aria-label="Breadcrumb">
      <Link
        to="/"
        className="hover:text-foreground transition-colors flex items-center"
      >
        <Home className="w-4 h-4" />
      </Link>
      {segments.map((segment, idx) => {
        const path = "/" + segments.slice(0, idx + 1).join("/");
        const label = getLabel(segment);
        const isLast = idx === segments.length - 1;

        return (
          <React.Fragment key={path}>
            <ChevronRight className="w-4 h-4" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link
                to={path}
                className="hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
