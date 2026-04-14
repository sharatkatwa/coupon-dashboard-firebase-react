const SectionHeader = ({ title, description, action }) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-xl font-semibold">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
};

export default SectionHeader;
