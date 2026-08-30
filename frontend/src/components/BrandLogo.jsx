import { Link } from 'react-router-dom';
import FleetIcon from './FleetIcon';

export default function BrandLogo({
  subtitle,
  to = '/',
  compact = false,
  showFleetIcon = true,
  fleetIconSize,
}) {
  const iconSize = fleetIconSize ?? (compact ? 22 : 24);

  const content = (
    <>
      <img
        src="/otech-logo.png"
        alt="OTech Engineering"
        className={`brand-logo-img${compact ? ' brand-logo-img-sm' : ''}`}
      />
      {subtitle && (
        <div className="brand-product-lockup">
          {showFleetIcon && (
            <FleetIcon size={iconSize} className="brand-fleet-icon" />
          )}
          <span className="brand-subtitle">{subtitle}</span>
        </div>
      )}
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
