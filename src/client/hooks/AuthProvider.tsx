import {
  useContext,
  createContext,
  useState,
  FC,
  ReactNode,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

export interface AuthContextType {
  token: string | null;
  user: string | null;
  loginAction: (data: { username: string; password: string }) => void;
  logOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  loginAction: () => {},
  logOut: () => {},
});

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(
    localStorage.getItem("site") || ""
  );
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("site") || ""
  );
  const navigate = useNavigate();

  const loginAction = useCallback(
    async (data: { username: string; password: string }) => {
      try {
        const response = await fetch("/auth/login", {
          credentials: "same-origin",
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        const res = await response.json();
        console.log("login response is: ", res);
        console.log("response is ok: ", response.ok);
        if (response.ok) {
          const token = response.headers.get("set-cookie");
          console.log("token credz: ", token);
          for (const h of response.headers) {
            console.log("response truc: ", h);
          }
          // The token and the user name are the same.
          // I wanted to put the cookie, but I can't
          // because it is HTTP-only. So I just put the name.
          setUser(res.data[0].name);
          setToken(res.data[0].name);
          localStorage.setItem("site", res.data[0].name);
          navigate("/dashboard");
          return;
        }
        console.log("throwing an error because login failed");
        throw new Error(res.message);
      } catch (err) {
        console.error(err);
      }
    },
    [navigate]
  );

  const logOut = useCallback(async () => {
    console.log("logout start");
    const response = await fetch("/auth/logout", {
      credentials: "same-origin",
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    const res = await response.json();
    console.log("logout response is: ", res);
    console.log("response is ok: ", response.ok);
    setUser(null);
    setToken(null);
    localStorage.removeItem("site");
    navigate("/login");
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ token, user, loginAction, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};