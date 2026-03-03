export default function RiskBadge({ level }) {
  const styles = {
    Low: 'bg-green-100 text-green-800 border-green-200',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    High: 'bg-red-100 text-red-800 border-red-200',
  };
  const dots = {
    Low: 'bg-green-500',
    Medium: 'bg-yellow-500',
    High: 'bg-red-500',
  };
  const normalized = level ? level.charAt(0).toUpperCase() + level.slice(1).toLowerCase() : 'Low';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[normalized] || styles.Low}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[normalized] || dots.Low}`} />
      {normalized} Risk
    </span>
  );
}
