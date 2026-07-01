import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiGlobe, FiDollarSign, FiSend, FiInbox, FiCompass } from 'react-icons/fi';
import { productsApi } from '../../api/products';

const staticProducts = [
  {
    id: 1,
    origin: 'India',
    price: '20-50/kg',
    name: 'RM Natural Unpolished Decorative Pebbles for Home & Garden Decor',
    image: 'https://m.media-amazon.com/images/I/61FSFnx6r-L._SL1024_.jpg',
    category: 'construction',
    description: 'RM Natural Unpolished Decorative Pebbles for Home & Garden Decor (5kg, Rainbow, 20-50mm) | Raw Natural Stones for Landscaping, Plant Pots, Fillers, Aquarium, Pathways, Indoor Outdoor Use'
  },
  {
    id: 2,
    origin: 'India',
    price: '20-50/kg',
    name: 'Solid Natural Stone ',
    image: 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcSwiWjzogncwMWMQlEe7c4SMhst0Rle2wP7KS9PYFWU0FmAqF4zXlPU0XT9fKdA1v4MDDMoqhkqnthlc5Qwnada7xkk1BMW',
    category: 'construction',
    description: 'Solid Natural Stone- 60 mm Size, Heat-Resistant and Durable for Building Applications'
  },
  {
    id: 3,
    origin: 'India',
    price: '20-50/kg',
    name: 'Reflectix Expansion Joint',
    image: 'https://m.media-amazon.com/images/I/41AWyJc1pWL._AC_UF1000,1000_QL80_.jpg',
    category: 'construction',
    description: 'Reflectix Expansion Joint.'
  },
  {
    id: 4,
    origin: "India",
    price: '20-50/kg',
    name: 'Gfrp Fiberglass Bar, Epoxy Composite Fiberglass Rebar',
    image: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTz7SO8-Tud-Feg53A0TptPFRY6zRCkI7Z5Abg_KC4fCccB7MSJWB9rDk7yZr-to8vgPoVt42xMlRJP6YY4JTVhuM0WUBDM",
    category: 'fiberglass_rebar',
    description: 'Gfrp Fiberglass Bar, Epoxy Composite Fiberglass Rebar'
  }
];

const categoryLabels = {
  stone: 'Natural Stone',
  white_stone: 'White Stone',
  tea: 'Tea Premium',
  rice: 'Premium Rice',
  fruit: 'Fresh Fruits',
  vegetable: 'Fresh Vegetable'
};

