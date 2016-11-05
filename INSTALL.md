## Installation ##
Pretty simple!

 1. Download the repo to your test directory
 2. run `npm install`
 3. place your SSL certificate files into the certs folder, naming them server.key and server.crt . Alternatively make self signed certificates by running `sudo bash ./sscerts.sh <domain>` where you replace `<domain>` with the domain of your server. If you are running on a local machine, you can just use `sudo bash ./sscerts.sh localhost`
 4. run `node app.js`

Notes:

 - If you are using the sscerts.sh, make sure you are running it as either root or a user that has sudo privileges. Also make sure openssl is installed on your system.
 - Default logins for everything is 'tomato' with the mentor username being 'mentor', champion username being 'champion' and admin username being 'admin'
