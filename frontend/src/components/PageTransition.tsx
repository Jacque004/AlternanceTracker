import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/** Wrapper qui applique une animation d'entrée au changement de route */
export default function PageTransition({ children, className = '' }: PageTransitionProps) {
  const location = useLocation();
  return (
    <div key={location.pathname} className={`page-enter ${className}`}>
      {children}
    </div>
  );
}
