import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Login } from './componets/Login';
import { Dashboard } from './componets/Dashboard';
import { Friends } from './componets/Friends';
import WorldMap from './componets/WorldMap';
import { ProtectedRoute } from './componets/ProtectedRoute';
import { AuthProvider } from './hooks/AuthProvider';
import LandingPage from './componets/LandingPage';
import { Playdates } from './componets/Playdates';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
          />
          <Route
            path="/friends"
            element={<ProtectedRoute><Friends /></ProtectedRoute>}
          />
          <Route
            path="/playdates"
            element={<ProtectedRoute><Playdates /></ProtectedRoute>}
          />
          <Route
            path="/map"
            element={<ProtectedRoute><WorldMap /></ProtectedRoute>}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
