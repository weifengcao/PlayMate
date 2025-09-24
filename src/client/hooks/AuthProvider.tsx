import {
  useContext,
  createContext,
  useState,
  FC,
  ReactNode,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { shutdownTaskEvents } from "../taskEvents";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const buildUrl = (path: string) => {
  if (API_BASE) {
    if (!path.startsWith("/")) {
      return `${API_BASE}/${path}`;
    }
    return `${API_BASE}${path}`;
  }
  return path.startsWith("/") ? path : `/${path}`;
};

type LoginSuccess = {
  status: "success";
  name: string;
};

type MfaChallenge = {
  status: "mfa_required";
  userId: number;
  email: string;
  name: string;
  debugCode?: string;
};

export type LoginResult = LoginSuccess | MfaChallenge;

export interface AuthContextType {
  token: string | null;
  user: string | null;
  loginAction: (data: { identifier: string; password: string }) => Promise<LoginResult>;
  signUp: (data: { name: string; email: string; password: string }) => Promise<LoginResult>;
  verifyMfa: (data: { userId: number; code: string }) => Promise<LoginResult>;
  resendMfa: (userId: number) => Promise<MfaChallenge>;
  loginWithSocial: (data: { provider: string; email: string; name?: string }) => Promise<LoginResult>;
  logOut: () => void;
}

const resolvedLogin: LoginSuccess = { status: "success", name: "" };

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  loginAction: async () => resolvedLogin,
  signUp: async () => resolvedLogin,
  verifyMfa: async () => resolvedLogin,
  resendMfa: async () => ({ status: "mfa_required", userId: 0, email: "", name: "" }),
  loginWithSocial: async () => resolvedLogin,
  logOut: () => {},
});

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const storedUser = localStorage.getItem("site");
  const [user, setUser] = useState<string | null>(storedUser);
  const [token, setToken] = useState<string | null>(storedUser);
  const navigate = useNavigate();

  const loginAction = useCallback(
    async (data: { identifier: string; password: string }): Promise<LoginResult> => {
      try {
        const response = await fetch(buildUrl("/auth/login"), {
          credentials: "include",
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        const res = await response.json();
        if (response.status === 202 && res.status === "mfa_required") {
          return {
            status: "mfa_required",
            userId: res.data[0].userId,
            email: res.data[0].email,
            name: res.data[0].name,
            debugCode: res.debugCode,
          };
        }

        if (response.ok) {
          const userName = res.data?.[0]?.name ?? "";
          setUser(userName);
          setToken(userName);
          localStorage.setItem("site", userName);
          navigate("/dashboard");
          return { status: "success", name: userName };
        }

        throw new Error(res.message ?? "Unable to sign in.");
      } catch (err) {
        console.error(err);
        throw err;
      }
    },
    [navigate]
  );

  const verifyMfa = useCallback(
    async (data: { userId: number; code: string }): Promise<LoginResult> => {
      try {
        const response = await fetch(buildUrl("/auth/mfa/verify"), {
          credentials: "include",
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        const res = await response.json();

        if (response.ok) {
          const userName = res.data?.[0]?.name ?? "";
          setUser(userName);
          setToken(userName);
          localStorage.setItem("site", userName);
          navigate("/dashboard");
          return { status: "success", name: userName };
        }

        throw new Error(res.message ?? "Unable to verify code.");
      } catch (err) {
        console.error(err);
        throw err;
      }
    },
    [navigate]
  );

  const resendMfa = useCallback(async (userId: number): Promise<MfaChallenge> => {
    try {
      const response = await fetch(buildUrl("/auth/mfa/resend"), {
        credentials: "include",
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });
      const res = await response.json();

      if (response.status === 202 && res.status === "mfa_required") {
        return {
          status: "mfa_required",
          userId: res.data[0].userId,
          email: res.data[0].email,
          name: res.data[0].name,
          debugCode: res.debugCode,
        };
      }

      throw new Error(res.message ?? "Unable to resend code.");
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  const loginWithSocial = useCallback(
    async (data: { provider: string; email: string; name?: string }): Promise<LoginResult> => {
      try {
        const response = await fetch(buildUrl("/auth/login/social"), {
          credentials: "include",
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        const res = await response.json();

        if (response.ok) {
          const userName = res.data?.[0]?.name ?? "";
          setUser(userName);
          setToken(userName);
          localStorage.setItem("site", userName);
          navigate("/dashboard");
          return { status: "success", name: userName };
        }

        throw new Error(res.message ?? "Unable to sign in with provider.");
      } catch (err) {
        console.error(err);
        throw err;
      }
    },
    [navigate]
  );

  const signUp = useCallback(
    async (data: { name: string; email: string; password: string }): Promise<LoginResult> => {
      try {
        const response = await fetch(buildUrl("/auth/signup"), {
          credentials: "include",
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        const res = await response.json();

        const isMfaResponse =
          (response.status === 201 || response.status === 202) && res.status === "mfa_required";

        if (isMfaResponse) {
          return {
            status: "mfa_required",
            userId: res.data[0].userId,
            email: res.data[0].email,
            name: res.data[0].name,
            debugCode: res.debugCode,
          };
        }

        if (response.ok) {
          const userName = res.data?.[0]?.name ?? "";
          setUser(userName);
          setToken(userName);
          localStorage.setItem("site", userName);
          navigate("/dashboard");
          return { status: "success", name: userName };
        }

        throw new Error(res.message ?? "Unable to sign up.");
      } catch (err) {
        console.error(err);
        throw err;
      }
    },
    [navigate]
  );

  const logOut = useCallback(async () => {
    console.log("logout start");
    const response = await fetch(buildUrl("/auth/logout"), {
      credentials: "include",
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
    shutdownTaskEvents();
    localStorage.removeItem("site");
    navigate("/login");
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{ token, user, loginAction, signUp, verifyMfa, resendMfa, loginWithSocial, logOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
