import { Layout } from '../components/Layout';
import { GithubIcon, LinkedinIcon } from 'lucide-react';

export default function Home() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Welcome to Our Platform</h1>
            <p className="text-xl text-gray-300 mb-8">
              A modern React application with TypeScript and Tailwind CSS... nice
            </p>
            <div className="flex justify-center space-x-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center">
                <GithubIcon className="w-5 h-5 mr-2" />
                GitHub
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center">
                <LinkedinIcon className="w-5 h-5 mr-2" />
                LinkedIn
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}