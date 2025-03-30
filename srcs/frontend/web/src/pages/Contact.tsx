import React, { useState, FormEvent } from "react";
import {
  Mail,
  MessageCircle,
  User,
  Send,
  MapPin,
  Phone,
  Clock,
  Globe,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
} from "lucide-react";

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmissionStatus("sending");

    try {
      // Simulate form submission
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Reset form and show success
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
      setSubmissionStatus("success");

      // Reset status after 3 seconds
      setTimeout(() => setSubmissionStatus("idle"), 3000);
    } catch (error) {
      setSubmissionStatus("error");
      setTimeout(() => setSubmissionStatus("idle"), 3000);
    }
  };

  // Social media links
  const socialLinks = [
    {
      name: "Twitter",
      icon: <Twitter size={24} />,
      url: "https://twitter.com/transcendence",
      color: "hover:text-[#1DA1F2]",
    },
    {
      name: "Facebook",
      icon: <Facebook size={24} />,
      url: "https://facebook.com/transcendence",
      color: "hover:text-[#4267B2]",
    },
    {
      name: "LinkedIn",
      icon: <Linkedin size={24} />,
      url: "https://linkedin.com/company/transcendence",
      color: "hover:text-[#0A66C2]",
    },
    {
      name: "Instagram",
      icon: <Instagram size={24} />,
      url: "https://instagram.com/transcendence",
      color: "hover:text-[#C13584]",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100 py-12">
      <div className="container-custom max-w-6xl mx-auto px-4">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 text-white">
            Contact{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
              Transcendence
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Have a question, suggestion, or just want to chat? Our team is ready
            to level up your communication!
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Your Name"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Subject
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MessageCircle size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="What can we help you with?"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your message..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submissionStatus === "sending"}
                className="w-full btn-primary flex items-center justify-center"
              >
                {submissionStatus === "sending" ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Send Message
                  </>
                )}
              </button>

              {/* Submission Status Messages */}
              {submissionStatus === "success" && (
                <div className="mt-4 p-4 bg-green-900/30 border border-green-700 rounded-md text-green-300">
                  Message sent successfully! Our team will get back to you soon.
                </div>
              )}
              {submissionStatus === "error" && (
                <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-md text-red-300">
                  Oops! Something went wrong. Please try again later.
                </div>
              )}
            </form>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-6">
            <div className="flex items-center border-b border-gray-800 pb-4">
              <MapPin size={24} className="mr-3 text-indigo-400" />
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Headquarters
                </h3>
                <p className="text-gray-400">
                  Campus 42, 96 Boulevard Bessières 75017 Paris, France
                </p>
              </div>
            </div>

            <div className="flex items-center border-b border-gray-800 pb-4">
              <Phone size={24} className="mr-3 text-indigo-400" />
              <div>
                <h3 className="text-xl font-semibold text-white">Support</h3>
                <p className="text-gray-400">
                  +33 (0)1 42 42 42 42
                  <span className="block text-xs text-gray-500">
                    Mon-Fri, 9 AM - 6 PM CET
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <Mail size={24} className="mr-3 text-indigo-400" />
              <div>
                <h3 className="text-xl font-semibold text-white">Email</h3>
                <div className="text-gray-400">
                  <p>General: hello@transcendence.42</p>
                  <p>Support: support@transcendence.42</p>
                  <p>Partnerships: partners@transcendence.42</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Section */}
        <div className="mt-16 bg-gray-900 border border-gray-800 rounded-xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Connect with Us
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Follow Transcendence on social media to stay updated with the
              latest news, game updates, and community highlights.
            </p>
          </div>

          <div className="flex justify-center space-x-8">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-gray-400 ${social.color} transition-colors duration-300 hover:scale-110`}
                title={social.name}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {/* FAQ Hint */}
        <div className="mt-16 text-center">
          <p className="text-gray-400">
            Check our{" "}
            <a href="/faq" className="text-indigo-400 hover:text-indigo-300">
              FAQ
            </a>{" "}
            for quick answers to common questions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contact;
