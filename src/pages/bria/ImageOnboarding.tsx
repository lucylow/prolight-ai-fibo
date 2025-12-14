import React from 'react';
import ImageOnboarder from '@/components/ImageOnboarder';
import MainLayout from '@/components/layout/MainLayout';

const ImageOnboardingPage = () => {
  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <ImageOnboarder />
      </div>
    </MainLayout>
  );
};

export default ImageOnboardingPage;
