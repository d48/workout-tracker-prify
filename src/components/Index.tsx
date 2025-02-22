import Header from "../components/Header";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver.tsx";

const Index = () => {
  const [heroRef, heroVisible] = useIntersectionObserver();
  const [featuresRef, featuresVisible] = useIntersectionObserver();
  const [customizationRef, customizationVisible] = useIntersectionObserver();
  const [shareRef, shareVisible] = useIntersectionObserver();
  const [themeRef, themeVisible] = useIntersectionObserver();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Header />
      
      {/* Hero Section */}
      <section ref={heroRef} className="pt-32 pb-16 px-4">
        <div className="container mx-auto text-center">
          <div className={`transition-opacity duration-1000 ${heroVisible ? 'opacity-100' : 'opacity-0'}`}>
            <span className="bg-[#dbf111]/10 text-primary-foreground dark:text-[#dbf111] px-4 py-1.5 rounded-full text-sm font-medium">
              Track Your Workouts, Break Your Records
            </span>
          </div>
          <h1 className={`mt-8 text-4xl md:text-6xl font-bold tracking-tight transition-all duration-1000 delay-200 ${heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            Your Personal Records (PRs),{" "}
            <span className="text-[#dbf111]">Simplified</span>
          </h1>
          <p className={`mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto transition-all duration-1000 delay-400 ${heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            PRify helps you track your workouts, monitor your progress, and break your personal records with an intuitive mobile interface.
          </p>
          <div className={`mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 delay-600 ${heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <a href="/sign-in" className="w-full sm:w-auto bg-[#dbf111] text-black px-8 py-3 rounded-full text-lg font-medium hover:bg-primary/90 transition-colors">
              Start Breaking Records
            </a>
            <a href="/sign-in" className="w-full sm:w-auto bg-gray-100 dark:bg-gray-800 px-8 py-3 rounded-full text-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              Sign In
            </a>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section ref={featuresRef} className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className={`p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 transition-all duration-1000 ${featuresVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <img src="/screenshots/workout-detail.png" alt="Workout Tracking" className="w-full rounded-lg mb-6 shadow-lg" />
              <h3 className="text-xl font-semibold mb-2">Detailed Workout Tracking</h3>
              <p className="text-gray-600 dark:text-gray-400">Log your exercises, sets, reps, and weights with our intuitive interface.</p>
            </div>
            
            <div className={`p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 transition-all duration-1000 delay-200 ${featuresVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <img src="/screenshots/statistics.png" alt="Progress Tracking" className="w-full rounded-lg mb-6 shadow-lg" />
              <h3 className="text-xl font-semibold mb-2">Visual Progress Tracking</h3>
              <p className="text-gray-600 dark:text-gray-400">Monitor your progress with detailed statistics and performance graphs.</p>
            </div>
            
            <div className={`p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 transition-all duration-1000 delay-400 ${featuresVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <img src="/screenshots/add-exercise-2.png" alt="Exercise Library" className="w-full rounded-lg mb-6 shadow-lg" />
              <h3 className="text-xl font-semibold mb-2">Customizable Exercises</h3>
              <p className="text-gray-600 dark:text-gray-400">Create and customize your own exercises and categories.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Exercise Customization Section */}
      <section ref={customizationRef} className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className={`space-y-6 transition-all duration-1000 ${customizationVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <h2 className="text-3xl md:text-4xl font-bold">Fully Customizable Exercise Library</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">Create custom exercises, organize them into categories, and tailor your workout experience exactly how you want it. Add new exercises on the fly and keep your workout routine fresh and challenging.</p>
            </div>
            <div className={`grid grid-cols-2 gap-4 transition-all duration-1000 delay-200 ${customizationVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <img src="/screenshots/add-exercise-1.png" alt="Category Management" className="w-full rounded-lg shadow-lg" />
              <img src="/screenshots/add-exercise-2.png" alt="Exercise Creation" className="w-full rounded-lg shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* Share Workouts Section */}
      <section ref={shareRef} className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className={`order-2 md:order-1 grid grid-cols-2 gap-4 transition-all duration-1000 ${shareVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <img src="/screenshots/workout-list-dark.png" alt="Share Progress" className="w-full rounded-lg shadow-lg" />
              <img src="/screenshots/text-sharing.png" alt="Track Together" className="w-full rounded-lg shadow-lg" />
            </div>
            <div className={`order-1 md:order-2 space-y-6 transition-all duration-1000 delay-200 ${shareVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <h2 className="text-3xl md:text-4xl font-bold">Share Your Progress</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">Connect with friends, share your workouts, and motivate each other to reach new personal records. Track your progress together and celebrate each other's achievements.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Theme Support Section */}
      <section ref={themeRef} className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto text-center">
          <h2 className={`text-3xl md:text-4xl font-bold mb-8 transition-all duration-1000 ${themeVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            Your Comfort, Your Choice
          </h2>
          <p className={`text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12 transition-all duration-1000 delay-200 ${themeVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            Whether you prefer a light interface for daytime workouts or dark mode for evening sessions, PRify adapts to your needs. Easy on the eyes, always.
          </p>
          <div className={`flex flex-col md:flex-row gap-8 justify-center items-center transition-all duration-1000 delay-400 ${themeVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
              <img src="/screenshots/workout-list-light.png" alt="Light Mode" className="w-full max-w-[300px] rounded-lg" />
              <p className="mt-4 font-medium">Light Mode</p>
            </div>
            <div className="bg-gray-800 dark:bg-gray-950 p-6 rounded-2xl shadow-lg">
              <img src="/screenshots/workout-list-dark.png" alt="Dark Mode" className="w-full max-w-[300px] rounded-lg" />
              <p className="mt-4 font-medium text-white">Dark Mode</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto text-center text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-center space-x-4">
            <a href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
          <p className="mt-4">© 2024 PRify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
