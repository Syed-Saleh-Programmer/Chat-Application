import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LogoutButton = () => {
  const { logout } = useAuth0();

  return (
    <button
      onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors text-sm"
    >
      Logout
    </button>
  );
};

export default LogoutButton;