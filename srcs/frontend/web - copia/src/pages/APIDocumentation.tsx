import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

const APIDocumentation: React.FC = () => {
  const { service } = useParams<{ service: string }>();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const apiUrl = `/api/${service}/openapi`;
  const title = service
    ? `${service.charAt(0).toUpperCase() + service.slice(1)} API`
    : "API Documentation";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-40 h-40 bg-indigo-500 rounded-full opacity-10 blur-3xl -top-10 -left-10"></div>
      </div>

      <div className="container-custom relative z-10 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-lg text-indigo-300">API Documentation</p>
          </div>

          <Link
            to="/status"
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-indigo-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors duration-200"
          >
            <ArrowLeft className="mr-2 -ml-1 h-4 w-4" />
            Back to Server Status
          </Link>
        </div>

        <div className="bg-gray-900 shadow-lg overflow-hidden rounded-xl border border-gray-800">
          {/* Estilos para override de SwaggerUI para que combine con el tema */}
          <style>
            {`
            /* Estilos básicos de la interfaz */
            .swagger-ui .topbar {
              display: none;
            }
            .swagger-ui .info {
              margin: 20px 0;
            }
            .swagger-ui .info .title {
              color: #e5e7eb;
            }
            .swagger-ui .wrapper {
              padding: 0 20px;
            }
            .swagger-ui .btn {
              background-color: #4f46e5;
            }
            .swagger-ui .btn:hover {
              background-color: #4338ca;
            }
            .swagger-ui .scheme-container {
              background-color: #111827;
              box-shadow: none;
              border-bottom: 1px solid #1f2937;
            }

            /* Forzar colores de alto contraste para todo el texto */
            .swagger-ui,
            .swagger-ui .model,
            .swagger-ui div,
            .swagger-ui p,
            .swagger-ui span:not(.opblock-summary-method),
            .swagger-ui label,
            .swagger-ui .parameter__name,
            .swagger-ui .parameter__type,
            .swagger-ui table,
            .swagger-ui table thead tr th,
            .swagger-ui table tbody tr td,
            .swagger-ui section.models h4,
            .swagger-ui section.models .model-container,
            .swagger-ui .response-col_description__inner p,
            .swagger-ui .prop-format,
            .swagger-ui .markdown code,
            .swagger-ui .opblock-description-wrapper p,
            .swagger-ui .opblock .opblock-section-header h4,
            .swagger-ui .opblock .opblock-summary-description,
            .swagger-ui .parameter__extension,
            .swagger-ui .response-col_links,
            .swagger-ui .response-col_description {
              color: #e5e7eb !important;
            }

            /* Códigos de estado y métodos - colores distintivos */
            .swagger-ui .response-col_status {
              color: #f9fafb !important;
              font-weight: bold !important;
            }

            /* Modelos y esquemas */
            .swagger-ui .model-title,
            .swagger-ui .prop-name,
            .swagger-ui .prop-type {
              color: #a5b4fc !important;
              font-weight: 500 !important;
            }

            /* Ejemplos y código */
            .swagger-ui .example,
            .swagger-ui .renderedMarkdown pre,
            .swagger-ui .property.primitive {
              color: #93c5fd !important;
              background-color: #1f2937 !important;
              padding: 0.25rem !important;
            }

            /* Microlight (bloques de código) */
            .swagger-ui .microlight {
              background-color: #111827 !important; /* Fondo mucho más oscuro */
              color: #f3f4f6 !important;
              border: 1px solid #374151 !important;
              border-radius: 4px !important;
              padding: 8px !important;
              font-family: monospace !important;
              font-size: 13px !important;
              line-height: 1.5 !important;
              font-weight: normal !important; /* o 400 */
            }
            
            /* Colores para diferentes tipos de tokens en bloques de código */
            .swagger-ui .microlight .headerline {
              color: #93c5fd !important; /* Azul claro */
            }
            .swagger-ui .microlight .string {
              color: #6ee7b7 !important; /* Verde claro */
            }
            .swagger-ui .microlight .number {
              color: #fbbf24 !important; /* Amarillo */
            }
            .swagger-ui .microlight .keyword,
            .swagger-ui .microlight .token.punctuation {
              color: #e879f9 !important; /* Púrpura */
            }
            .swagger-ui .microlight .token.property {
              color: #38bdf8 !important; /* Azul claro */
            }

            /* Código de bloque específico para JSON */
            .swagger-ui pre.example,
            .swagger-ui .body-param__example {
              background-color: #111827 !important; /* Muy oscuro */
              color: #f3f4f6 !important;
              border: 1px solid #374151 !important;
              border-radius: 4px !important;
              padding: 12px !important;
              box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2) !important;
            }

            /* Ajustes para campos de formulario y controles */
            .swagger-ui select,
            .swagger-ui input[type="text"],
            .swagger-ui textarea {
              background-color: #374151 !important;
              color: #f3f4f6 !important;
              border: 1px solid #4b5563 !important;
            }

            /* Hacemos que los encabezados de secciones se destaquen más */
            .swagger-ui .opblock-tag,
            .swagger-ui .opblock .opblock-summary-operation-id,
            .swagger-ui .opblock .opblock-summary-path,
            .swagger-ui .opblock .opblock-summary-path__deprecated {
              color: #f9fafb !important;
              font-weight: 600 !important;
            }

            /* Mejorar contraste de enlaces */
            .swagger-ui a {
              color: #93c5fd !important;
            }
            .swagger-ui a:hover {
              color: #bfdbfe !important;
            }

            /* Corregir específicamente los problemas con "Response content type" */
            .swagger-ui .opblock-section-header,
            .swagger-ui table.headers-table,
            .swagger-ui table.headers-table tbody tr td,
            .swagger-ui .response-col_description__inner .markdown,
            .swagger-ui .responses-table,
            .swagger-ui .responses-table .responses-header td,
            .swagger-ui .responses-table .response-col_status,
            .swagger-ui .responses-table .response-col_description {
              background-color: #1f2937 !important;
              color: #f3f4f6 !important;
            }

            /* Contenedor de tablas de respuesta */
            .swagger-ui .responses-wrapper,
            .swagger-ui .response-content-type {
              background-color: #1f2937 !important;
              color: #f3f4f6 !important;
            }

            /* Destacar encabezados en las tablas */
            .swagger-ui .responses-table .responses-header td h5 {
              color: #f9fafb !important;
              font-weight: 600 !important;
            }

            /* Texto de respuesta */
            .swagger-ui .response-control-media-type__title,
            .swagger-ui .response-control-media-type__accept-message,
            .swagger-ui .response-control-examples__title,
            .swagger-ui .responses-header td {
              color: #e5e7eb !important;
            }

            /* Selector de tipo de contenido y ejemplos */
            .swagger-ui .content-type-wrapper select,
            .swagger-ui .example-selector select {
              background-color: #374151 !important;
              color: #f3f4f6 !important;
              border-color: #4b5563 !important;
            }
            `}
          </style>

          <SwaggerUI
            url={apiUrl}
            supportedSubmitMethods={[]}
            docExpansion="list"
            defaultModelsExpandDepth={-1}
          />
        </div>
      </div>
    </div>
  );
};

export default APIDocumentation;
