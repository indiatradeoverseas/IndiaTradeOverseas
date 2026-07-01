import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiFilter, FiSearch } from 'react-icons/fi';
import { productsApi } from '../../api/products';

const renderFormattedDescription = (description) => {
  if (!description) return null;
  
  const lines = description.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length <= 1) {
    return <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">{description}</p>;
  }

  return (
    <div className="space-y-1.5 text-slate-600">
      {lines.map((line, index) => {
        const isHeader = line === line.toUpperCase() && line.length > 4 && !line.includes(':');
        if (isHeader) {
          return (
            <div key={index} className="font-bold text-slate-900 tracking-wider uppercase border-b border-slate-100 pb-0.5 mt-3 first:mt-0 text-[11px]">
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
            <div key={index} className="flex justify-between items-baseline gap-2 py-0.5 border-b border-slate-50">
              <span className="text-slate-500 text-[11px] font-medium shrink-0">{key}</span>
              <span className="text-slate-800 text-[11px] font-semibold text-right">{value}</span>
            </div>
          );
        }

        if (line.startsWith('-')) {
          const content = line.substring(1).trim();
          return (
            <div key={index} className="flex items-start space-x-1.5 text-[11px] py-0.5">
              <span className="text-indigo-500 font-bold">•</span>
              <span className="text-slate-700">{content}</span>
            </div>
          );
        }

        return (
          <p key={index} className="text-slate-600 text-[11px] leading-relaxed py-0.5">
            {line}
          </p>
        );
      })}
    </div>
  );
};

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [dbProducts, setDbProducts] = useState([]);

  useEffect(() => {
    const fetchDbProducts = async () => {
      try {
        const response = await productsApi.getProducts('all');
        if (response.success) {
          setDbProducts(response.data.products);
        }
      } catch (error) {
        console.error('Error fetching database products:', error);
      }
    };
    fetchDbProducts();
  }, []);

//  const staticProducts = [
  //  {
    //  id: 1,
    // origin: 'India',
//     price: '20-50/kg',
//     name: 'RM Natural Unpolished Decorative Pebbles for Home & Garden Decor',
//     image: 'https://m.media-amazon.com/images/I/61FSFnx6r-L._SL1024_.jpg',
//     category: 'construction',
//     description: 'RM Natural Unpolished Decorative Pebbles for Home & Garden Decor (5kg, Rainbow, 20-50mm) | Raw Natural Stones for Landscaping, Plant Pots, Fillers, Aquarium, Pathways, Indoor Outdoor Use'
//  },
//  {
//    id: 2,
//    origin: 'India',
//    price: '20-50/kg',
//    name: 'Solid Natural Stone ',
//    image: 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcSwiWjzogncwMWMQlEe7c4SMhst0Rle2wP7KS9PYFWU0FmAqF4zXlPU0XT9fKdA1v4MDDMoqhkqnthlc5Qwnada7xkk1BMW',
//    category: 'construction',
//    description: 'Solid Natural Stone- 60 mm Size, Heat-Resistant and Durable for Building Applications'
//   },
//    {
//      id: 3,
//      origin: 'India',
//      price: '20-50/kg',
//      name: 'Reflectix Expansion Joint',
//      image: 'https://m.media-amazon.com/images/I/41AWyJc1pWL._AC_UF1000,1000_QL80_.jpg',
//      category: 'construction',
//      description: 'Reflectix Expansion Joint.'
//    },
//    {
//      id: 4,
//      origin: "India",
//      price: '20-50/kg',
//      name: 'Gfrp Fiberglass Bar, Epoxy Composite Fiberglass Rebar',
//      image: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTz7SO8-Tud-Feg53A0TptPFRY6zRCkI7Z5Abg_KC4fCccB7MSJWB9rDk7yZr-to8vgPoVt42xMlRJP6YY4JTVhuM0WUBDM",
//      category: 'fiberglass_rebar',
//      description: 'Gfrp Fiberglass Bar, Epoxy Composite Fiberglass Rebar'
//    }
//  ];

  const categories = [
    { value: 'all', label: 'All Products' },
    { value: 'stone', label: 'Natural Stone' },
    { value: 'white_stone', label: 'White Stone' },
    { value: 'tea', label: 'Tea Premium' },
    { value: 'rice', label: 'Premium Rice' },
    { value: 'fruit', label: 'Fresh Fruits' },
    { value: 'vegetable', label: 'Fresh Vegetable' }
  ];

  const products = [...dbProducts, ...staticProducts];

  const filteredProducts = products.filter(product => {
    const name = product.name || '';
    const description = product.description || '';
    const origin = product.origin || '';

    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      origin.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesCategory = false;
    if (category === 'all') {
      matchesCategory = true;
    } else if (category === 'stone') {
      matchesCategory = product.category === 'stone' || product.category === 'natural_stones';
    } else if (category === 'rice') {
      matchesCategory = product.category === 'rice' || product.category === 'rice_commodities';
    } else {
      matchesCategory = product.category === category;
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900">Our Products</h1>
        <p className="text-gray-600 mt-4">Discover our wide range of premium quality products</p>
      </div>

      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="w-64">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProducts.map(product => {
          const productDetailUrl = `/products/${product._id || product.id}`;
          const quoteParams = new URLSearchParams({
            category: product.category || '',
            productName: product.name || ''
          }).toString();
          const quoteUrl = `/quote-request?${quoteParams}`;

          return (
            <div key={product._id || product.id} className="card hover:shadow-lg transition flex flex-col justify-between">
              <div>
                <Link to={productDetailUrl} className="block overflow-hidden rounded-lg mb-4">
                  <img
                    src={product.image || product.imageUrl}
                    alt={product.name}
                    className="w-full h-64 object-cover hover:scale-105 transition-transform duration-350"
                  />
                </Link>
                <h3 className="text-xl font-semibold mb-2 break-all hover:text-indigo-600 transition">
                  <Link to={productDetailUrl}>
                    {product.name}
                  </Link>
                </h3>
                <div className="max-h-48 overflow-y-auto pr-1.5 custom-scrollbar mb-4 border border-slate-50 rounded-lg p-2 bg-slate-50/50">
                  {renderFormattedDescription(product.description)}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <span>Origin: {product.origin}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Link to={productDetailUrl} className="btn-secondary text-center block text-xs py-2 px-3">
                    View Details
                  </Link>
                  <Link to={quoteUrl} className="btn-primary text-center block text-xs py-2 px-3">
                    Request Quote
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
