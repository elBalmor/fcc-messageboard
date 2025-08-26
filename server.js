'use strict';
require('dotenv').config();
const express     = require('express');
const bodyParser  = require('body-parser');
const cors        = require('cors');
const helmet      = require('helmet');

const apiRoutes         = require('./routes/api.js');
const fccTestingRoutes  = require('./routes/fcctesting.js');
const runner            = require('./test-runner');

const app = express();

/**
 * Seguridad requerida por FCC:
 *  - Solo permitir iFrame en tus páginas: X-Frame-Options: SAMEORIGIN
 *  - Desactivar DNS prefetch: X-DNS-Prefetch-Control: off
 *  - Enviar referrer solo a tu mismo origen: Referrer-Policy: same-origin
 *  - (Opcional) Desactivar CSP para evitar bloquear assets del boilerplate FCC
 */
app.use(helmet.hidePoweredBy());
app.use(helmet.noSniff());
app.use(helmet.frameguard({ action: 'sameorigin' }));          // #2 iFrame solo en tu dominio
app.use(helmet.dnsPrefetchControl({ allow: false }));          // #3 sin DNS prefetch
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));     // #4 referrer solo same-origin
app.use(helmet({ contentSecurityPolicy: false }));             // desactivar CSP para este proyecto

app.use('/public', express.static(process.cwd() + '/public'));
app.use(cors({ origin: '*' })); // For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sample front-end
app.route('/b/:board/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/board.html');
  });
app.route('/b/:board/:threadid')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/thread.html');
  });

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// For FCC testing purposes
fccTestingRoutes(app);

// Routing for API 
apiRoutes(app);

// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// Start our server and tests!
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);

  if (process.env.NODE_ENV === 'test' && !process.env.SKIP_FCC_RUNNER) {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 1500);
  }
});

module.exports = app; // for testing
