import { Link } from "react-router-dom";
import { useTheme } from "../../providers/ThemeProvider";
import logoBlack from "../../public/logo/logo-black-transparent.png";
import logoWhite from "../../public/logo/logo-white-transparent.png";

export const Footer = () => {
  const { theme } = useTheme();
  const brandLogo = theme === "light" ? logoBlack : logoWhite;

  return (
    <footer className="site-footer">
      <div>
        <Link className="site-footer__brand" to="/">
          <img alt="ArtBlock" className="site-footer__brand-image" src={brandLogo} />
        </Link>
        <p>Mobile-first creator engagement with a minimal, production-ready baseline.</p>
      </div>
      <div className="site-footer__meta">
        <a href="#about">About</a>
        <a href="#features">Features</a>
        <a href="#cta">Join</a>
      </div>
    </footer>
  );
};
