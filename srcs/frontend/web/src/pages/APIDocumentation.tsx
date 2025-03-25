import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

const APIDocumentation: React.FC = () => {
  const { service } = useParams<{ service: string }>();
  
  // Define la URL de la documentación basada en el servicio
  const getDocumentationUrl = (serviceName: string): string => {
    switch (serviceName) {
      case 'auth':
        return '/api/auth/openapi';
      case 'user':
        return '/api/user/openapi';
      default:
        return `/api/${serviceName}/openapi`;
    }
  };
  
  const apiUrl = getDocumentationUrl(service || '');
  const title = service ? `${service.charAt(0).toUpperCase() + service.slice(1)} API` : 'API Documentation';
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-lg text-gray-500">
              API Documentation
            </p>
          </div>
          
          <Link
            to="/status"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
          >
            <ArrowLeft className="mr-2 -ml-1 h-4 w-4" />
            Back to Server Status
          </Link>
        </div>
        
		<div className="bg-white shadow overflow-hidden rounded-lg">
          <SwaggerUI 
            url={apiUrl} 
            // Deshabilitar la ejecución de solicitudes
            supportedSubmitMethods={[]} // Array vacío significa que no se permite ningún método
            // Opciones adicionales de solo visualización
            docExpansion="list"
            defaultModelsExpandDepth={-1} // Oculta los modelos por defecto
          />
        </div>
      </div>
    </div>
  );
};

export default APIDocumentation;