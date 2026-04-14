const MetricCard = ({ label, value, helper }) => {
  return (
    <article className="panel-card p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-4 text-4xl font-semibold">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{helper}</p>
    </article>
  );
};

export default MetricCard;
