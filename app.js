// Environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const config = require('./config');

// Express + View engine
const express = require('express');
const app = express();
app.set('view engine', 'ejs');

// Database
const { Pool } = require('pg');

const pool = new Pool({
  host: config.DB_HOST,
  database: config.DB_DATABASE,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  port: config.DB_PORT,
  max: config.DB_MAX_CONNECTIONS
});

module.exports = { pool };

// Middleware - Airbrake
const Airbrake = require('@airbrake/node');
const airbrakeExpress = require('@airbrake/node/dist/instrumentation/express');

const airbrake = new Airbrake.Notifier({
  projectId: process.env.AIRBRAKE_PROJECT_ID,
  projectKey: process.env.AIRBRAKE_PROJECT_KEY,
});

app.use(airbrakeExpress.makeMiddleware(airbrake));

// Middleware - npmjs.com/package/helmet
const helmet = require('helmet');

const generateNonce = require('./helpers/generateNonce.js');
app.use((req, res, next) => {
  res.locals.cspNonce = generateNonce();
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "block-all-mixed-content" : [],
        "font-src": ["'self'", "https://*"],
        "frame-ancestors": ["'self'"],
        "frame-src": ["'self'", "*.stripe.com"],
        "img-src": ["'self'", "https://*"],
        "object-src": ["'none'"],
        "script-src": ["'self'", "*.stripe.com" , (req, res) => `'nonce-${res.locals.cspNonce}'`],
        "script-src-attr": ["'none'"],
        "style-src": ["'self'", "https:", "'unsafe-inline'"],
        "upgrade-insecure-requests": [],
      }
    },
  })
);

// app.use(
//   helmet({
//     contentSecurityPolicy: false,
//   })
// );

// Middleware - npmjs.com/package/cors
const cors = require('cors');
app.use(cors());

// Middleware - npmjs.com/package/cookie
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Middleware - Express
app.use(express.static('public'));
app.use(express.urlencoded( { extended: false} ));

// Middleware - Custom - Authorize routes
const authorize = require("./middleware/authorize.js");

// Middleware - Routes
app.get('/', (req, res) => { res.render('index.ejs') });
app.use('/fr/a', require('./routes/frAuthenticationRoutes.js'));
app.use('/fr/tableau-de-bord', authorize, require('./routes/frDashboardRoute.js'));
app.use('/fr/classeurs', authorize, require('./routes/frBindersRoutes.js'));
app.use('/fr/s-entrainer', authorize, require('./routes/frPracticeRoutes.js'));
app.use('/fr/se-deconnecter', authorize, require('./routes/frSignOutRoute.js'));
app.use('/fr/mon-compte', authorize, require('./routes/frAccountRoutes.js'));

// Redirects for deleted pages
// app.get('/deleted-page', (req, res) => {
//    res.status(301).render('newPage.ejs');
// });

// Middleware - Send errors to Airbrake
app.use(airbrakeExpress.makeErrorHandler(airbrake));

// Middleware - Handle all errors
const handleErrors = require('./middleware/handleErrors');
app.use(handleErrors);
app.use( (req, res) => { res.status(404).render('frError404.ejs') });

// Cron
const cron = require('node-cron');
const updateCustomers = require('./helpers/updateCustomers.js');

cron.schedule('0 4 * * *', () => {
  updateCustomers.credits();
});

cron.schedule('0 5 * * *', () => {
  updateCustomers.status();
});

// Listen to incoming requests
app.listen(config.PORT, () => { 
  console.log(`Listening on port ${config.PORT}`)
});
