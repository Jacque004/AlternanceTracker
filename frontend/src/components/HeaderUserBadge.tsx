import { Link } from 'react-router-dom';
import { User } from '../types';
import { userCompactName, userFullName, userInitials } from '../utils/userDisplay';

type HeaderUserBadgeProps = {
  user: User;
  /** Version courte pour la barre mobile */
  compact?: boolean;
};

const HeaderUserBadge = ({ user, compact = false }: HeaderUserBadgeProps) => {
  const fullName = userFullName(user.firstName, user.lastName) || 'Mon espace';
  const label = compact ? userCompactName(user.firstName, user.lastName) : fullName;
  const initials = userInitials(user.firstName, user.lastName);

  return (
    <Link
      to="/profile"
      className={`group flex items-center gap-2 min-w-0 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 transition-colors ${
        compact ? 'py-1 pr-1 pl-0.5 max-w-[min(32vw,8.5rem)]' : 'py-1.5 px-2 max-w-[min(12rem,28vw)] xl:max-w-[14rem]'
      }`}
      title={fullName}
      aria-label={`Mon espace — ${fullName}`}
    >
      <span
        className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-xs font-semibold text-primary-700 ring-1 ring-primary-200/80"
        aria-hidden
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </span>
      <span
        className={`min-w-0 truncate font-medium text-gray-700 group-hover:text-gray-900 ${
          compact ? 'text-xs sm:text-sm' : 'text-sm'
        }`}
      >
        {label}
      </span>
    </Link>
  );
};

export default HeaderUserBadge;
