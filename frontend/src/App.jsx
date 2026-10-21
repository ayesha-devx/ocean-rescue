import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { ObservationProvider } from './context/ObservationContext';

export function App() {
  return (
    <BrowserRouter>
      <ObservationProvider>
        <AppRoutes />
      </ObservationProvider>
    </BrowserRouter>
  );
}

export default App;
