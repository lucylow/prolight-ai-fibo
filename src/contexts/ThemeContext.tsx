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
  // Try to use next-themes directly first, fallback to context
  try {
    const nextTheme = useNextTheme();
    if (nextTheme) {
      return {
        theme: nextTheme.theme || "light",
        toggleTheme: () => nextTheme.setTheme(nextTheme.theme === "dark" ? "light" : "dark"),
        setTheme: nextTheme.setTheme,
      };
    }
  } catch (e) {
    // Fallback to context
  }

  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return a default implementation if context is not available
    return {
      theme: "light",
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
};
