import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "@/components/layout/MainLayout";

import IndexImproved from "./pages/IndexImproved";
import Studio from "./pages/Studio";
import Presets from "./pages/Presets";
import NaturalLanguage from "./pages/NaturalLanguage";
import History from "./pages/History";
import AgenticWorkflow from "./pages/AgenticWorkflow";
import NotFound from "./pages/NotFound";

const App = () => {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<IndexImproved />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/agentic-workflow" element={<AgenticWorkflow />} />
            <Route path="/presets" element={<Presets />} />
            <Route path="/natural-language" element={<NaturalLanguage />} />
            <Route path="/history" element={<History />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
        <Toaster />
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
