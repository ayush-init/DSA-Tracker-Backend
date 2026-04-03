import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(`Sync jobs initialized (every 4 hours)`);
});