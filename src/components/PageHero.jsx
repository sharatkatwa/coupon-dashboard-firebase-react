const PageHero = ({
  eyebrow,
  title,
  description,
  sideTitle,
  sideContent,
  actions,
}) => {
  return (
    <section className="panel-card overflow-hidden">
      <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight">{title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            {description}
          </p>

          {actions ? (
            <div className="mt-6 flex flex-wrap gap-3">{actions}</div>
          ) : null}
        </div>

        <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(245,240,231,0.95),rgba(244,223,198,0.95))] p-6">
          <p className="text-sm font-medium text-[var(--muted)]">{sideTitle}</p>
          <div className="mt-4">{sideContent}</div>
        </div>
      </div>
    </section>
  );
};

export default PageHero;
