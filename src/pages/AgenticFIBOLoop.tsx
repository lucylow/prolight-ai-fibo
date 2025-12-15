import React from 'react';
import AgenticLoop from '@/components/AgenticLoop';

/**
 * Agentic FIBO Iteration Loop Page
 * 
 * Provides an agentic workflow for iteratively refining FIBO lighting parameters
 * through natural language feedback. The LLM translates user instructions into
 * minimal JSON diffs, updates only lighting parameters, and tracks iteration scores.
 */
const AgenticFIBOLoop: React.FC = () => {
  return (
    <div className="w-full min-h-screen">
      <AgenticLoop />
    </div>
  );
};

export default AgenticFIBOLoop;
