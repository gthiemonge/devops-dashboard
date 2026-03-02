import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
