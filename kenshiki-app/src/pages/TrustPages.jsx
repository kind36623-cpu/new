import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Database, Mail, Trash2 } from 'lucide-react';

const pageStyle = {
  minHeight: '100vh',
  background: '#06071a',
  color: '#e2e8f0',
  fontFamily: "'Inter','Outfit',sans-serif",
};
const containerStyle = {
  maxWidth: 760, margin: '0 auto', padding: '100px 32px 80px',
};
const h1Style = {
  fontFamily: "'Cinzel',serif", fontSize: 'clamp(28px,4vw,42px)', fontWeight: 700,
  background: 'linear-gradient(135deg,#a5b4fc,#c084fc)', WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent', marginBottom: 12,
};
const h2Style = { fontSize: 18, fontWeight: 700, color: '#e2e8f0', margin: '36px 0 10px' };
const pStyle = { fontSize: 15, color: '#64748b', lineHeight: 1.8, marginBottom: 12 };
const backLink = {
  display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 40,
  fontSize: 13, fontWeight: 600, color: '#6d28d9', textDecoration: 'none',
  padding: '8px 16px', borderRadius: 20,
  background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.25)',
};

export function AboutPage() {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Link to="/" style={backLink}><ArrowLeft size={14}/> Home</Link>
        <h1 style={h1Style}>About Kenshiki</h1>
        <p style={{ ...pStyle, fontSize: 17, color: '#94a3b8', marginBottom: 32 }}>
          Your AI-powered global intelligence command center.
        </p>
        <h2 style={h2Style}>What is Kenshiki?</h2>
        <p style={pStyle}>
          Kenshiki (見識 — Japanese for "insight" or "knowledge") is an AI intelligence platform that aggregates global news across multiple domains and transforms raw headlines into deep analytical briefs using large language models.
        </p>
        <h2 style={h2Style}>Our Mission</h2>
        <p style={pStyle}>
          We believe everyone deserves access to clear, contextual, and unbiased intelligence. Kenshiki bridges the gap between raw news and true understanding — giving individuals the same analytical power once reserved for professional intelligence analysts.
        </p>
        <h2 style={h2Style}>Technology</h2>
        <p style={pStyle}>Built with React, Firebase, Node.js, Groq LLaMA 3.3, Google Gemini, and MapLibre GL. News sourced from trusted global outlets via RSS and news APIs.</p>
        <h2 style={h2Style}>Contact</h2>
        <p style={pStyle}>For questions, feedback, or partnership inquiries, reach us via the platform or open an issue on our GitHub repository.</p>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Link to="/" style={backLink}><ArrowLeft size={14}/> Home</Link>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:12 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'rgba(99,102,241,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Shield size={22} style={{ color:'#818cf8' }}/>
          </div>
          <h1 style={{ ...h1Style, marginBottom:0 }}>Privacy Policy</h1>
        </div>
        <p style={{ ...pStyle, color:'#475569', marginBottom:32 }}>Last updated: {new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}</p>

        <h2 style={h2Style}><Eye size={16} style={{ display:'inline', marginRight:8, color:'#818cf8', verticalAlign:'middle' }}/>What We Collect</h2>
        <p style={pStyle}>When you sign up, we collect your email address and display name via Firebase Authentication. We do not sell, share, or rent your personal information to any third party.</p>

        <h2 style={h2Style}><Database size={16} style={{ display:'inline', marginRight:8, color:'#818cf8', verticalAlign:'middle' }}/>How We Use It</h2>
        <p style={pStyle}>Your email is used solely for authentication and optional notification features. Saved articles and preferences are stored locally in your browser and optionally in your Firebase account.</p>

        <h2 style={h2Style}>Cookies & Local Storage</h2>
        <p style={pStyle}>Kenshiki uses browser localStorage to store preferences, saved articles, and voice agent settings. Firebase may set authentication cookies. No advertising or tracking cookies are used.</p>

        <h2 style={h2Style}>Third-Party Services</h2>
        <p style={pStyle}>We use Firebase (Google) for authentication, Groq for AI processing, and Nominatim/OpenStreetMap for geocoding. Each service has its own privacy policy.</p>

        <h2 style={h2Style}><Trash2 size={16} style={{ display:'inline', marginRight:8, color:'#818cf8', verticalAlign:'middle' }}/>Data Deletion</h2>
        <p style={pStyle}>You may delete your account at any time. This permanently removes your authentication record. To request deletion of any associated data, contact us with your registered email address.</p>

        <h2 style={h2Style}><Mail size={16} style={{ display:'inline', marginRight:8, color:'#818cf8', verticalAlign:'middle' }}/>Contact</h2>
        <p style={pStyle}>For any privacy-related concerns, please contact the Kenshiki team directly via GitHub or the app's contact form.</p>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Link to="/" style={backLink}><ArrowLeft size={14}/> Home</Link>
        <h1 style={h1Style}>Terms of Service</h1>
        <p style={{ ...pStyle, color:'#475569', marginBottom:32 }}>Last updated: {new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}</p>

        <h2 style={h2Style}>1. Acceptance of Terms</h2>
        <p style={pStyle}>By accessing or using Kenshiki, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>

        <h2 style={h2Style}>2. Use of Service</h2>
        <p style={pStyle}>Kenshiki is provided for personal, non-commercial informational use. You agree not to misuse the platform, attempt to circumvent access controls, or use it for any unlawful purpose.</p>

        <h2 style={h2Style}>3. AI-Generated Content</h2>
        <p style={pStyle}>Intelligence briefs generated by Kenshiki's AI are synthesized from publicly available news sources. They are provided for informational purposes only and should not be relied upon as professional advice. Always verify information with primary sources.</p>

        <h2 style={h2Style}>4. Intellectual Property</h2>
        <p style={pStyle}>News content belongs to its respective publishers. Kenshiki's interface, design, and AI processing pipeline are proprietary. AI-generated briefs are derivative works provided under fair use for informational purposes.</p>

        <h2 style={h2Style}>5. Account Responsibility</h2>
        <p style={pStyle}>You are responsible for maintaining the security of your account. Kenshiki is not liable for any losses resulting from unauthorized access to your account.</p>

        <h2 style={h2Style}>6. Disclaimer of Warranties</h2>
        <p style={pStyle}>Kenshiki is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service, accuracy of AI-generated content, or availability of any specific news source.</p>

        <h2 style={h2Style}>7. Changes to Terms</h2>
        <p style={pStyle}>We reserve the right to update these terms at any time. Continued use of Kenshiki after changes constitutes your acceptance of the updated terms.</p>
      </div>
    </div>
  );
}
