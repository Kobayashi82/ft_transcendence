import React from "react";
import { Trophy, Users, Globe, Code, Heart, Target } from "lucide-react";
import { Link } from "react-router-dom";

const About: React.FC = () => {
  // Team members (fictional)
  const teamMembers = [
    { name: "Alex Rodriguez", role: "Founder & Game Architect", avatar: "🎮" },
    { name: "Sofia Chen", role: "Lead Game Designer", avatar: "🎨" },
    { name: "Marcus Kotlin", role: "Chief Technology Officer", avatar: "💻" },
    {
      name: "Elena Petrova",
      role: "Community & Esports Manager",
      avatar: "🏆",
    },
    { name: "Jamal Williams", role: "UX/UI Design Lead", avatar: "🖌️" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100 py-12">
      <div className="container-custom max-w-5xl mx-auto px-4">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 text-white">
            About{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
              Transcendence
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            More than just a game. We're building a global community where
            skill, passion, and innovation converge to redefine digital
            competition.
          </p>
        </section>

        {/* Mission Section */}
        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center hover:border-indigo-500 transition-all">
            <Target size={48} className="mx-auto mb-4 text-indigo-400" />
            <h2 className="text-xl font-semibold mb-2 text-white">
              Our Mission
            </h2>
            <p className="text-gray-400">
              To create a platform that transforms gaming from a solitary
              experience into a global, interconnected journey of skill and
              community.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center hover:border-indigo-500 transition-all">
            <Users size={48} className="mx-auto mb-4 text-indigo-400" />
            <h2 className="text-xl font-semibold mb-2 text-white">
              Community First
            </h2>
            <p className="text-gray-400">
              We believe in building more than just a game—we're creating a
              platform where players become legends and friendships are forged.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center hover:border-indigo-500 transition-all">
            <Trophy size={48} className="mx-auto mb-4 text-indigo-400" />
            <h2 className="text-xl font-semibold mb-2 text-white">
              Fair Competition
            </h2>
            <p className="text-gray-400">
              Our advanced anti-cheat systems and balanced matchmaking ensure
              that every victory is earned through skill, not exploitation.
            </p>
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            Meet the Transcendence Crew
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center hover:border-indigo-500 transition-all"
              >
                <div className="text-5xl mb-4">{member.avatar}</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {member.name}
                </h3>
                <p className="text-gray-400">{member.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tech & Vision */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-16">
          <div className="flex items-center mb-6">
            <Code size={32} className="mr-4 text-indigo-400" />
            <h2 className="text-2xl font-semibold text-white">
              Our Tech Philosophy
            </h2>
          </div>
          <p className="text-gray-300 mb-4">
            Built with cutting-edge technologies and a passion for innovation.
            We leverage state-of-the-art infrastructure to ensure seamless,
            lag-free, and secure gaming experiences.
          </p>
          <div className="flex items-center text-gray-400">
            <Globe size={24} className="mr-2" />
            <span>
              Global infrastructure • Low-latency servers • Advanced matchmaking
            </span>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Transcend?
            </h2>
            <p className="text-indigo-100 mb-6">
              Join thousands of players in redefining what's possible in online
              gaming.
            </p>
            <div className="flex justify-center space-x-4">
              <Link to="/register" className="btn-primary">
                Create Account
              </Link>
              <Link to="/game" className="btn-secondary">
                Play Now
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
