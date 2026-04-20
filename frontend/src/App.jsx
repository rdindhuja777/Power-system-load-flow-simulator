import { useEffect } from 'react';
import LandingPage from './pages/LandingPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { useSimulationStore } from './store/useSimulationStore.js';

export default function App() {
  const view = useSimulationStore((state) => state.view);
  const darkMode = useSimulationStore((state) => state.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return view === 'landing' ? <LandingPage /> : <Dashboard />;
}
