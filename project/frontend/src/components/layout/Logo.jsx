import { Link } from "react-router-dom";
import { LOGO_STACK } from "../../lib/figmaAssets";

// Logo dọc (icon trên, chữ "hairapy" + slogan dưới). to=null -> không bọc Link.
export default function Logo({ to = "/", className = "h-14 w-auto" }) {
  const img = <img src={LOGO_STACK} alt="Hairapy" className={className} />;
  return to ? <Link to={to} className="inline-flex items-center">{img}</Link> : img;
}
