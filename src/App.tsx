import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import QuizView from './QuizView';
import AdminPanel from './templates/Admin';
import QuizRunAdmin from './QuizRunAdmin';
import YTNotesAdmin from './YTNotesAdmin';
import YTNotesView from './YTNotesView';
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
        <Route path="/quiz-run/admin" element={<QuizRunAdmin />} />
        <Route path="/yt-notes" element={<YTNotesView />} />
        <Route path="/yt-notes/admin" element={<YTNotesAdmin />} />
      </Routes>
    </Router>
  );
}