const renderFormattedDescriptionFull = (description) => {
  if (!description) return null;

  const lines = description.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length <= 1) {
    return <p className="text-slate-600 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">{description}</p>;
  }

  return (
    <div className="space-y-4 text-slate-700">
      {lines.map((line, index) => {
        const isHeader = line === line.toUpperCase() && line.length > 4 && !line.includes(':');
        if (isHeader) {
          return (
            <div key={index} className="font-bold text-slate-900 tracking-wider uppercase border-b-2 border-slate-100 pb-1 mt-6 first:mt-0 text-sm sm:text-base">
              {line}
            </div>
          );
        }

        if (line.includes(':') || line.includes(' - ')) {
          const delimiter = line.includes(':') ? ':' : ' - ';
          const parts = line.split(delimiter);
          const key = parts[0].trim();
          const value = parts.slice(1).join(delimiter).trim();
          return (
            <div key={index} className="flex justify-between items-baseline gap-4 py-2 border-b border-slate-100/60 hover:bg-slate-50/50 px-2 rounded transition">
              <span className="text-slate-500 text-xs sm:text-sm font-medium">{key}</span>
              <span className="text-slate-900 text-xs sm:text-sm font-semibold text-right">{value}</span>
            </div>
          );
        }

        if (line.startsWith('-')) {
          const content = line.substring(1).trim();
          return (
            <div key={index} className="flex items-start space-x-2 text-xs sm:text-sm py-1">
              <span className="text-indigo-500 font-bold text-base mt-[-2px]">•</span>
              <span className="text-slate-700">{content}</span>
            </div>
          );
        }

        return (
          <p key={index} className="text-slate-600 text-xs sm:text-sm leading-relaxed py-1">
            {line}
          </p>
        );
      })}
    </div>
  );
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        // If the ID matches a static product local lookup
        const staticItem = staticProducts.find(p => String(p.id) === String(id));
        if (staticItem) {
          setProduct(staticItem);
          setLoading(false);
          return;
        }

        // Otherwise fetch from database
        const response = await productsApi.getProductById(id);
        if (response.success && response.data.product) {
          setProduct(response.data.product);
        } else {
          setError('Product not found');
        }
      } catch (err) {
        console.error('Error fetching product detail:', err);
        // Fallback checks
        const staticFallback = staticProducts.find(p => String(p.id) === String(id));
        if (staticFallback) {
          setProduct(staticFallback);
        } else {
          setError(err.response?.data?.message || 'Failed to load product details.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 text-sm font-medium">Loading premium product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl border border-slate-100 shadow-lg">
          <FiInbox className="mx-auto text-rose-500 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Product Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">{error || 'The product you requested does not exist.'}</p>
          <Link to="/products" className="btn-primary inline-flex items-center space-x-2 bg-indigo-600 text-white">
            <FiArrowLeft />
            <span>Return to Catalog</span>
          </Link>
        </div>
      </div>
    );
  }

  const categoryName = categoryLabels[product.category] || product.category;

  // Generate Quote Request URL with prefilled parameters
  const quoteParams = new URLSearchParams({
    category: product.category,
    productName: product.name
  }).toString();

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Breadcrumb & Back Link */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center space-x-2 text-sm text-slate-500 hover:text-indigo-600 transition duration-150"
          >
            <FiArrowLeft className="transform group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold">Go Back</span>
          </button>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400">
            <Link to="/" className="hover:text-slate-600">Home</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-slate-600">Products</Link>
            <span>/</span>
            <span className="text-slate-600 font-medium truncate max-w-[200px]">{product.name}</span>
          </div>
        </div>

        {/* Main Product Container */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">

          {/* Left Column: Product Image */}
          <div className="lg:col-span-5 bg-slate-50 relative min-h-[350px] lg:min-h-[500px] flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={product.image || product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover filter blur-2xl opacity-10"
              />
            </div>
            <img
              src={product.image || product.imageUrl}
              alt={product.name}
              className="relative z-10 w-full max-h-[450px] object-contain rounded-2xl shadow-lg border border-slate-100/55 hover:scale-[1.02] transition-transform duration-300"
            />
          </div>

          {/* Right Column: Details & Specs */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Category Badge & Origin */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-3 py-1 rounded-full">
                  {categoryName}
                </span>
                <span className="inline-flex items-center text-xs text-slate-400 bg-slate-55 border border-slate-100 px-3 py-1 rounded-full">
                  <FiGlobe className="mr-1" /> Origin: <strong className="ml-1 text-slate-600">{product.origin}</strong>
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Verification Info Box */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Verification Status
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    India Trade Center
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-block text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/70 px-3 py-1 rounded-full uppercase tracking-wide">
                    Verified Exporter
                  </span>
                </div>
              </div>

              {/* Formatted Specs Grid */}
              <div className="space-y-3">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
                  <FiCompass className="mr-1.5" /> Product Specifications
                </span>
                <div className="border border-slate-100 rounded-2xl p-4 sm:p-6 bg-slate-50/20">
                  {renderFormattedDescriptionFull(product.description)}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">


              <Link
                to={`/quote-request?${quoteParams}`}
                className="w-full sm:w-auto btn-primary bg-indigo-600 text-white hover:bg-indigo-700 font-bold px-8 py-4 rounded-xl flex items-center justify-center space-x-2 text-center shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <FiSend size={16} />
                <span>Request Custom Quote</span>
              </Link>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
