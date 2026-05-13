import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import logo from '../../assets/logo.png';

const Footer = () => (
  <footer className="footer">
    <div className="footer-inner">
      <div className="footer-logo">
  <img src={logo} alt="Clean India" className="footer-custom-logo" />
  <p>Making India cleaner, one dustbin at a time.</p>
</div>
      <div className="footer-links">
        <Link to="/feed">Feed</Link>
        <Link to="/leaderboard">Leaderboard</Link>
        <Link to="/register">Join Now</Link>
      </div>
      <div className="footer-copy">© {new Date().getFullYear()} Clean India. Built for Swachh Bharat.</div>
    </div>
  </footer>
);

export default Footer;
