import React from 'react';

const API_BASE = 'http://localhost:5000';

/**
 * Reusable UserAvatar component.
 * Shows profile picture if available, falls back to initials.
 *
 * Props:
 *  - user: { full_name, avatar_url, role }
 *  - size: 'sm' | 'md' | 'lg' | 'xl'  (default: 'md')
 *  - className: additional CSS classes
 */
const sizeMap = {
    sm: { outer: 'w-8 h-8 rounded-xl', text: 'text-sm' },
    md: { outer: 'w-10 h-10 rounded-2xl', text: 'text-base' },
    lg: { outer: 'w-16 h-16 rounded-2xl', text: 'text-2xl' },
    xl: { outer: 'w-20 h-20 rounded-3xl', text: 'text-3xl' },
};

const UserAvatar = ({ user, size = 'md', className = '' }) => {
    const { outer, text } = sizeMap[size] || sizeMap.md;

    const avatarSrc = user?.avatar_url
        ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE}${user.avatar_url}`)
        : null;

    const initial = user?.full_name?.[0]?.toUpperCase() || 'U';

    return (
        <div className={`${outer} overflow-hidden flex-shrink-0 bg-gradient-to-br from-medical-primary to-blue-900 flex items-center justify-center ${className}`}>
            {avatarSrc ? (
                <img
                    src={avatarSrc}
                    alt={user?.full_name || 'User'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // Fallback to initial if image fails
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
            ) : null}
            <span
                className={`text-white font-black ${text} ${avatarSrc ? 'hidden' : 'flex'}`}
                style={{ display: avatarSrc ? 'none' : 'flex' }}
            >
                {initial}
            </span>
        </div>
    );
};

export default UserAvatar;
