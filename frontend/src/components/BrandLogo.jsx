import { Link } from 'react-router-dom';

export default function BrandLogo({ subtitle, to = '/', compact = false }) {
  const content = (
    <>
      <img
        src="/otech-logo.png"
        alt="OTech Engineering"
        className={`brand-logo-img${compact ? ' brand-logo-img-sm' : ''}`}
      />
      {subtitle && <span className="brand-subtitle">{subtitle}</span>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="brand-lockup">
        {content}
      </Link>
    );
  }

  return <div className="brand-lockup">{content}</div>;
}
