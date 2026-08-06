export function RoutePlaceholder({
  eyebrow,
  title,
  description,
  nextStep,
}: {
  eyebrow: string;
  title: string;
  description: string;
  nextStep: string;
}) {
  return (
    <section aria-labelledby="page-title">
      <div className="page-heading">
        <p className="page-eyebrow">{eyebrow}</p>
        <h1 className="page-title" id="page-title">
          {title}
        </h1>
        <p className="page-description">{description}</p>
      </div>

      <div className="placeholder-card">
        <span className="placeholder-status">Ready for the next build</span>
        <h2 className="placeholder-title">{nextStep}</h2>
        <p className="placeholder-copy">
          This destination is connected and ready for its feature work. The
          shared navigation will stay in place as the experience grows.
        </p>
      </div>
    </section>
  );
}
