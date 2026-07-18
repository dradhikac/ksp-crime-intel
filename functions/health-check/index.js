'use strict';
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ksp-crime-intel',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;