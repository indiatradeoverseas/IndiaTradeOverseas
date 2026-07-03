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

 const staticProducts = [
    {
      id: 1,
      origin: 'India',
      name: 'Jharia Jharkhand Coal',
      image: 'https://tiimg.tistatic.com/fp/1/008/230/99-purity-natural-black-coal-for-industrial-use-842.jpg',
      category: 'coal',
      description: 'Jharia Jharkhand Coal'
    },
    {
      id: 2,
      origin: 'India',
      name: 'Jharkhand Coal ',
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8IbtVGkg34mUsY_o5fccaQy5iSmtkXjH6J_JDAP6YKN9uR2-Vm_ShuNk&s=10',
      category: 'coal',
      description: 'Jharkhand Coal'
    },
    {
      id: 3,
      origin: 'India',
      name: 'Indonesian Steam Coal - Dimension (L*w*h): 20 Millimeter (Mm)',
      image: 'https://cpimg.tistatic.com/10890150/b/4/Indonesian-Steam-Coal..jpg',
      category: 'coal',
      description: 'Indonesian Steam Coal - Dimension (L*w*h): 20 Millimeter (Mm)'
    },

  ];



  const categories = [
    { value: 'all', label: 'All Products' },
    { value: 'stone', label: 'Stone' },
    { value: 'white_stone', label: 'White Stone' },
    { value: 'tea', label: 'Tea Premium' },
    { value: 'rice', label: 'Rice' },
    { value: 'fruit', label: 'Fresh Fruits' },
    { value: 'vegetable', label: 'Fresh Vegetable' },
    { value: 'coal', label: 'Coal' }
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
