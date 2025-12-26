import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/utils/api';
import { Search, Star, Package, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Services = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Services' },
    { id: 'video_editing', name: 'Video Editing' },
    { id: 'graphic_design', name: 'Graphic Design' },
    { id: 'thumbnails', name: 'Thumbnails' },
    { id: 'audio_enhancement', name: 'Audio' },
    { id: 'video_creation', name: 'Video Creation' },
  ];

  useEffect(() => {
    fetchServices();
  }, [selectedCategory, search]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (search) params.append('search', search);
      
      const { data } = await api.get(`/services?${params.toString()}`);
      setServices(data.services || []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="services-page" className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900/50 border-b border-zinc-800 sticky top-0 z-10 backdrop-blur-sm">
        <div className="px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              data-testid="back-btn"
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Package className="h-8 w-8 text-indigo-500" />
            <span className="text-2xl font-bold gradient-text">CreativeHub</span>
          </div>
          <Button 
            data-testid="dashboard-nav-btn"
            onClick={() => navigate('/dashboard')}
            className="rounded-full bg-indigo-600 hover:bg-indigo-700"
          >
            Dashboard
          </Button>
        </div>
      </div>

      <div className="px-6 md:px-12 lg:px-24 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Browse Services</h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Discover talented creators ready to bring your vision to life
          </p>
        </motion.div>

        {/* Search & Filters */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              data-testid="search-input"
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 bg-zinc-900 border-zinc-800 rounded-full text-lg"
            />
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                data-testid={`category-btn-${cat.id}`}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
            <p className="mt-4 text-zinc-400">Loading services...</p>
          </div>
        ) : services.length === 0 ? (
          <Card data-testid="no-services-card" className="glass-effect p-12 text-center border-zinc-800">
            <Package className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-400 text-lg">No services found</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <motion.div
                key={service.service_id}
                data-testid={`service-card-${service.service_id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                className="cursor-pointer"
                onClick={() => navigate(`/services/${service.service_id}`)}
              >
                <Card className="glass-effect overflow-hidden border-zinc-800 hover:border-indigo-600/50 transition-all h-full">
                  {service.thumbnail_url && (
                    <div className="aspect-video bg-zinc-800 overflow-hidden">
                      <img
                        src={service.thumbnail_url}
                        alt={service.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg line-clamp-2 flex-1">{service.title}</h3>
                      {service.rating > 0 && (
                        <div className="flex items-center gap-1 ml-2">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="font-semibold">{service.rating}</span>
                          <span className="text-zinc-400 text-sm">({service.review_count})</span>
                        </div>
                      )}
                    </div>
                    <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{service.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-3 py-1 rounded-full bg-indigo-600/20 text-indigo-400">
                        {service.category.replace('_', ' ')}
                      </span>
                      {service.tiers && service.tiers.length > 0 && (
                        <span className="font-semibold text-lg">
                          From ${service.tiers[0].price}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Services;