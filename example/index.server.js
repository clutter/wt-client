const http = require('http');
const port = 3000;

const pixelGif = new Buffer([
  71,  73,  70,  56,  57,  97,  1,   0,   1,   0,
  128, 0,   0,   0,   0,   0,   0,   0,   0,   33,
  249, 4,   1,   0,   0,   0,   0,   44,  0,   0,
  0,   0,   1,   0,   1,   0,   0,   2,   2,   68,
  1,   0,   59,
]);

http.createServer((request, response) => {
  if (request.url === '/favicon.ico') {
    response.writeHead(200, { 'Content-Type': 'image/x-icon' });
    response.end();
    return;
  }
  console.log('REQUEST', request.headers, request.url);
  response.writeHead(200, { 'Content-Type': 'image/gif' });
  response.write(pixelGif);
  response.end();
}).listen(port, () => console.log(`server is listening on ${port}`));
