import React, { createContext, useContext, useEffect, useState } from "react";
import { useTheme as useNextTheme } from "next-themes";

interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // This component just provides a wrapper around next-themes for consistency
  // The actual ThemeProvider from next-themes is in main.tsx
  const { theme, setTheme: setNextTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setNextTheme(theme === "dark" ? "light" : "dark");
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme: theme || "light", toggleTheme, setTheme: setNextTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  // Call hooks unconditionally at the top level (Rules of Hooks)
  const nextTheme = useNextTheme();
  const context = useContext(ThemeContext);
  
  // Prefer next-themes if available
  if (nextTheme && nextTheme.theme !== undefined) {
    return {
      theme: nextTheme.theme || "light",
      toggleTheme: () => nextTheme.setTheme(nextTheme.theme === "dark" ? "light" : "dark"),
      setTheme: nextTheme.setTheme,
    };
  }
  
  // Fallback to context if available
  if (context !== undefined) {
    return context;
  }
  
  // Return a default implementation if neither is available
  return {
    theme: "light",
    toggleTheme: () => {},
    setTheme: () => {},
  };
};
