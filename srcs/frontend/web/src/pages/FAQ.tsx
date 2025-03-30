import React, { useState } from "react";
import {
  HelpCircle,
  ChevronDown,
  GamepadIcon,
  ShieldQuestion,
  CreditCard,
  Lock,
} from "lucide-react";

interface FAQItem {
  category: string;
  icon: React.ReactNode;
  questions: {
    question: string;
    answer: string | React.ReactNode;
  }[];
}

const FAQ: React.FC = () => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openQuestions, setOpenQuestions] = useState<{
    [key: string]: boolean;
  }>({});

  const faqData: FAQItem[] = [
    {
      category: "Getting Started",
      icon: <GamepadIcon size={24} className="text-indigo-400" />,
      questions: [
        {
          question: "How do I create an account?",
          answer: (
            <div>
              <p>Creating an account is easy:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Click "Create Account" on the homepage</li>
                <li>Fill out the registration form</li>
                <li>Verify your email address</li>
                <li>Complete your profile</li>
              </ol>
              <p className="mt-2 text-sm text-gray-400">
                You can also sign up using Google or 42 authentication.
              </p>
            </div>
          ),
        },
        {
          question: "What are the system requirements?",
          answer: (
            <div>
              <h4 className="font-semibold mb-2">Minimum Requirements:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Operating System: Windows 10/11, macOS 10.15+, Linux</li>
                <li>Processor: Intel Core i5 or equivalent</li>
                <li>Memory: 8GB RAM</li>
                <li>Graphics: DirectX 11 compatible GPU</li>
                <li>Internet: Stable broadband connection</li>
              </ul>
            </div>
          ),
        },
      ],
    },
    {
      category: "Gameplay",
      icon: <HelpCircle size={24} className="text-indigo-400" />,
      questions: [
        {
          question: "How does matchmaking work?",
          answer:
            "Our advanced matchmaking algorithm pairs you with players of similar skill levels. It considers your game history, win rate, and performance to create fair and competitive matches.",
        },
        {
          question: "Can I play with friends?",
          answer:
            "Absolutely! You can invite friends to your party, create private matches, or join tournaments together. Just use the 'Add Friend' feature in your dashboard.",
        },
      ],
    },
    {
      category: "Account & Security",
      icon: <Lock size={24} className="text-indigo-400" />,
      questions: [
        {
          question: "Is my account secure?",
          answer: (
            <div>
              <p>We take security seriously:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Two-factor authentication</li>
                <li>Encrypted data storage</li>
                <li>Regular security audits</li>
                <li>GDPR and privacy law compliance</li>
              </ul>
            </div>
          ),
        },
        {
          question: "What if I forget my password?",
          answer:
            "No worries! Click 'Forgot Password' on the login page. We'll send a reset link to your registered email address.",
        },
      ],
    },
    {
      category: "Payments & Subscriptions",
      icon: <CreditCard size={24} className="text-indigo-400" />,
      questions: [
        {
          question: "Are there different subscription tiers?",
          answer: (
            <div>
              <p>We offer three tiers:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <strong>Free Tier:</strong> Basic access, limited features
                </li>
                <li>
                  <strong>Pro Tier:</strong> Full game access, monthly
                  tournaments
                </li>
                <li>
                  <strong>Elite Tier:</strong> All Pro features + exclusive
                  content
                </li>
              </ul>
            </div>
          ),
        },
        {
          question: "How can I cancel my subscription?",
          answer:
            "You can cancel anytime from your Account Settings. No hidden fees or complicated processes.",
        },
      ],
    },
  ];

  const toggleCategory = (category: string) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  const toggleQuestion = (category: string, question: string) => {
    const key = `${category}-${question}`;
    setOpenQuestions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100 py-12">
      <div className="container-custom max-w-4xl mx-auto px-4">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 text-white">
            Frequently Asked{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
              Questions
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Got questions? We've got answers. Dive into our comprehensive FAQ to
            find quick solutions and insights about Transcendence.
          </p>
        </header>

        {/* FAQ Sections */}
        <div className="space-y-6">
          {faqData.map((category) => (
            <div
              key={category.category}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.category)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  {category.icon}
                  <h2 className="text-xl font-semibold text-white">
                    {category.category}
                  </h2>
                </div>
                <ChevronDown
                  size={24}
                  className={`text-gray-400 transform transition-transform duration-300 ${
                    openCategory === category.category ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Questions */}
              {openCategory === category.category && (
                <div className="border-t border-gray-800">
                  {category.questions.map((q, index) => (
                    <div
                      key={q.question}
                      className={`border-b border-gray-800 last:border-b-0 ${
                        index % 2 === 1 ? "bg-gray-800/50" : ""
                      }`}
                    >
                      <button
                        onClick={() =>
                          toggleQuestion(category.category, q.question)
                        }
                        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-800 transition-colors"
                      >
                        <span className="text-white font-medium pr-4">
                          {q.question}
                        </span>
                        <ChevronDown
                          size={20}
                          className={`text-gray-400 transform transition-transform duration-300 ${
                            openQuestions[`${category.category}-${q.question}`]
                              ? "rotate-180"
                              : ""
                          }`}
                        />
                      </button>
                      {openQuestions[`${category.category}-${q.question}`] && (
                        <div className="p-6 pt-0 text-gray-300">{q.answer}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">
            Didn't find the answer you were looking for?
          </p>
          <a href="/contact" className="btn-primary inline-flex items-center">
            <ShieldQuestion size={20} className="mr-2" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
