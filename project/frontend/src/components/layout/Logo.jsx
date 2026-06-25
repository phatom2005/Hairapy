import { Link } from "react-router-dom";
import { LOGO_NGANG } from "../../lib/figmaAssets";

// Logo ngang EXE_Hairapy. to=null -> không bọc Link.
export default function Logo({ to = "/", className = "h-18 w-auto" }) {
  const img = <img src={LOGO_NGANG} alt="Hairapy" className={className} />;
  return to ? <Link to={to} className="inline-flex items-center">{img}</Link> : img;
}
