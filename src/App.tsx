import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import QuizView from './QuizView';
import AdminPanel from './Admin';
import { useEffect } from 'react';
import { useStore } from './store';

export default function App() {
  const refreshState = useStore(s => s.refreshState);

  useEffect(() => {
    // Initial sync
    refreshState();

    // Set up polling every 1 second for global sync
    const interval = setInterval(() => {
      refreshState();
    }, 1000);

    return () => clearInterval(interval);
  }, [refreshState]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<QuizView />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}
