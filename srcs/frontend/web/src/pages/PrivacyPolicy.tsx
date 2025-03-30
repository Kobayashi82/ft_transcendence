import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Database,
  UserCheck,
  Globe,
  MessageCircle,
} from "lucide-react";

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100 py-12">
      <div className="container-custom max-w-4xl mx-auto px-4">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 text-white">
            Transcendence Privacy Policy
          </h1>
          <p className="text-indigo-300 max-w-2xl mx-auto">
            Last Updated: March 30, 2025
          </p>
        </header>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 space-y-8 shadow-lg">
          <section>
            <div className="flex items-center mb-4">
              <ShieldCheck className="mr-3 text-indigo-400" size={32} />
              <h2 className="text-2xl font-semibold text-white">
                Your Privacy is Our Game Mode: Hardcore Protection 🔒
              </h2>
            </div>
            <p className="text-gray-300 mb-4">
              At Transcendence, we take your privacy more seriously than a
              professional gamer takes their kill-death ratio. This means we're
              committed to protecting your data like it's the final boss in an
              impossible difficulty mode.
            </p>
          </section>

          <section>
            <div className="flex items-center mb-4">
              <Database className="mr-3 text-indigo-400" size={32} />
              <h2 className="text-2xl font-semibold text-white">
                What Data Do We Collect? 📊
              </h2>
            </div>
            <p className="text-gray-300 mb-4">
              We collect only the data necessary to make your gaming experience
              epic and secure: • Username and email • Game performance metrics •
              Login information • Device and connection information Think of it
              like your character's stats - just the essentials to track your
              legendary journey.
            </p>
          </section>

          <section>
            <div className="flex items-center mb-4">
              <UserCheck className="mr-3 text-indigo-400" size={32} />
              <h2 className="text-2xl font-semibold text-white">
                GDPR Compliance: Your Digital Rights 🇪🇺
              </h2>
            </div>
            <p className="text-gray-300 mb-4">
              As a platform based in the EU, we're fully GDPR compliant. This
              means you have: • Right to access your data • Right to be
              forgotten • Right to data portability • Right to object to
              processing Consider these your fundamental player rights - no
              grinding required to unlock them!
            </p>
          </section>

          <section>
            <div className="flex items-center mb-4">
              <Globe className="mr-3 text-indigo-400" size={32} />
              <h2 className="text-2xl font-semibold text-white">
                Data Sharing: We're Not Gossips 🤫
              </h2>
            </div>
            <p className="text-gray-300 mb-4">
              We do not sell your data. Period. We might share aggregated,
              anonymized data for: • Improving game performance • Understanding
              player behaviors • Creating cool statistical infographics Your
              personal data is more protected than the final treasure in a raid
              dungeon.
            </p>
          </section>

          <section>
            <div className="flex items-center mb-4">
              <Lock className="mr-3 text-indigo-400" size={32} />
              <h2 className="text-2xl font-semibold text-white">
                Security: Our Always-On Shield 🛡️
              </h2>
            </div>
            <p className="text-gray-300 mb-4">
              We implement: • State-of-the-art encryption • Regular security
              audits • Multi-factor authentication • Advanced threat detection
              Our security is like a max-level tank protecting your digital
              existence.
            </p>
          </section>

          <section>
            <div className="flex items-center mb-4">
              <MessageCircle className="mr-3 text-indigo-400" size={32} />
              <h2 className="text-2xl font-semibold text-white">
                Cookies and Tracking: The Necessary Evil 🍪
              </h2>
            </div>
            <p className="text-gray-300 mb-4">
              We use cookies to: • Remember your login • Customize your
              experience • Track game performance You can disable cookies, but
              it might affect your gaming experience. Like playing without
              power-ups.
            </p>
          </section>

          <section className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-2">
              Contact Our Privacy Quest Givers
            </h3>
            <p className="text-gray-300">
              Questions about your data? Reach out to our Data Protection
              Officer:
              <br />
              <strong>Email:</strong> privacy@transcendence.42.fr
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="btn-primary inline-flex items-center">
            Back to Transcendence
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
