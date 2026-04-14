const EmptyStateCard = ({ message }) => {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--line)] bg-[var(--card)] px-5 py-10 text-center text-sm leading-7 text-[var(--muted)]">
      {message}
    </div>
  );
};

export default EmptyStateCard;
