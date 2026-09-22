import defaults from '../../../Server/src/config/publicBusiness.json';

export const META_PIXEL_ID = String(import.meta.env.VITE_META_PIXEL_ID || defaults.metaPixelId).trim();
export const BUSINESS_WHATSAPP = String(import.meta.env.VITE_WHATSAPP_NUMBER || defaults.whatsappDigits).replace(/\D/g, '');
export const BUSINESS_WHATSAPP_DISPLAY = BUSINESS_WHATSAPP === defaults.whatsappDigits
  ? defaults.whatsappDisplay : `+${BUSINESS_WHATSAPP}`;
export const businessWhatsAppUrl = (message = '') => `https://wa.me/${BUSINESS_WHATSAPP}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
