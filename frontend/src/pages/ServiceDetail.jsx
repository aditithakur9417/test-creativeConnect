import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import api from '@/utils/api';
import { ArrowLeft, Star, Clock, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [requirements, setRequirements] = useState('');
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    fetchService();
  }, [id]);

  const fetchService = async () => {
    try {
      const { data } = await api.get(`/services/${id}`);
      setService(data);
      if (data.tiers && data.tiers.length > 0) {
        setSelectedTier(data.tiers[0]);
      }
    } catch (error) {
      console.error('Failed to fetch service:', error);
      toast.error('Service not found');
      navigate('/services');
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async () => {
    if (!user) {
      toast.error('Please sign in to place an order');
      return;
    }

    if (!requirements.trim()) {
      toast.error('Please provide your requirements');
      return;
    }

    try {
      setOrdering(true);
      const { data: order } = await api.post('/orders', {
        service_id: service.service_id,
        tier_name: selectedTier.name,
        requirements,
      });

      toast.success('Order created! Proceeding to payment...');
      
      const origin = window.location.origin;
      const { data: checkout } = await api.post('/payments/checkout', {
        order_id: order.order_id,
        origin,
      });

      window.location.href = checkout.url;
    } catch (error) {
      console.error('Order failed:', error);
      toast.error('Failed to create order');
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
          <p className="mt-4 text-zinc-400">Loading service...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="service-detail-page" className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900/50 border-b border-zinc-800 sticky top-0 z-10 backdrop-blur-sm">
        <div className="px-6 md:px-12 py-4 flex items-center gap-4">
          <Button 
            data-testid="back-btn"
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-xl font-bold">Service Details</span>
        </div>
      </div>

      <div className="px-6 md:px-12 lg:px-24 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Service Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-4xl font-bold mb-4">{service.title}</h1>
              {service.rating > 0 && (
                <div className="flex items-center gap-2 text-lg">
                  <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                  <span className="font-semibold">{service.rating}</span>
                  <span className="text-zinc-400">({service.review_count} reviews)</span>
                </div>
              )}
            </motion.div>

            {/* Description */}
            <Card data-testid="description-card" className="glass-effect p-6 border-zinc-800">
              <h2 className="text-2xl font-semibold mb-4">About This Service</h2>
              <p className="text-zinc-300 leading-relaxed">{service.description}</p>
            </Card>

            {/* Portfolio */}
            {service.portfolio_urls && service.portfolio_urls.length > 0 && (
              <Card data-testid="portfolio-card" className="glass-effect p-6 border-zinc-800">
                <h2 className="text-2xl font-semibold mb-4">Portfolio</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {service.portfolio_urls.map((url, idx) => (
                    <div key={idx} className="aspect-video bg-zinc-800 rounded-lg overflow-hidden">
                      <img src={url} alt={`Portfolio ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar - Pricing */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Tier Selection */}
              <Card data-testid="pricing-card" className="glass-effect p-6 border-zinc-800">
                <h3 className="text-xl font-semibold mb-4">Select Package</h3>
                <div className="space-y-3 mb-6">
                  {service.tiers?.map((tier, idx) => (
                    <button
                      key={idx}
                      data-testid={`tier-btn-${tier.name}`}
                      onClick={() => setSelectedTier(tier)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedTier?.name === tier.name
                          ? 'border-indigo-600 bg-indigo-600/10'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-lg">{tier.name}</span>
                        <span className="text-xl font-bold">${tier.price}</span>
                      </div>
                      <p className="text-zinc-400 text-sm mb-3">{tier.description}</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Clock className="h-4 w-4" />
                          <span>{tier.delivery_days} days delivery</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <RotateCcw className="h-4 w-4" />
                          <span>{tier.revisions} revisions</span>
                        </div>
                        {tier.features?.map((feature, fidx) => (
                          <div key={fidx} className="flex items-center gap-2 text-sm text-zinc-400">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Requirements */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Your Requirements</label>
                  <Textarea
                    data-testid="requirements-textarea"
                    placeholder="Describe your project requirements, goals, and any specific details..."
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    rows={6}
                    className="bg-zinc-900 border-zinc-800 resize-none"
                  />
                </div>

                {/* Order Button */}
                <Button
                  data-testid="order-now-btn"
                  onClick={handleOrder}
                  disabled={ordering || !requirements.trim()}
                  className="w-full h-14 text-lg font-semibold rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30"
                >
                  {ordering ? 'Processing...' : `Order Now - $${selectedTier?.price || 0}`}
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;