'use client';

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  description?: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
}

export default function StatCard({ 
  icon, 
  value, 
  label, 
  description,
  gradientFrom,
  gradientTo,
  borderColor 
}: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md border-2 ${borderColor} p-6 hover:shadow-xl transition-all hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-14 h-14 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-xl flex items-center justify-center shadow-md`}>
          <span className="text-3xl">{icon}</span>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mt-1">{label}</p>
        </div>
      </div>
      {description && (
        <p className="text-sm font-medium text-gray-700 mt-2">{description}</p>
      )}
    </div>
  );
}
