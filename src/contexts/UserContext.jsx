// contexts/UserContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Force token refresh BEFORE any Firestore read.
          // onAuthStateChanged fires as soon as Auth knows about the user
          // but the ID token may not be issued yet. Without this line,
          // request.auth is null in Firestore rules → permission-denied.
          await firebaseUser.getIdToken(true);

          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          setUserRole(userDoc.exists() ? userDoc.data().role : null);

        } catch (err) {
          console.error('[UserContext]', err.code, err.message);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }

      setLoading(false);
    });
  }, []);

  return (
    <UserContext.Provider value={{ user, userRole, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);