import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 Swagger API Docs available at http://localhost:${PORT}/api-docs`);
  console.log(`🔄 Sync jobs initialized (every 4 hours)`);
});