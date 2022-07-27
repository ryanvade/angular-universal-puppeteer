import 'zone.js/dist/zone-node';

import { RenderOptions } from '@nguniversal/express-engine';
import * as express from 'express';
import { join } from 'path';

import { AppServerModule } from './src/main.server';
import { existsSync } from 'fs';
import { CommonEngine } from '@nguniversal/common/engine';
import * as puppeteer from 'puppeteer';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), 'dist/ssr-example/browser');
  const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index.html';

  // Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
  // server.engine('html', ngExpressEngine({
  //   bootstrap: AppServerModule,
  // }));

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('*.*', express.static(distFolder, {
    maxAge: '1y'
  }));

  server.get('/reports/pdf', async (req, res) => {
    const engine = new CommonEngine(AppServerModule, []);
    const renderOptions = {  } as RenderOptions;
    renderOptions.url = renderOptions.url ?? `/`;
    renderOptions.documentFilePath = join(distFolder, indexHtml);
    renderOptions.providers = [];

    try {
      const html = await engine.render(renderOptions);
      const browser = await puppeteer.launch({
        // Not sure why, but I had to set the path otherwise this wouldn't work
        executablePath: './node_modules/puppeteer/.local-chromium/mac-1022525/chrome-mac/Chromium.app/Contents/MacOS/Chromium'
      });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdfBuffer = await page.pdf();

      await page.close();
      await browser.close();

      res.contentType('application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
      res.send(pdfBuffer);
    } catch (error) {
      console.error({ error });
      res.type('txt').send(error);
    }
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/main.server';
