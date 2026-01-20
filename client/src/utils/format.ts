// Format number with spaces as thousand separators (e.g., 1 000 000)
export const formatNumber = (num: number | string): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// Parse formatted number string back to number (removes spaces)
export const parseNumber = (str: string): string => {
  return str.replace(/\s/g, '');
};

// Format input value while typing (for controlled inputs)
export const formatInputNumber = (value: string): string => {
  const cleaned = value.replace(/\s/g, '');
  if (cleaned === '' || cleaned === '-') return cleaned;
  const num = parseFloat(cleaned);
  if (isNaN(num)) return '';
  return formatNumber(num);
};

// Format phone number as +998 (XX) XXX-XX-XX
export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  
  let phone = digits;
  if (!phone.startsWith('998') && phone.length > 0) {
    phone = '998' + phone;
  }
  
  phone = phone.slice(0, 12);
  
  if (phone.length === 0) return '';
  if (phone.length <= 3) return '+' + phone;
  if (phone.length <= 5) return '+998 (' + phone.slice(3);
  if (phone.length <= 8) return '+998 (' + phone.slice(3, 5) + ') ' + phone.slice(5);
  if (phone.length <= 10) return '+998 (' + phone.slice(3, 5) + ') ' + phone.slice(5, 8) + '-' + phone.slice(8);
  return '+998 (' + phone.slice(3, 5) + ') ' + phone.slice(5, 8) + '-' + phone.slice(8, 10) + '-' + phone.slice(10);
};

// Get raw phone with + prefix
export const getRawPhone = (formatted: string): string => {
  const digits = formatted.replace(/\D/g, '');
  return digits ? '+' + digits : '';
};

// Display formatted phone from stored value
export const displayPhone = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 12) return phone;
  return '+998 (' + digits.slice(3, 5) + ') ' + digits.slice(5, 8) + '-' + digits.slice(8, 10) + '-' + digits.slice(10);
};
