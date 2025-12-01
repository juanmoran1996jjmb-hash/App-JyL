import React, { useState } from 'react';
import { RefreshCcw, Quote } from 'lucide-react'; // Íconos para la interfaz
import './index.css'; // Asegura que los estilos Tailwind se apliquen

// Definición del componente principal de la aplicación.
const App = () => {
  // Lista de citas motivacionales en español
  const quotes = [
    "El éxito no es el final, el fracaso no es fatal: es el coraje para continuar lo que cuenta.",
    "El único modo de hacer un gran trabajo es amar lo que haces.",
    "No se trata de dónde vienes, sino de dónde vas.",
    "Cree en ti mismo y en todo lo que eres. Sabe que hay algo dentro de ti que es más grande que cualquier obstáculo.",
    "La innovación distingue a un líder de un seguidor.",
    "El futuro pertenece a quienes creen en la belleza de sus sueños.",
    "Empieza donde estás. Usa lo que tienes. Haz lo que puedas.",
  ];

  // Estado para mantener el índice de la cita actual
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Función para generar un nuevo índice de cita de forma aleatoria
  const generateNewQuote = () => {
    let newIndex;
    do {
      // Genera un nuevo índice aleatorio
      newIndex = Math.floor(Math.random() * quotes.length);
    } while (newIndex === quoteIndex && quotes.length > 1); // Asegura que no se repita la misma cita si hay más de una

    setQuoteIndex(newIndex);
  };

  return (
    // Contenedor principal con diseño centrado y responsivo (Tailwind CSS)
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-xl p-8 transition duration-300 hover:shadow-3xl">

        {/* Encabezado */}
        <h1 className="text-3xl font-extrabold text-blue-700 text-center mb-6 border-b-2 border-blue-100 pb-3">
          Generador de Citas
        </h1>

        {/* Tarjeta de la Cita */}
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500 mb-8">
          <div className="flex items-start space-x-3">
            <Quote className="text-blue-600 h-6 w-6 flex-shrink-0 mt-1" />
            <p className="text-lg italic font-medium text-gray-800 leading-relaxed">
              "{quotes[quoteIndex]}"
            </p>
          </div>
        </div>

        {/* Botón para generar nueva cita */}
        <button
          onClick={generateNewQuote}
          className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-lg shadow-lg text-white bg-blue-600 hover:bg-blue-700 transition duration-150 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          <RefreshCcw className="w-5 h-5 mr-3" />
          Generar Nueva Cita
        </button>

        {/* Pie de página */}
        <p className="mt-8 text-center text-sm text-gray-500">
          Desplegado en Vercel con Zero Configuration
        </p>
      </div>
    </div>
  );
};

// Exportación del componente principal
export default App;
