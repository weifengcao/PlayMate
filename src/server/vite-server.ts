import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3000;

/**
 * This is a custom implementation of vite's server.
 * This vite instance functions as middlewre on an
 * express server. We also want to run HMR through
 * the same server, instead of opening a new port.
 * 
 * You probably shouldn't be editing this.
 */
export const createServer = async (
  root = process.cwd(),
) => {
  const resolve = (p: string) => path.resolve(__dirname, p);

  const app = express();
  const server = http.createServer(app);

  let vite: any;
  vite = await require('vite').createServer({
    root,
    logLevel: 'error',
    server: {
      middlewareMode: true,
      hmr: {
        server,
      },
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
  });

  const serve = () => {
    app.use(vite.middlewares);
    app.use('*', async (_, res) => {
      const template = fs.readFileSync(
        resolve('../../../index.html'),
        'utf-8'
      );
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    });
    server.listen(PORT, () => {
      console.log(`Listening on http://localhost:${PORT}`);
    })
  }

  return { app, serve, vite };
}