const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        for (let i = 0; i < msg.args().length; ++i)
            console.log(`${i}: ${msg.args()[i]}`);
        if (msg.args().length === 0) {
            console.log(msg.text());
        }
    });

    page.on('pageerror', err => {
        console.log('PAGE ERROR:', err.message);
    });

    console.log("Navigating to http://localhost:5173/");
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    const html = await page.content();
    console.log("Body HTML:");
    console.log(html.substring(0, 1000));

    await browser.close();
})();
