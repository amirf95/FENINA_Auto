import { useState } from "react";
import { LogIn } from "lucide-react";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("amir@fenina.tn");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onLogin(email, password);
    } catch (e) {
      setError(
        e?.message?.includes("Failed to fetch")
          ? "Impossible de joindre le serveur. Vérifiez que Django tourne sur :8000."
          : "Email ou mot de passe incorrect."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="brand" style={{ justifyContent: "center", paddingBottom: 28 }}>
          <div className="brand-mark">F</div>
          <div>
            <div className="brand-name">Fenina</div>
            <div className="brand-sub">Espace gérant</div>
          </div>
        </div>
        <form onSubmit={submit}>
          <label className="field" style={{ marginBottom: 12 }}>
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label className="field" style={{ marginBottom: 20 }}>
            <span>Mot de passe</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="danger" style={{ marginBottom: 12, fontSize: 13 }}>{error}</p>}
          <button className="btn primary" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Connexion…" : <><LogIn size={15} /> Se connecter</>}
          </button>
        </form>
      </div>
    </div>
  );
}
