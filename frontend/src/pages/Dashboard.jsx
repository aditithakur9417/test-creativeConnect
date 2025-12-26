import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import api from '@/utils/api';
import { Plus, Package, ShoppingBag, TrendingUp, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ services: 0, orders: 0, revenue: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [ordersRes] = await Promise.all([
        api.get('/orders'),
      ]);

      const orders = ordersRes.data.orders || [];
      setRecentOrders(orders.slice(0, 5));

      const revenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.price, 0);

      setStats({
        services: 0,
        orders: orders.length,
        revenue: revenue.toFixed(2)
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
          <p className="mt-4 text-zinc-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page" className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900/50 border-b border-zinc-800 sticky top-0 z-10 backdrop-blur-sm">
        <div className="px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-indigo-500" />
            <span className="text-2xl font-bold gradient-text">CreativeHub</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              data-testid="browse-services-nav-btn"
              variant="ghost" 
              onClick={() => navigate('/services')}
              className="text-zinc-400 hover:text-white"
            >
              Browse Services
            </Button>
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-800/50">
              <img 
                src={user?.picture || 'https://via.placeholder.com/40'} 
                alt={user?.name}
                className="h-8 w-8 rounded-full"
              />
              <span className="text-sm font-medium">{user?.name}</span>
            </div>
            <Button 
              data-testid="logout-btn"
              variant="ghost" 
              size="icon" 
              onClick={logout}
              className="text-zinc-400 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 lg:px-24 py-12">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-zinc-400 text-lg">Here's what's happening with your projects</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card data-testid="stat-card-orders" className="glass-effect p-6 border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <ShoppingBag className="h-8 w-8 text-indigo-500" />
              <span className="text-sm text-zinc-400">Total</span>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.orders}</div>
            <div className="text-zinc-400">Active Orders</div>
          </Card>

          <Card data-testid="stat-card-services" className="glass-effect p-6 border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <Package className="h-8 w-8 text-pink-500" />
              <span className="text-sm text-zinc-400">Published</span>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.services}</div>
            <div className="text-zinc-400">Services</div>
          </Card>

          <Card data-testid="stat-card-revenue" className="glass-effect p-6 border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <span className="text-sm text-zinc-400">USD</span>
            </div>
            <div className="text-3xl font-bold mb-1">${stats.revenue}</div>
            <div className="text-zinc-400">Total Revenue</div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              data-testid="action-browse-services-btn"
              className="glass-effect h-24 rounded-xl border border-zinc-800 hover:border-indigo-600 transition-all"
              variant="outline"
              onClick={() => navigate('/services')}
            >
              <div className="text-center">
                <Package className="h-6 w-6 mx-auto mb-2 text-indigo-500" />
                <div className="font-medium">Browse Services</div>
              </div>
            </Button>
            
            <Button 
              data-testid="action-my-orders-btn"
              className="glass-effect h-24 rounded-xl border border-zinc-800 hover:border-pink-600 transition-all"
              variant="outline"
              onClick={() => navigate('/orders')}
            >
              <div className="text-center">
                <ShoppingBag className="h-6 w-6 mx-auto mb-2 text-pink-500" />
                <div className="font-medium">My Orders</div>
              </div>
            </Button>

            <Button 
              data-testid="action-create-service-btn"
              className="glass-effect h-24 rounded-xl border border-zinc-800 hover:border-green-600 transition-all"
              variant="outline"
              onClick={() => navigate('/create-service')}
            >
              <div className="text-center">
                <Plus className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <div className="font-medium">Create Service</div>
              </div>
            </Button>

            <Button 
              data-testid="action-settings-btn"
              className="glass-effect h-24 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-all"
              variant="outline"
              onClick={() => navigate('/settings')}
            >
              <div className="text-center">
                <Settings className="h-6 w-6 mx-auto mb-2 text-zinc-400" />
                <div className="font-medium">Settings</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Recent Orders */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent Orders</h2>
            <Button 
              data-testid="view-all-orders-btn"
              variant="ghost" 
              className="text-indigo-500 hover:text-indigo-400"
              onClick={() => navigate('/orders')}
            >
              View All
            </Button>
          </div>
          
          {recentOrders.length === 0 ? (
            <Card data-testid="no-orders-card" className="glass-effect p-12 text-center border-zinc-800">
              <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-400 text-lg mb-4">No orders yet</p>
              <Button 
                data-testid="get-started-btn"
                onClick={() => navigate('/services')} 
                className="rounded-full bg-indigo-600 hover:bg-indigo-700"
              >
                Browse Services
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <Card 
                  key={order.order_id} 
                  data-testid={`order-card-${order.order_id}`}
                  className="glass-effect p-6 border-zinc-800 hover:border-indigo-600/50 transition-all cursor-pointer"
                  onClick={() => navigate(`/orders/${order.order_id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{order.service_id}</h3>
                      <p className="text-zinc-400 text-sm">Order #{order.order_id}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">${order.price}</div>
                      <div className={`text-sm px-3 py-1 rounded-full inline-block mt-2 ${
                        order.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                        order.status === 'in_progress' ? 'bg-blue-600/20 text-blue-400' :
                        order.status === 'pending_payment' ? 'bg-yellow-600/20 text-yellow-400' :
                        'bg-zinc-600/20 text-zinc-400'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;