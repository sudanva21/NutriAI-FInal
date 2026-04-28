import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Search,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { API, useAuth } from '../App';

const Orders = () => {
  const navigate = useNavigate();
  const { user, token, loading: loadingAuth } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!token) return;
      try {
        const { data } = await axios.get(`${API}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(data);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        setError('Could not load your orders. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (!loadingAuth) {
      if (!user) {
        navigate('/auth');
      } else {
        fetchOrders();
      }
    }
  }, [navigate, token, user, loadingAuth]);

  const getStatusInfo = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return { 
          label: 'Order Confirmed', 
          icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
          color: 'bg-green-50 text-green-700 border-green-100',
          progress: 25
        };
      case 'processing':
        return { 
          label: 'Processing', 
          icon: <Clock className="w-4 h-4 text-blue-500" />,
          color: 'bg-blue-50 text-blue-700 border-blue-100',
          progress: 50
        };
      case 'shipped':
        return { 
          label: 'In Transit', 
          icon: <Truck className="w-4 h-4 text-purple-500" />,
          color: 'bg-purple-50 text-purple-700 border-purple-100',
          progress: 75
        };
      case 'delivered':
        return { 
          label: 'Delivered', 
          icon: <Package className="w-4 h-4 text-[#E26D5C]" />,
          color: 'bg-[#E26D5C]/10 text-[#E26D5C] border-[#E26D5C]/20',
          progress: 100
        };
      default:
        return { 
          label: 'Pending', 
          icon: <Clock className="w-4 h-4 text-gray-500" />,
          color: 'bg-gray-50 text-gray-700 border-gray-100',
          progress: 10
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] pb-32">
      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-6 border-b border-black/5 sticky top-0 z-10">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => navigate('/app/profile')}
            className="w-10 h-10 rounded-full bg-[#F9F6F0] flex items-center justify-center hover:bg-[#F3EFE7] transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-[#1A1A1A]" />
          </button>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#1A1A1A]">Your Orders</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B635E]/50" />
          <input 
            type="text" 
            placeholder="Search orders or products..."
            className="w-full bg-[#F9F6F0] border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[#E26D5C]/20 transition-all placeholder:text-[#6B635E]/40"
          />
        </div>
      </header>

      <main className="px-5 pt-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-[#E26D5C] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[#6B635E] text-sm font-medium">Fetching your history...</p>
          </div>
        ) : error ? (
          <div className="bg-white p-8 rounded-3xl shadow-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="font-display text-xl font-bold">Something went wrong</h2>
            <p className="text-[#6B635E] text-sm leading-relaxed">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[#E26D5C] text-white rounded-xl text-sm font-bold"
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl shadow-sm text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#F9F6F0] flex items-center justify-center mx-auto">
              <Package className="w-10 h-10 text-[#6B635E]/30" strokeWidth={1} />
            </div>
            <h2 className="font-display text-xl font-bold">No orders yet</h2>
            <p className="text-[#6B635E] text-sm leading-relaxed">
              Looks like you haven't ordered anything from our marketplace yet.
            </p>
            <button 
              onClick={() => navigate('/app/marketplace')}
              className="px-8 py-3 bg-[#E26D5C] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#E26D5C]/20"
            >
              Explore Marketplace
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, idx) => {
              const statusInfo = getStatusInfo(order.status);
              return (
                <div key={idx} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-black/[0.03]">
                  <div className="p-4 border-b border-black/[0.03] flex justify-between items-center bg-[#F9F6F0]/30">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B635E]/60">
                      #{order.order_id.slice(-8).toUpperCase()} • {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${statusInfo.color}`}>
                      {statusInfo.icon}
                      <span className="text-[11px] font-bold">{statusInfo.label}</span>
                    </div>
                  </div>

                  <div className="p-4 flex gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#F9F6F0] flex-shrink-0">
                      {order.item_image ? (
                        <img src={order.item_image} alt={order.item_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-[#6B635E]/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-bold text-[#1A1A1A] truncate">{order.item_name || 'Product'}</h3>
                        <p className="text-[#6B635E] text-xs mt-1">
                          {order.item_type === 'counselor' ? 'Professional Consultation' : 'Marketplace Item'}
                        </p>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-[#1A1A1A]">₹{order.amount}</span>
                        <button className="text-[#E26D5C] text-xs font-bold flex items-center gap-1">
                          Details <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-bold text-[#6B635E]">Order Progress</span>
                      <span className="text-[11px] font-bold text-[#E26D5C]">{statusInfo.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#F9F6F0] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#E26D5C] rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${statusInfo.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-[#E26D5C]/5 p-6 rounded-3xl border border-[#E26D5C]/10 flex gap-4 items-center">
          <div className="w-12 h-12 rounded-2xl bg-[#E26D5C] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#E26D5C]/20">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#1A1A1A]">Need help with an order?</h4>
            <p className="text-[#6B635E] text-xs mt-0.5">Contact our 24/7 nutrition support team.</p>
          </div>
          <button className="ml-auto w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
            <ChevronRight className="w-5 h-5 text-[#E26D5C]" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default Orders;
