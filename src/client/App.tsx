import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './componets/Login';
import Dashboard from './componets/Dashboard';
import Friends from './componets/Friends';
import WorldMap from './componets/WorldMap';
import ProtectedRoute from './componets/ProtectedRoute';
import { AuthProvider } from './hooks/AuthProvider';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
          />
          <Route
            path="/friends"
            element={<ProtectedRoute><Friends /></ProtectedRoute>}
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
