import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { CartProvider } from "./context/CartContext";
import { OrderProvider } from "./context/OrderContext";

import ProductList from "./pages/ProductList";
import ProductDetails from "./pages/ProductDetails";
import Navbar from './components/Navbar';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import PrivateRouter from './components/PrivateRouter';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Admin pages
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage';

function App() {
  return (
    <CartProvider>
      <OrderProvider>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<ProductList />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<CartPage />} />

            <Route element={<PrivateRouter />}>
              <Route path="/checkout" element={<CheckoutPage />} />
            </Route>

            <Route element={<PrivateRouter />}>
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
            </Route>

            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </Router>
      </OrderProvider>
    </CartProvider>
  );
}

export default App;