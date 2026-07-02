import React from 'react';
import { Link } from 'react-router-dom';
import { FiFacebook, FiTwitter, FiLinkedin, FiInstagram } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="bg-[#0f4c75] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">India Trade Overseas</h3>
            <p className="text-[#dbeafe]">Your trusted partner in international trade since 2024.</p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-400 hover:text-white"><FiFacebook size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-white"><FiTwitter size={20} /></a>
              <a href="https://linkedin.com/in/india-trade-overseas-64012234b?original_referer=https%3A%2F%2Fwww%2Egoogle%2Ecom%2F&originalSubdomain=in" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white"><FiLinkedin size={20} /></a>
              <a href="https://www.instagram.com/indiatradeoverseas?igsh=MmVkZjg0cXVhazN1" className="text-gray-400 hover:text-white"><FiInstagram size={20} /></a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-[#dbeafe]">
              <li><Link to="/" className="hover:text-white">Home</Link></li>
              <li><Link to="/products" className="hover:text-white">Products</Link></li>
              <li><Link to="/about" className="hover:text-white">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link to="/careers" className="hover:text-white">Careers</Link></li>
              <li><Link to="/quote-request" className="hover:text-white">Get Quote</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Products</h4>
            <ul className="space-y-2 text-[#dbeafe]">
              <li><Link to="/products" className="hover:text-white">Vegetable</Link></li>
              <li><Link to="/products" className="hover:text-white">Construction Material</Link></li>
              <li><Link to="/products" className="hover:text-white">Coal</Link></li>
              <li><Link to="/products" className="hover:text-white">Tea</Link></li>
              <li><Link to="/products" className="hover:text-white">Wheat</Link></li>
              <li><Link to="/products" className="hover:text-white">Stone</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact Info</h4>
            <ul className="space-y-2 text-[#dbeafe] text-sm leading-relaxed">
              <li>
                Vill-Deramari, Tola-Maujabari, panch-Deramari, Block-Khochadham,<br />
                dist - kishanganj, Near imambada pani bagh, Kishanganj, Bihar - 855107
              </li>
              <li>+91 8250614079</li>
              <li>info@indiatraaddeoverseas.com</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#144c7c] mt-8 pt-8 text-center text-[#dbeafe]">
          <p>&copy; 2024 India Trade Overseas. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
