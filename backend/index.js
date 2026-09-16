const express = require('express');
const app = express();
const port = 4000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

app.listen(port, () => {
  console.log(`Backend service listening on port ${port}`);
});
