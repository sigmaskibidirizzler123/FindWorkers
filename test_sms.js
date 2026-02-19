const https = require('https');

const API_ACCESS_TOKEN = "3s-j-3tYdyBjwUTBslCKzZXrPsh-hHU";
// Thu bo sung them user:pass xem sao. SpeedSMS doc noi Basic Auth user=token, pass=x (hoac bat ky)

const postData = JSON.stringify({
    to: ["84907697043"],
    content: "Full check API SpeedSMS",
    sms_type: 2,
    sender: ""
});

const options = {
    hostname: 'api.speedsms.vn',
    path: '/index.php/sms/send',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(API_ACCESS_TOKEN + ':x').toString('base64')
    }
};

console.log('Token check:', API_ACCESS_TOKEN);
console.log('Sending request...');

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
