const NotAuthorized = () => (
  <div className="flex flex-col items-center justify-center h-screen text-center">
    <h1 className="text-4xl font-bold mb-4">No autorizado</h1>
    <p className="text-gray-500 mb-6">No tienes permisos para acceder a esta página.</p>
    <a href="/" className="text-primary underline">Volver al inicio</a>
  </div>
);

export default NotAuthorized;
