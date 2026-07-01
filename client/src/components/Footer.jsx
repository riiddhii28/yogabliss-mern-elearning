import { AiFillFacebook, AiFillTwitterSquare, AiFillInstagram } from "react-icons/ai";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <p>
        &copy; 2024 YogaBliss. All rights reserved. <br /> Made with ❤️ for a calmer world.
      </p>
      <div className="social-links">
        <a href="https://facebook.com" aria-label="Facebook"><AiFillFacebook /></a>
        <a href="https://twitter.com" aria-label="Twitter"><AiFillTwitterSquare /></a>
        <a href="https://instagram.com" aria-label="Instagram"><AiFillInstagram /></a>
      </div>
    </footer>
  );
}
