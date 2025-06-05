import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { GoogleUser } from '../types';
import { GOOGLE_CLIENT_ID, LOGGED_IN_USER_KEY, ACTIVE_VEHICLE_ID_KEY } from '../constants';

declare global {
  interface Window {
    google: any;
  }
}

interface AuthContextType {
  currentUser: GoogleUser | null;
  isLoading: boolean; // True while GSI is loading/initializing OR auth state is changing
  idToken: string | null; // Expose the current ID Token
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<GoogleUser | null>(() => {
    const storedUser = localStorage.getItem(LOGGED_IN_USER_KEY);
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error("Failed to parse stored user:", e);
      localStorage.removeItem(LOGGED_IN_USER_KEY);
      return null;
    }
  });
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); 

  const handleCredentialResponse = useCallback((response: any) => {
    setIsLoading(true); 
    if (response.credential) {
      try {
        const currentIdToken = response.credential;
        const base64Url = currentIdToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const parsedPayload = JSON.parse(jsonPayload);
        const user: GoogleUser = {
          id: parsedPayload.sub,
          name: parsedPayload.name,
          email: parsedPayload.email,
          picture: parsedPayload.picture,
        };
        setCurrentUser(user);
        setIdToken(currentIdToken);
        localStorage.setItem(LOGGED_IN_USER_KEY, JSON.stringify(user));
        // Do not store idToken in localStorage for long periods due to its short expiry
      } catch (error) {
        console.error("Error decoding ID token or setting user:", error);
        setCurrentUser(null);
        setIdToken(null);
        localStorage.removeItem(LOGGED_IN_USER_KEY);
      }
    } else {
        console.warn("Google Sign-In: No credential in response.");
    }
    setIsLoading(false); 
  }, []);

  const initializeGoogleSignIn = useCallback(() => {
    const clientId = GOOGLE_CLIENT_ID as string;
    // Defensive check, though the useEffect should catch this first.
    if (typeof clientId !== 'string' || 
        clientId.trim() === "" || 
        clientId === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" ||
        !clientId.endsWith(".apps.googleusercontent.com")) {
      console.error(
        "AuthContext: Attempted to initialize Google Sign-In with an invalid Client ID inside initializeGoogleSignIn. Aborting. Value:", 
        `'${clientId}' (type: ${typeof clientId})`
      );
      setIsLoading(false);
      return;
    }

    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        console.log("AuthContext: Attempting to initialize GSI with client_id:", clientId);
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false, 
          ux_mode: 'popup',
          allowed_parent_origin: 'http://localhost:5173',
          origin: 'http://localhost:5173',
          itp_support: true
        });
        console.log("AuthContext: GSI initialized successfully.");
        setIsLoading(false); 
      } catch (error) {
        console.error("AuthContext: Error initializing Google Sign-In:", error);
        setIsLoading(false);
      }
    } else {
      console.warn("AuthContext: initializeGoogleSignIn called, but GSI objects (window.google.accounts.id) not ready. Retrying in 200ms.");
      setTimeout(initializeGoogleSignIn, 200); 
    }
  }, [handleCredentialResponse]);

  useEffect(() => {
    const clientId = GOOGLE_CLIENT_ID as string;
    if (typeof clientId !== 'string' || 
        clientId.trim() === "" || 
        clientId === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" ||
        !clientId.endsWith(".apps.googleusercontent.com")) {
      console.warn(
        "AuthContext: Google Client ID is not configured correctly in constants.ts. GSI initialization will be skipped. Value found:", 
        `'${clientId}' (type: ${typeof clientId})`
      );
      setIsLoading(false);
      return; 
    }
    
    const scriptId = 'google-gsi-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log("AuthContext: Google GSI script loaded.");
        initializeGoogleSignIn();
      };
      script.onerror = () => {
        console.error("AuthContext: Failed to load Google GSI script.");
        setIsLoading(false);
      }
      document.head.appendChild(script);
    } else if (!window.google?.accounts?.id) {
       console.log("AuthContext: GSI script tag exists, but GSI objects not ready. Attempting to initialize.");
      initializeGoogleSignIn();
    } else {
      console.log("AuthContext: GSI script and objects already available. Initializing.");
      initializeGoogleSignIn();
    }
    
  }, [initializeGoogleSignIn]);
  

  const signOut = () => {
    setIsLoading(true);
    const currentUserId = currentUser?.id; 

    if (currentUserId && window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.revoke(currentUserId, (done: any) => {
        if(done.error) {
          console.error("AuthContext: Error revoking Google token:", done.error);
        } else {
          console.log('AuthContext: User token revoked from Google.');
        }
        setCurrentUser(null);
        setIdToken(null);
        localStorage.removeItem(LOGGED_IN_USER_KEY);
        localStorage.removeItem(ACTIVE_VEHICLE_ID_KEY); 
        setIsLoading(false);
      });
    } else {
        console.log("AuthContext: No current user or GSI not available for revoke, clearing local state only.");
        setCurrentUser(null);
        setIdToken(null);
        localStorage.removeItem(LOGGED_IN_USER_KEY);
        localStorage.removeItem(ACTIVE_VEHICLE_ID_KEY);
        setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, signOut, idToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};