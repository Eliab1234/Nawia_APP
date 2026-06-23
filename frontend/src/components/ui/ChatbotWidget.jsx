import React, { useState, useEffect, useRef } from 'react';

const SYSTEM_INSTRUCTION = `Eres Nawi-Bot, el asistente virtual oficial de la clínica oftalmológica Nawi. Tu único propósito es ayudar al personal y pacientes con el uso del sistema Nawi (gestión de citas, recetas de lentes, historias clínicas de agudeza visual, servicios médicos y facturación).

Aquí tienes el manual de usuario y funciones de la aplicación para guiar a los usuarios:
1. Dashboard (/dashboard): Panel de control general de la aplicación con accesos rápidos a todos los módulos y estadísticas.
2. Pacientes (/pacientes): Base de datos de pacientes. Permite registrar nuevos pacientes (DNI, nombres, apellidos, teléfono y fecha de nacimiento) y vincularlos opcionalmente con su cuenta de usuario.
3. Médicos (/medicos): Registro de doctores con su nombre, apellidos, número de colegiatura médica (CMP) y especialidad (Oftalmología General por defecto). En nuestro sistema, los médicos se gestionan desde la pestaña Gestión de Personal (/personal).
4. Servicios (/servicios): Catálogo de procedimientos médicos y consultas con sus respectivos precios (por ejemplo, Consulta General, Cirugía de Cataratas). Permite crear, editar y eliminar servicios.
5. Citas (/citas): Calendario y registro de citas. Se agenda seleccionando el paciente, el médico, el tipo de servicio y la fecha y hora de la cita.
6. Historias Clínicas (/historias): Módulo de expedientes de oftalmología. Registra la agudeza visual (OD/OI), presión intraocular (mmHg OD/OI), diagnóstico principal y observaciones adicionales del paciente. Requiere vincular a una cita previa.
7. Recetas de Lentes (/recetas): Registro óptico para la fabricación de lentes. Registra esfera, cilindro, eje, adición y distancia pupilar. Vinculada a una historia clínica.
8. Facturación (/facturacion): Gestión de cobranza. Registra el monto total de la cita, método de pago y estado del cobro (Pagado o Pendiente).
9. Usuarios (/usuarios) y Roles (/roles): Gestión de credenciales y permisos de acceso (accesibles para administradores desde la pestaña Gestión de Personal /personal).

REGLA CRÍTICA: Si el usuario te hace una pregunta alejada de esta clínica, de la oftalmología o de la administración del sistema Nawi (por ejemplo: recetas de cocina, chistes, chismes, programación de software, tareas escolares o preguntas generales no clínicas), debes negarte amigablemente a responder y recordarle que solo estás capacitado para responder dudas sobre la clínica y el sistema médico Nawi. Mantén tus respuestas en español, de manera educada, clara y concisa.`;

