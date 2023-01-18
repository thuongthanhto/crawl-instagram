const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const request = require('request');

puppeteer.use(StealthPlugin());

function download(url, path) {
  const fileName = url.substring(url.lastIndexOf('/'));
  const outFile =
    fileName.indexOf('?') >= 0
      ? path + fileName.substring(0, fileName.indexOf('?'))
      : path + fileName;

  return new Promise((resolve) => {
    request.head(url, (err) => {
      request(url)
        .on('error', function (err) {
          console.log(err);
          resolve();
        })
        .pipe(fs.createWriteStream(outFile))
        .on('close', () => {
          resolve();
        });
    });
  });
}

function extractImgLinks() {
  const extractedElements = document.querySelectorAll('article a img');
  const items = [];
  for (let element of extractedElements) {
    items.push(element.src);
  }
  return items;
}

async function scrollToEndOfPage(page, extractImgLinks = () => {}) {
  let items = [];
  try {
    let previousHeight;
    while (true) {
      const curHeight = await page.evaluate('document.body.scrollHeight');
      if (previousHeight === curHeight) {
        break;
      }
      previousHeight = curHeight;
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForFunction(
        `document.body.scrollHeight > ${previousHeight}`
      );
      await page.waitForTimeout(3500);
      const links = await page.evaluate(extractImgLinks).catch((err) => {
        console.log(err);
        return [];
      });
      items = [...items, ...links];
    }
  } catch (e) {}
  return items;
}

// Initial variables
const instagramUrl = 'https://www.instagram.com/';
const url = 'https://www.instagram.com/graceboor';
const userName = 'leontothanh';
const password = 'Admin@123';

// Main function
puppeteer.launch({ headless: false }).then(async (browser) => {
  const page = await browser.newPage();
  page.setViewport({ width: 1600, height: 1600 });

  await page.goto('https://www.instagram.com/login');
  await page.waitForTimeout(4000);
  await page.type('input[name="username"]', userName, {
    delay: 20,
  });
  await page.type('input[name="password"]', password, {
    delay: 20,
  });
  await page.click('button[type="submit"]');
  await page.waitForTimeout(10000);
  await page.goto(url);

  await page.waitForTimeout(5000);

  // Scroll and extract items from the page.
  const links = await scrollToEndOfPage(page, extractImgLinks);
  console.log('links', links);
  await browser.close();

  // Creates a directory to store the images
  const username = url.substring(instagramUrl.length);
  const dir = './' + username;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  // Downloads all the images
  function removeDuplicates(array) {
    return array.filter((a, b) => array.indexOf(a) === b);
  }
  const linksWithoutDuplicates = removeDuplicates(links);
  await Promise.all(linksWithoutDuplicates.map((item) => download(item, dir)));
});
