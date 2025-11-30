import { useState } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const SECTIONS = [
  'athletic',
  'formal',
  'casual',
  'accessories',
  'footwear',
  'outerwear'
];

const SAMPLE_ITEMS = {
  athletic: ['Nike Air Max', 'Adidas Track Pants', 'Puma Running Shirt', 'Under Armour Leggings'],
  formal: ['Black Blazer', 'White Dress Shirt', 'Navy Trousers', 'Silk Tie'],
  casual: ['Blue Jeans', 'Plain T-Shirt', 'Gray Hoodie', 'Wool Sweater'],
  accessories: ['Leather Belt', 'Sport Watch', 'Sunglasses', 'Tote Bag'],
  footwear: ['Leather Boots', 'White Sneakers', 'Brown Loafers', 'Sandals'],
  outerwear: ['Denim Jacket', 'Winter Coat', 'Raincoat', 'Puffer Vest']
};

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'];
const GENDERS = ['M', 'F', 'Prefer not to say'];

export default function App() {
  const [formData, setFormData] = useState({
    storeId: 'demo-store-001',
    section: '',
    itemsTouched: [],
    timeSpent: 0,
    ageRange: '',
    gender: '',
    associateId: 'associate-01'
  });

  const [startTime] = useState(Date.now());
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSectionChange = (section) => {
    setFormData(prev => ({
      ...prev,
      section,
      itemsTouched: []
    }));
  };

  const toggleItem = (item) => {
    setFormData(prev => ({
      ...prev,
      itemsTouched: prev.itemsTouched.includes(item)
        ? prev.itemsTouched.filter(i => i !== item)
        : [...prev.itemsTouched, item]
    }));
  };

  const calculateTimeSpent = () => {
    return Math.floor((Date.now() - startTime) / 1000);
  };

  const handleSubmit = async () => {
    if (!formData.section) {
      setStatus({ type: 'error', message: 'Please select a section' });
      return;
    }
    
    if (formData.itemsTouched.length === 0) {
      setStatus({ type: 'error', message: 'Please select at least one item' });
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
      store_id: formData.storeId,
      section: formData.section,
      items_touched: formData.itemsTouched,
      time_spent_seconds: formData.timeSpent || calculateTimeSpent(),
      demographics: {
        age_range: formData.ageRange,
        gender: formData.gender
      },
      associate_id: formData.associateId
    };

    try {
      const response = await fetch('http://localhost:8000/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Session logged successfully!' });
        
        setTimeout(() => {
          setFormData({
            ...formData,
            section: '',
            itemsTouched: [],
            timeSpent: 0,
            ageRange: '',
            gender: ''
          });
          setStatus({ type: '', message: '' });
        }, 2000);
      } else {
        throw new Error('Failed to log session');
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to log session. Check if backend is running.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Fashion Intel
            </h1>
            <p className="text-gray-600">Customer Interaction Logger</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Store Section *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {SECTIONS.map(section => (
                  <button
                    key={section}
                    onClick={() => handleSectionChange(section)}
                    className={`p-4 rounded-lg border-2 font-medium capitalize transition-all ${
                      formData.section === section
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-indigo-300 text-gray-700'
                    }`}
                  >
                    {section}
                  </button>
                ))}
              </div>
            </div>

            {formData.section && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Items Touched * (Select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SAMPLE_ITEMS[formData.section].map(item => (
                    <button
                      key={item}
                      onClick={() => toggleItem(item)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        formData.itemsTouched.includes(item)
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-indigo-300 text-gray-700'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Time Spent (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={formData.timeSpent ? Math.floor(formData.timeSpent / 60) : ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  timeSpent: parseInt(e.target.value) * 60 || 0
                }))}
                placeholder="Leave blank for auto-calculation"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Age Range (optional)
                </label>
                <select
                  value={formData.ageRange}
                  onChange={(e) => setFormData(prev => ({ ...prev, ageRange: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  {AGE_RANGES.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gender (optional)
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  {GENDERS.map(gender => (
                    <option key={gender} value={gender}>{gender}</option>
                  ))}
                </select>
              </div>
            </div>

            {status.message && (
              <div className={`flex items-center gap-2 p-4 rounded-lg ${
                status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {status.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-medium">{status.message}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Logging Session...
                </>
              ) : (
                'Log Customer Interaction'
              )}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t text-center text-sm text-gray-500">
            Associate: {formData.associateId} • Store: {formData.storeId}
          </div>
        </div>
      </div>
    </div>
  );
}