export const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'init-msg',
      sender: 'bot',
      text: '¡Hola! Soy Nawi-Bot, tu asistente clínico inteligente. ¿En qué sección del sistema o flujo médico te gustaría que te guíe hoy? (Prueba preguntándome sobre Citas, Pacientes o Recetas).',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll al recibir mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      setTimeout(() => {
        const botMessage = {
          id: `bot-demo-${Date.now()}`,
          sender: 'bot',
          text: 'Hola, soy Nawi-Bot. Actualmente la API Key de Gemini no está configurada en las variables de entorno de la aplicación. Por favor, configura la variable VITE_GEMINI_API_KEY en tu archivo .env local o en el panel de Vercel para poder asistirte con Inteligencia Artificial.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      // Mapear historial para la API de Gemini (con roles: user y model)
      const history = messages
        .filter((m) => m.id !== 'init-msg') // Evitar mensaje inicial en el historial
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }));

      // Añadir la última pregunta del usuario al final del historial
      history.push({
        role: 'user',
        parts: [{ text: userMessage.text }],
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: history,
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }],
            },
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500,
            },
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('Error de respuesta de la API de Gemini:', errData);
        throw new Error(errData.error?.message || 'Error al comunicarse con Gemini');
      }

      const resJson = await response.json();
      const textResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        throw new Error('La respuesta de Gemini no contiene texto');
      }

      const botMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: textResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error('Error al comunicarse con el chatbot:', err);
      const errorMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: 'Disculpa, ha ocurrido un error al procesar tu pregunta. Por favor, inténtalo de nuevo más tarde.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Convertir texto markdown simple a HTML básico (negritas y saltos de línea)
  const formatText = (text) => {
    return text.split('\n').map((line, idx) => {
      // Reemplazar **negrita**
      const formattedLine = line.split('**').map((part, i) => {
        return i % 2 === 1 ? <strong key={i}>{part}</strong> : part;
      });
      return (
        <span key={idx}>
          {formattedLine}
          <br />
        </span>
      );
    });
  };

  return (
    <>
      <style>{`
        /* --- ESTILOS DEL CHATBOT --- */
        .nawi-chat-trigger {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          box-shadow: 0 4px 16px rgba(2, 132, 199, 0.3);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          z-index: 1000;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .nawi-chat-trigger:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(2, 132, 199, 0.4);
        }

        .nawi-chat-trigger:active {
          transform: scale(0.95);
        }

        .nawi-chat-container {
          position: fixed;
          bottom: 96px;
          right: 24px;
          width: 380px;
          height: 500px;
          max-height: calc(100vh - 120px);
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          transform: scale(0.9) translateY(20px);
          opacity: 0;
          pointer-events: none;
        }

        .nawi-chat-container.open {
          transform: scale(1) translateY(0);
          opacity: 1;
          pointer-events: auto;
        }

        .nawi-chat-header {
          padding: 16px;
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .nawi-chat-header-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nawi-chat-header-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .nawi-chat-header-title h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #ffffff;
        }

        .nawi-chat-header-title span {
          font-size: 11px;
          opacity: 0.8;
          display: block;
          color: #e0f2fe;
        }

        .nawi-chat-close-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .nawi-chat-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .nawi-chat-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          background-color: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .nawi-message-bubble {
          max-width: 85%;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13.5px;
          line-height: 1.45;
          word-break: break-word;
        }

        .nawi-message-bubble.bot {
          align-self: flex-start;
          background-color: #ffffff;
          color: #1e293b;
          border-bottom-left-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .nawi-message-bubble.user {
          align-self: flex-end;
          background-color: #0284c7;
          color: white;
          border-bottom-right-radius: 4px;
          box-shadow: 0 2px 4px rgba(2, 132, 199, 0.15);
        }

        .nawi-chat-loading {
          align-self: flex-start;
          display: flex;
          gap: 4px;
          padding: 12px 16px;
          background: #ffffff;
          border-radius: 12px;
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .nawi-dot {
          width: 8px;
          height: 8px;
          background-color: #94a3b8;
          border-radius: 50%;
          animation: nawiBounce 1.4s infinite ease-in-out both;
        }

        .nawi-dot:nth-child(1) { animation-delay: -0.32s; }
        .nawi-dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes nawiBounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .nawi-chat-footer {
          padding: 12px;
          background: white;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
        }

        .nawi-chat-form {
          display: flex;
          gap: 8px;
        }

        .nawi-chat-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 20px;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.2s;
        }

        .nawi-chat-input:focus {
          border-color: #0284c7;
        }

        .nawi-chat-send-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background-color: #0284c7;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s, transform 0.1s;
        }

        .nawi-chat-send-btn:hover {
          background-color: #0369a1;
        }

        .nawi-chat-send-btn:active {
          transform: scale(0.95);
        }

        /* Responsive */
        @media (max-width: 480px) {
          .nawi-chat-container {
            bottom: 0;
            right: 0;
            width: 100vw;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
          }
        }
      `}</style>

      {/* Botón flotante para abrir chat */}
      <button 
        className="nawi-chat-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        title="Asistente Nawi-Bot"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Contenedor del Chat */}
      <div className={`nawi-chat-container ${isOpen ? 'open' : ''}`}>
        <div className="nawi-chat-header">
          <div className="nawi-chat-header-info">
            <div className="nawi-chat-header-avatar">N</div>
            <div className="nawi-chat-header-title">
              <h3>Asistente Nawi-Bot</h3>
              <span>Online • Soporte Técnico</span>
            </div>
          </div>
          <button className="nawi-chat-close-btn" onClick={() => setIsOpen(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="nawi-chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`nawi-message-bubble ${msg.sender}`}>
              {formatText(msg.text)}
            </div>
          ))}
          {isLoading && (
            <div className="nawi-chat-loading">
              <div className="nawi-dot"></div>
              <div className="nawi-dot"></div>
              <div className="nawi-dot"></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="nawi-chat-footer">
          <form onSubmit={handleSend} className="nawi-chat-form">
            <input
              type="text"
              className="nawi-chat-input"
              placeholder="Escribe tu mensaje..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="nawi-chat-send-btn" disabled={isLoading || !inputValue.trim()}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '18px', height: '18px', transform: 'rotate(-45deg)', marginRight: '-2px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ChatbotWidget;
