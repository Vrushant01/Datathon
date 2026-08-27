
const puppeteer = require('puppeteer');
(async () => {
  try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
      page.on('pageerror', err => console.error('PAGE ERROR:', err));
      
      await page.goto('http://localhost:4173/admin-portal/gis', {waitUntil: 'networkidle2'});
      
      // Login
      await page.type('input[type="email"]', 'admin@ksp.gov.in');
      await page.type('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      await page.waitForNavigation({waitUntil: 'networkidle2'});
      
      // Wait for map to load
      await new Promise(r => setTimeout(r, 5000));
      
      await browser.close();
  } catch(e) {
      console.error(e);
  }
})();

