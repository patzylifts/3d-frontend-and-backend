// src/App.jsx
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { CartProvider } from "./context/CartContext";
import { OrderProvider } from "./context/OrderContext";

import LandingPage from "./pages/LandingPage";
import BuildBentoPage from "./pages/BuildBentoPage";
import ProductList from "./pages/ProductList";
import ProductDetails from "./pages/ProductDetails";
import Navbar from './components/Navbar';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import PrivateRouter from './components/PrivateRouter';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Admin Page
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage';

// Customer Page
import CustomerProfile from "./pages/customer/CustomerProfile";
import CustomerProfileUpdate from "./pages/customer/CustomerProfileUpdate";
import CustomerOrdersPage from "./pages/customer/CustomerOrdersPage";
import CustomerOrderDetailPage from "./pages/customer/CustomerOrderDetailPage";
import PaymentCheckoutPage from './pages/customer/PaymentCheckoutPage';

function App() {
  return (
    <CartProvider>
      <OrderProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/build" element={<BuildBentoPage />} />
            <Route path="/products" element={<><Navbar /><ProductList /></>} />
            <Route path="/product/:id" element={<><Navbar /><ProductDetails /></>} />

            <Route element={<PrivateRouter />}>
              <Route path="/checkout" element={<><Navbar /><CheckoutPage /></>} />
              <Route path="/profile" element={<><Navbar /><CustomerProfile /></>} />
              <Route path="/profile/edit" element={<><Navbar /><CustomerProfileUpdate /></>} />

              <Route path="/orders" element={<><Navbar /><CustomerOrdersPage /></>} />
              <Route path="/orders/:id" element={<><Navbar /><CustomerOrderDetailPage /></>} />
              <Route path="/payment/checkout/:id" element={<><Navbar /><PaymentCheckoutPage /></>} />
              <Route path="/orders/:id/checkout" element={<><Navbar /><PaymentCheckoutPage /></>} />
            </Route>

            <Route element={<PrivateRouter adminOnly={true} />}>
              <Route path="/admin/orders" element={<><Navbar /><AdminOrdersPage /></>} />
              <Route path="/admin/orders/:id" element={<><Navbar /><AdminOrderDetailPage /></>} />
            </Route>

            <Route path="/login" element={<><Navbar /><Login /></>} />
            <Route path="/signup" element={<><Navbar /><Signup /></>} />
            <Route path="/cart" element={<><Navbar /><CartPage /></>} />
          </Routes>
        </Router>
      </OrderProvider>
    </CartProvider>
  );
}

export default App;