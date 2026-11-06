import { Link } from "react-router-dom";
import { LOGO_NGANG, LOGO_NGANG_SIZE } from "../../lib/figmaAssets";

// Logo ngang EXE_Hairapy. to=null -> không bọc Link.
export default function Logo({ to = "/", className = "h-18 w-auto" }) {
  const img = <img src={LOGO_NGANG} alt="Hairapy" {...LOGO_NGANG_SIZE} decoding="async" className={className} />;
  return to ? <Link to={to} className="inline-flex items-center">{img}</Link> : img;
}
