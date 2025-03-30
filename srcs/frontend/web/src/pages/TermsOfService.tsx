import React from "react";
import { Link } from "react-router-dom";

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100 py-12">
      <div className="container-custom max-w-4xl mx-auto px-4">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 text-white">
            Terms of Service for Transcendence
          </h1>
          <p className="text-indigo-300 max-w-2xl mx-auto">
            Last Updated: March 30, 2025
          </p>
        </header>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 space-y-8 shadow-lg">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              1. Welcome to the Digital Arena 🎮
            </h2>
            <p className="text-gray-300 mb-4">
              By using Transcendence, you're not just signing up for a game -
              you're joining a digital colosseum where only the most legendary
              players survive. Buckle up, because things are about to get epic.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              2. User Accounts: Your Digital Persona 🛡️
            </h2>
            <p className="text-gray-300 mb-4">
              - You must be at least 13 years old to create an account - One
              account per human (sorry, no AI overlords allowed) - Your username
              must not: • Impersonate Chuck Norris • Contain offensive language
              • Sound like a password generator went wild
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              3. Conduct in the Realm of Transcendence 🤺
            </h2>
            <p className="text-gray-300 mb-4">
              We believe in fair play. This means: • No cheating (we have
              algorithms that can smell your BS from a digital mile away) •
              Respect other players (trash talk is an art, harassment is not) •
              Don't exploit game bugs (unless you want to become our unpaid QA
              intern)
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              4. Data and Privacy: We're Not Watching... Much 👀
            </h2>
            <p className="text-gray-300 mb-4">
              We collect minimal data to: • Keep the game running • Prevent
              cheating • Send you epic achievement notifications • Occasionally
              laugh at your gaming stats
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              5. Intellectual Property: Your Wins, Our Platform 📜
            </h2>
            <p className="text-gray-300 mb-4">
              • Game content belongs to Transcendence • Your game achievements?
              Totally yours to brag about • We reserve the right to feature epic
              gameplay moments
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              6. Termination: When Things Go South 🚪
            </h2>
            <p className="text-gray-300 mb-4">
              We may terminate your account if you: • Violate these terms •
              Attempt to hack the game • Are generally a digital menace • Make
              our algorithms cry
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              7. Liability: The Legal Small Print 📝
            </h2>
            <p className="text-gray-300 mb-4">
              • We're not responsible for: - Rage quits - Broken keyboards -
              Friendships destroyed in competitive mode - Your sudden addiction
              to Transcendence
            </p>
          </section>

          <section className="text-center">
            <p className="text-gray-400 italic">
              By using Transcendence, you agree that gaming is serious business,
              but we don't take ourselves too seriously.
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

export default TermsOfService;
