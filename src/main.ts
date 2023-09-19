const cache = {};
const preloadScript = {};

class PreloadScheduler {
  private map = {};
  private queue = [];

  add(url) {
    requestByXHR(url, false, script => {
      this.map[url] = script;
    });
  }

  has(url: string) {
    return url in this.map;
  }

  get(url: string) {
    return this.map[url];
  }

  delete(url: string) {
    delete this.map[url];
  }
}

const preloadScheduler = new PreloadScheduler();

function requestByXHR(url, sync, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, !sync);
  xhr.onload = function () {
    callback(xhr.responseText);
  }
  xhr.onerror = function (e) {
    console.warn(e);
    throw new Error(`Cannot find module '${url}'`);
  }
  xhr.send();
}

function require(url) {
  if (!(url in cache)) {
    // Load script
    let script;
    if (preloadScheduler.has(url)) {
      script = preloadScheduler.get(url);
    } else {
      requestByXHR(url, true, text => script = text);
    }
    preloadScheduler.delete(url);

    const module = {
      exports: {},
    }

    // Compiler script
    const vm = new Function('module', 'exports', 'require', script);
    vm(module, module.exports, require);
    cache[url] = module;

    // Preload script
    let [ idQuoteString ] = /\srequire\([^)]\)/g.exec(script);
    while(idQuoteString) {
      const idString = idQuoteString.replace(/['"]/g, '');
      if (!(idString in cache) || !preloadScheduler.has(url)) {
        preloadScheduler.add(url);
      }
    }
  }

  return cache[url].exports;
}

// =======
require.resolve('./test.js', { preload: true });

console.log('main');
// document.write('<script src="./sub.js"></script>');
const { foo } = require('../test/sub.js');
console.log('main end');
foo();
