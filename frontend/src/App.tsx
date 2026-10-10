import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-canvas text-fg">
      <Header />
      <Dashboard />
    </div>
  );
}

export default App;
