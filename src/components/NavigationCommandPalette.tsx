import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Lightbulb, FlaskConical, MessageSquare, Palette, History, Sparkles } from "lucide-react";

const navItems = [
  { path: "/", label: "Home", icon: Lightbulb, shortcut: "⌂" },
  { path: "/studio", label: "Studio", icon: FlaskConical, shortcut: "s" },
  { path: "/agentic-workflow", label: "Agentic AI", icon: Sparkles, shortcut: "a" },
  { path: "/presets", label: "Presets", icon: Palette, shortcut: "p" },
  { path: "/natural-language", label: "AI Chat", icon: MessageSquare, shortcut: "c" },
  { path: "/history", label: "History", icon: History, shortcut: "y" },
];

export function NavigationCommandPalette() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle navigation
  const handleSelect = React.useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate]
  );

  // Open command palette with Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't trigger if typing in input/textarea
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <CommandItem
                key={item.path}
                value={`${item.label} ${item.path}`}
                onSelect={() => handleSelect(item.path)}
                className={isActive ? "bg-accent" : ""}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
                {isActive && <span className="ml-2 text-xs text-muted-foreground">(current)</span>}
                {item.shortcut !== "⌂" && (
                  <CommandShortcut>
                    {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}
                    +{item.shortcut.toUpperCase()}
                  </CommandShortcut>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

