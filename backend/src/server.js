import 'dotenv/config';
import app from './app.js';
import { validateSessionConfiguration } from './lib/session.js';

validateSessionConfiguration();

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
  console.log(`ALIS API listening on port ${port}`);
});
