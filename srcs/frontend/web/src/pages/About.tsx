import React, { useState, useEffect } from "react";
import { ArrowLeft, Github, Linkedin, IdCard  } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

// Import local developer images
import vzurera from '../assets/developers/vzurera.jpg';
import person2 from '../assets/developers/person2.jpg';
import person3 from '../assets/developers/person3.jpg';

// Developer information type
interface Developer {
  id: string;
  name: string;
  title: string;
  bio: string;
  imageUrl: string;
  github?: string;
  linkedin?: string;
  intraLink?: string;
}

const AboutPage: React.FC = () => {
  const { t } = useLanguage();
  const [selectedDev, setSelectedDev] = useState<string | null>(null);
  
  // Scroll to top whenever selectedDev changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [selectedDev]);

  // Developer profiles with local images and 42 Intranet links
  const developers: Developer[] = [
    {
      id: "dev1",
      name: "Víctor Zurera",
      title: t('about.dev1.title'),
      bio: t('about.dev1.bio'),
      imageUrl: vzurera,
      github: "https://github.com/alexcoder",
      linkedin: "https://linkedin.com/in/alexcoder",
      intraLink: "https://profile.intra.42.fr/users/alexcoder"
    },
    {
      id: "dev2",
      name: "Person 2",
      title: t('about.dev2.title'),
      bio: t('about.dev2.bio'),
      imageUrl: person2,
      github: "https://github.com/person2",
      linkedin: "https://linkedin.com/in/person2",
      intraLink: "https://profile.intra.42.fr/users/person2"
    },
    {
      id: "dev3",
      name: "Person 3",
      title: t('about.dev3.title'),
      bio: t('about.dev3.bio'),
      imageUrl: person3,
      github: "https://github.com/person3",
      linkedin: "https://linkedin.com/in/person3",
      intraLink: "https://profile.intra.42.fr/users/person3"
    }
  ];

  // Get developer by ID
  const getDevById = (id: string): Developer | undefined => {
    return developers.find(dev => dev.id === id);
  };

  // Selected developer details
  const selectedDeveloper = selectedDev ? getDevById(selectedDev) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-indigo-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {!selectedDeveloper ? (
          // Team overview
          <div className="space-y-12">
          <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 mb-4">
            {t('about.title')}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            {t('about.subtitle')}
          </p>
          
          <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">{t('about.projectTitle')}</h2>
            <p className="text-gray-300 mb-4">{t('about.projectDescription')}</p>
            <p className="text-gray-300 mb-4">{t('about.projectJoke')}</p>
            <p className="text-blue-300 font-medium">{t('about.techStack')}</p>
            <div className="flex flex-wrap justify-center mt-4 gap-2">
            {['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Fastify', 'SQLite', 'Docker', 'Nginx'].map((tech) => (
              <span key={tech} className="bg-gray-700/60 text-gray-300 px-3 py-1 rounded-full text-sm">
              {tech}
              </span>
            ))}
            </div>
          </div>
          </div>

          <div>
          <h2 className="text-3xl font-bold text-white text-center mb-12">{t('about.meetTeam')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {developers.map((dev) => (
            <div 
              key={dev.id} 
              className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl transform transition-all duration-300 hover:scale-105 hover:shadow-blue-500/20 cursor-pointer"
              onClick={() => setSelectedDev(dev.id)}
            >
              <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
              <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="h-20 w-20 rounded-xl overflow-hidden mr-4 border-2 border-blue-600/30">
                <img 
                  src={dev.imageUrl} 
                  alt={dev.name} 
                  className="w-full h-full object-cover" 
                />
                </div>
                <div>
                <h3 className="text-xl font-bold text-white">{dev.name}</h3>
                <p className="text-blue-400">{dev.title}</p>
                </div>
              </div>
              <p className="text-gray-300 line-clamp-3 mb-4">{dev.bio}</p>
              </div>
            </div>
            ))}
          </div>
          </div>

          <div className="text-center mt-12">
          <h2 className="text-2xl font-bold text-white mb-4">{t('about.funFacts')}</h2>
          <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <p className="text-gray-300 mb-4">{t('about.funFact1')}</p>
            <p className="text-gray-300 mb-4">{t('about.funFact2')}</p>
            <p className="text-gray-300">{t('about.funFact3')}</p>
          </div>
          </div>
          </div>
        ) : (
          // Individual developer view
          <div className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl">
            <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
            <div className="p-6">
              <button 
                className="flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-6"
                onClick={() => setSelectedDev(null)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('about.backToTeam')}
              </button>
              
              <div className="md:flex items-start">
                <div className="md:w-1/3 mb-6 md:mb-0 md:mr-8">
                  <div className="rounded-xl overflow-hidden border-2 border-blue-600/30 mb-4">
                    <img 
                      src={selectedDeveloper.imageUrl} 
                      alt={selectedDeveloper.name} 
                      className="w-full object-cover" 
                    />
                  </div>
                  
                  <div className="flex justify-center space-x-4 mb-4">
                    {selectedDeveloper.github && (
                      <a 
                        href={selectedDeveloper.github} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-white transition-colors"
                        aria-label="GitHub"
                      >
                        <Github className="w-6 h-6" />
                      </a>
                    )}
                    {selectedDeveloper.linkedin && (
                      <a 
                        href={selectedDeveloper.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-white transition-colors"
                        aria-label="LinkedIn"
                      >
                        <Linkedin className="w-6 h-6" />
                      </a>
                    )}
                    {selectedDeveloper.intraLink && (
                      <a 
                        href={selectedDeveloper.intraLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-white transition-colors"
                        aria-label="42 Intranet"
                      >
                        <IdCard className="w-6 h-6" />
                      </a>
                    )}
                  </div>
                </div>
                
                <div className="md:w-2/3">
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedDeveloper.name}</h3>
                  <p className="text-blue-400 text-lg mb-4">{selectedDeveloper.title}</p>
                  <div className="text-gray-300 space-y-4">
                    <p>{selectedDeveloper.bio}</p>
                    <p>{t(`about.${selectedDeveloper.id}.detail1`)}</p>
                    <p>{t(`about.${selectedDeveloper.id}.detail2`)}</p>
                    <p>{t(`about.${selectedDeveloper.id}.funFact`)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AboutPage;