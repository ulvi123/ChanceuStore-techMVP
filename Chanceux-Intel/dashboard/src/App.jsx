import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Clock, Package } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function Dashboard() {
  const [insights, setInsights] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [actionableInsights, setActionableInsights] = useState([]);
  const storeId = 'demo-store-001';


  useEffect(() => {
    const fetchRecommendations = async () => {
      if (sectionData.length > 0) {
        const topSection = sectionData[0].name.toLowerCase();
        const res = await fetch(`http://localhost:8000/recommendations/sections/${topSection}`);
        const data = await res.json();
        setRecommendations(data.they_also_visit || []);
      }
    };

    if (insights) fetchRecommendations();
  }, [insights]);

  useEffect(() => {
    const fetchActionable = async () => {
      const res = await fetch(`http://localhost:8000/insights/${storeId}/actionable`);
      const data = await res.json();
      setActionableInsights(data.insights || []);
    };

    if (insights) fetchActionable();
  }, [insights]);

  const fetchData = async () => {
    try {
      const [insightsRes, sessionsRes] = await Promise.all([
        fetch(`http://localhost:8000/insights/${storeId}`),
        fetch(`http://localhost:8000/sessions/${storeId}?limit=20`)
      ]);

      if (!insightsRes.ok || !sessionsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const insightsData = await insightsRes.json();
      const sessionsData = await sessionsRes.json();

      setInsights(insightsData);
      setSessions(sessionsData.sessions);
      setError('');
    } catch (err) {
      setError('Failed to load data. Make sure backend is running on localhost:8000');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSectionData = () => {
    if (!insights?.top_sections) return [];
    return insights.top_sections.map(s => ({
      name: s._id.charAt(0).toUpperCase() + s._id.slice(1),
      visits: s.visits,
      avgTime: Math.round(s.avg_time),
      items: s.total_items_touched
    }));
  };

  const getGenderDistribution = () => {
    const genderCounts = sessions.reduce((acc, session) => {
      const gender = session.demographics?.gender || 'Unknown';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(genderCounts).map(([name, value]) => ({ name, value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800 font-medium">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const sectionData = getSectionData();
  const genderData = getGenderDistribution();
  const avgTimeSpent = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.time_spent_seconds, 0) / sessions.length)
    : 0;
  const avgItemsTouched = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.items_touched.length, 0) / sessions.length)
    : 0;




  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Fashion Intel Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Store: {storeId}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sessions Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {insights?.total_sessions_today || 0}
                </p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Time Spent</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatTime(avgTimeSpent)}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Items Touched</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {avgItemsTouched}
                </p>
              </div>
              <div className="bg-pink-100 p-3 rounded-lg">
                <Package className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Section</p>
                <p className="text-2xl font-bold text-gray-900 mt-2 capitalize">
                  {sectionData[0]?.name || 'N/A'}
                </p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Section Visits */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Visits by Section</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="visits" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gender Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Demographics</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recommendations Section */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm p-6 border border-indigo-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            💡 Smart Insights
          </h2>
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              <strong>Cross-sell opportunity:</strong> Customers who browse{' '}
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-medium">
                {sectionData[0]?.name}
              </span>{' '}
              also visit:
            </p>
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3">
                <span className="font-medium capitalize">{rec.section}</span>
                <span className="text-sm text-gray-600">{rec.percentage.toFixed(0)}% of customers</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Wins */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ Quick Wins</h2>
          <div className="space-y-3">
            {actionableInsights.map((insight, idx) => (
              <div key={idx} className={`border-l-4 p-4 rounded ${insight.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                  insight.type === 'opportunity' ? 'border-blue-500 bg-blue-50' :
                    'border-green-500 bg-green-50'
                }`}>
                <h3 className="font-semibold text-sm mb-1">{insight.title}</h3>
                <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                <p className="text-xs font-medium text-gray-600">
                  💡 Action: {insight.action}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Customer Sessions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Section
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items Touched
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Demographics
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.slice(0, 10).map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(session.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full capitalize">
                        {session.section}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {session.items_touched.length} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(session.time_spent_seconds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.demographics?.age_range || 'N/A'} • {session.demographics?.gender || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Dashboard auto-refreshes every 5 seconds
        </div>
      </div>
    </div>
  );
}