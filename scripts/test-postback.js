require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.POSTBACK_SECRET || 'your_postback_secret_here';

const options = {
    hostname: 'localhost',
    port: PORT,
    path: `/api/postback?user_id=test_user&secret=${SECRET}`,
    method: 'GET',
};

const req = http.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);

    res.on('data', d => {
        process.stdout.write(d);
        console.log('\n');
    });
});

req.on('error', error => {
    console.error(error);
});

req.end();
