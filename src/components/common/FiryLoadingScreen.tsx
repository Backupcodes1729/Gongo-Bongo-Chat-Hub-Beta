
import { FiryLogo } from '@/components/icons/FiryLogo';

export function FiryLoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background space-y-6 p-4 overflow-hidden">
      <div className="relative flex items-center justify-center w-32 h-32 sm:w-36 sm:h-36">
        {/* Flame elements - positioned absolutely behind the logo */}
        <div className="flame flame-style-1 animation-flame-out-1"></div>
        <div className="flame flame-style-2 animation-flame-out-2"></div>
        <div className="flame flame-style-3 animation-flame-out-3"></div>
        <div className="flame flame-style-4 animation-flame-out-1 animation-delay-sm"></div>
        <div className="flame flame-style-5 animation-flame-out-2 animation-delay-md"></div>
        
        {/* Main Logo - pulsating */}
        <FiryLogo className="h-20 w-20 sm:h-24 sm:w-24 text-firebase-orange animate-soft-pulse relative z-10" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-firebase-yellow via-firebase-orange to-firebase-deep-orange animate-fadeIn">
        Firy Gongo Bongo
      </h1>
      <p className="text-sm text-muted-foreground animate-fadeIn animation-delay-200">
        Loading your conversations...
      </p>
    </div>
  );
}
