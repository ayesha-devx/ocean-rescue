import React, { useEffect } from 'react';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import GhostGearCrisisSection from '../components/landing/GhostGearCrisisSection';
import MissionSection from '../components/landing/MissionSection';
import WorkflowSection from '../components/landing/WorkflowSection';
import FeatureShowcaseSection from '../components/landing/FeatureShowcaseSection';
import ImpactSection from '../components/landing/ImpactSection';
import FinalCtaSection from '../components/landing/FinalCtaSection';
import LandingFooter from '../components/landing/LandingFooter';
import WaveDivider from '../components/landing/WaveDivider';
import MobileBottomNav from '../components/landing/MobileBottomNav';

export const LandingPage = () => {
  useEffect(() => {
    document.title = "OceanRescue — Every Net Found. Every Life Saved.";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div data-theme="stitch" className="min-h-screen bg-surface-container-lowest text-on-surface font-body-md text-body-md flex flex-col selection:bg-primary-container/30 selection:text-primary">
      {/* Fixed Sticky Header */}
      <LandingNavbar />

      {/* Main Content Sections */}
      <main className="flex flex-col relative w-full pt-16 pb-28 md:pb-20 lg:pb-0 bg-surface-container-lowest flex-grow">
        <div className="flex flex-col w-full text-on-surface">
          {/* 1. HERO SECTION */}
          <HeroSection />

          {/* Wave Transition: Lowest (White) to Low (Ice) */}
          <WaveDivider type="whiteToIce" />

          {/* 2. THE PROBLEM (GHOST GEAR CRISIS) */}
          <GhostGearCrisisSection />

          {/* Wave Transition: Low (Ice) to Lowest (White) */}
          <WaveDivider type="iceToWhite" />

          {/* 3. OUR MISSION (EDITORIAL FOCUS) */}
          <MissionSection />

          {/* 4. HOW IT WORKS (OPERATIONAL WORKFLOW) */}
          <WorkflowSection />

          {/* 5. FEATURE SHOWCASE (EDITORIAL BENTO) */}
          <FeatureShowcaseSection />

          {/* 6. OUR IMPACT (CONSERVATION STEWARDSHIP) */}
          <ImpactSection />

          {/* 7. FINAL CALL TO ACTION */}
          <FinalCtaSection />
        </div>

        {/* Global Footer */}
        <LandingFooter />
      </main>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <MobileBottomNav />
    </div>
  );
};

export default LandingPage;
