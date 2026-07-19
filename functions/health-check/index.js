'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const app = express();

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'ksp-crime-intel', timestamp: new Date().toISOString() });
});

app.get('/whoami', (req, res) => {
  const catalystApp = catalyst.initialize(req);
  catalystApp.userManagement().getCurrentUser()
    .then(user => {
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      res.status(200).json({ user });
    })
    .catch(err => res.status(401).json({ error: 'Not authenticated', details: err.message }));
});

module.exports = app;