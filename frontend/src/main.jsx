import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' 
// import './index.css'
import App from './App.jsx'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Provider } from 'react-redux'
import store from './store/store.js'
import TechnicalResults from './pages/TechnicalResults.jsx'
import CurrencyPulse from './pages/CurrencyPulse.jsx'
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children:[
      {
        path: '/',
        element: <TechnicalResults/>
        },
        {
          path: '/score',
          element: <CurrencyPulse/>
        }
    ]
  }
])
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
    <RouterProvider router={router}/>
    </Provider>
  </StrictMode>,
)
