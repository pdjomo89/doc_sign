import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import NewDocument from '@/pages/NewDocument';
import DocumentDetail from '@/pages/DocumentDetail';
import SignDocument from '@/pages/SignDocument';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewDocument />} />
          <Route path="/document/:id" element={<DocumentDetail />} />
          <Route path="/sign/:token" element={<SignDocument />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
